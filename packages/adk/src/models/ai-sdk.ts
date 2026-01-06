import { Logger } from "@adk/logger";
import type { Content, Part } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import {
	type AssistantContent,
	generateText,
	jsonSchema,
	type LanguageModel,
	type ModelMessage,
	streamText,
	type Tool,
} from "ai";
import { BaseLlm } from "./base-llm";
import { CacheMetadata } from "./cache-metadata";
import { ContextCacheManager } from "./context-cache-manager";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

export class AiSdkLlm extends BaseLlm {
	private modelInstance: LanguageModel;
	protected logger = new Logger({ name: "AiSdkLlm" });
	private _genaiClient?: GoogleGenAI;
	private _cacheManager?: ContextCacheManager;

	constructor(modelInstance: LanguageModel, genaiClient?: GoogleGenAI) {
		let modelId = "ai-sdk-model";
		if (typeof modelInstance !== "string") {
			modelId = modelInstance.modelId;
		}
		super(modelId);
		this.modelInstance = modelInstance;
		this._genaiClient = genaiClient;
	}

	/**
	 * Returns empty array - following Python ADK pattern
	 */
	static override supportedModels(): string[] {
		return [];
	}

	/**
	 * Lazy initialization of cache manager
	 */
	private get cacheManager(): ContextCacheManager | null {
		if (!this._cacheManager && this._genaiClient) {
			this._cacheManager = new ContextCacheManager(
				this._genaiClient,
				this.logger,
			);
		}
		return this._cacheManager || null;
	}

	protected async *generateContentAsyncImpl(
		request: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		try {
			// Ensure model is set on the request for downstream components (like cache manager)
			if (!request.model) {
				request.model = this.model;
			}

			let cacheMetadata: CacheMetadata | null = null;

			// Handle context caching if cache config is provided
			if (request.cacheConfig && this.cacheManager) {
				this.logger.debug("Handling context caching");
				cacheMetadata = await this.cacheManager.handleContextCaching(request);

				if (cacheMetadata) {
					if (cacheMetadata.cacheName) {
						this.logger.debug(`Using cache: ${cacheMetadata.cacheName}`);
					} else {
						this.logger.debug("Cache fingerprint only, no active cache");
					}
				}
			}

			const messages = this.convertToAiSdkMessages(request);
			const systemMessage = request.getSystemInstructionText();
			const tools = this.convertToAiSdkTools(request);

			// Build request parameters with cache support
			const requestParams: any = {
				model: this.modelInstance,
				messages,
				system: systemMessage,
				tools: Object.keys(tools).length > 0 ? tools : undefined,
				maxTokens: request.config?.maxOutputTokens,
				temperature: request.config?.temperature,
				topP: request.config?.topP,
			};

			// Add explicit cache reference if available in config
			// This is set by the cache manager via applyCacheToRequest
			if (request.config?.cachedContent) {
				requestParams.cachedContent = request.config.cachedContent;
				this.logger.debug(
					`Using explicit cache: ${request.config.cachedContent}`,
				);
			}

			if (stream) {
				const result = streamText(requestParams);

				let accumulatedText = "";

				for await (const delta of result.textStream) {
					accumulatedText += delta;

					yield new LlmResponse({
						content: {
							role: "model",
							parts: [{ text: accumulatedText }],
						},
						partial: true,
					});
				}

				const toolCalls = await result.toolCalls;
				const parts: Part[] = [];

				if (accumulatedText) {
					parts.push({ text: accumulatedText });
				}

				if (toolCalls && toolCalls.length > 0) {
					for (const toolCall of toolCalls) {
						parts.push({
							functionCall: {
								id: toolCall.toolCallId,
								name: toolCall.toolName,
								args: toolCall.input,
							},
						});
					}
				}

				const finalUsage = await result.usage;
				const finishReason = await result.finishReason;
				const providerMetadata = await result.providerMetadata;

				// Extract cache metadata from streaming response
				const responseCacheMetadata = this.extractCacheMetadata({
					usage: finalUsage,
					providerMetadata,
				});

				const llmResponse = new LlmResponse({
					content: {
						role: "model",
						parts: parts.length > 0 ? parts : [{ text: "" }],
					},
					usageMetadata: finalUsage
						? {
								promptTokenCount: finalUsage.inputTokens,
								candidatesTokenCount: finalUsage.outputTokens,
								totalTokenCount: finalUsage.totalTokens,
							}
						: undefined,
					finishReason: this.mapFinishReason(finishReason),
					turnComplete: true,
					cacheMetadata: responseCacheMetadata,
				});

				// Populate cache metadata from manager if available
				if (cacheMetadata && this.cacheManager) {
					this.cacheManager.populateCacheMetadataInResponse(
						llmResponse,
						cacheMetadata,
					);
				}

				yield llmResponse;
			} else {
				const result = await generateText(requestParams);

				const parts: Part[] = [];
				if (result.text) {
					parts.push({ text: result.text });
				}
				if (result.toolCalls && result.toolCalls.length > 0) {
					for (const toolCall of result.toolCalls) {
						parts.push({
							functionCall: {
								id: toolCall.toolCallId,
								name: toolCall.toolName,
								args: toolCall.input,
							},
						});
					}
				}

				// Extract cache metadata from response
				const responseCacheMetadata = this.extractCacheMetadata(result);

				const llmResponse = new LlmResponse({
					content: {
						role: "model",
						parts: parts.length > 0 ? parts : [{ text: "" }],
					},
					usageMetadata: result.usage
						? {
								promptTokenCount: result.usage.inputTokens,
								candidatesTokenCount: result.usage.outputTokens,
								totalTokenCount: result.usage.totalTokens,
							}
						: undefined,
					finishReason: this.mapFinishReason(result.finishReason),
					turnComplete: true,
					cacheMetadata: responseCacheMetadata,
				});

				// Populate cache metadata from manager if available
				if (cacheMetadata && this.cacheManager) {
					this.cacheManager.populateCacheMetadataInResponse(
						llmResponse,
						cacheMetadata,
					);
				}

				yield llmResponse;
			}
		} catch (error) {
			this.logger.error(`AI SDK Error: ${String(error)}`, { error, request });
			yield LlmResponse.fromError(error, {
				errorCode: "AI_SDK_ERROR",
				model: this.model,
			});
		}
	}

	/**
	 * Convert ADK LlmRequest to AI SDK CoreMessage format
	 */
	private convertToAiSdkMessages(llmRequest: LlmRequest): ModelMessage[] {
		const messages: ModelMessage[] = [];

		for (const content of llmRequest.contents || []) {
			const message = this.contentToAiSdkMessage(content);
			if (message) {
				messages.push(message);
			}
		}

		return messages;
	}

	/**
	 * Transform JSON schema to use lowercase types for AI SDK compatibility
	 */
	private transformSchemaForAiSdk(schema: any): any {
		if (Array.isArray(schema)) {
			return schema.map((item) => this.transformSchemaForAiSdk(item));
		}

		if (!schema || typeof schema !== "object") {
			return schema;
		}

		const transformedSchema = { ...schema };

		// Transform type property from uppercase to lowercase
		if (transformedSchema.type && typeof transformedSchema.type === "string") {
			transformedSchema.type = transformedSchema.type.toLowerCase();
		}

		// Recursively transform properties
		if (transformedSchema.properties) {
			transformedSchema.properties = Object.fromEntries(
				Object.entries(transformedSchema.properties).map(([key, value]) => [
					key,
					this.transformSchemaForAiSdk(value),
				]),
			);
		}

		// Transform array items (handles both single schema and array of schemas)
		if (transformedSchema.items) {
			transformedSchema.items = this.transformSchemaForAiSdk(
				transformedSchema.items,
			);
		}

		// Transform anyOf, oneOf, allOf
		const arrayKeywords = ["anyOf", "oneOf", "allOf"];
		for (const keyword of arrayKeywords) {
			if (transformedSchema[keyword]) {
				transformedSchema[keyword] = this.transformSchemaForAiSdk(
					transformedSchema[keyword],
				);
			}
		}

		return transformedSchema;
	}

	/**
	 * Convert ADK tools to AI SDK tools format
	 */
	private convertToAiSdkTools(llmRequest: LlmRequest): Record<string, Tool> {
		const tools: Record<string, Tool> = {};

		if (llmRequest.config?.tools) {
			for (const toolConfig of llmRequest.config.tools) {
				if ("functionDeclarations" in toolConfig) {
					for (const funcDecl of toolConfig.functionDeclarations) {
						tools[funcDecl.name] = {
							description: funcDecl.description,
							inputSchema: jsonSchema(
								this.transformSchemaForAiSdk(funcDecl.parameters || {}),
							),
						};
					}
				}
			}
		}
		return tools;
	}

	/**
	 * Convert ADK Content to AI SDK CoreMessage
	 */
	private contentToAiSdkMessage(content: Content): ModelMessage | null {
		const role = this.mapRole(content.role);

		if (!content.parts || content.parts.length === 0) {
			return null;
		}

		if (content.parts.length === 1 && content.parts[0].text) {
			const textContent = content.parts[0].text;

			if (role === "system") {
				return { role: "system", content: textContent };
			}
			if (role === "assistant") {
				return { role: "assistant", content: textContent };
			}
			return { role: "user", content: textContent };
		}

		if (content.parts?.some((part) => part.functionCall)) {
			const textParts = content.parts.filter((part) => part.text);
			const functionCalls = content.parts.filter((part) => part.functionCall);

			const contentParts: AssistantContent = [];

			for (const textPart of textParts) {
				if (textPart.text) {
					contentParts.push({
						type: "text",
						text: textPart.text,
					});
				}
			}

			for (const funcPart of functionCalls) {
				if (funcPart.functionCall) {
					contentParts.push({
						type: "tool-call",
						toolCallId: funcPart.functionCall.id,
						toolName: funcPart.functionCall.name,
						input: funcPart.functionCall.args,
					});
				}
			}

			return {
				role: "assistant" as const,
				content: contentParts,
			};
		}

		if (content.parts?.some((part) => part.functionResponse)) {
			const functionResponses = content.parts.filter(
				(part) => part.functionResponse,
			);

			const contentParts = functionResponses.map((part) => {
				// Format output according to AI SDK LanguageModelV2ToolResultOutput
				let output: any;
				const response = part.functionResponse.response;

				if (response === undefined || response === null) {
					// Use JSON format for null/undefined
					output = { type: "json", value: null };
				} else if (typeof response === "string") {
					// Text format for strings
					output = { type: "text", value: response };
				} else {
					// JSON format for objects
					output = { type: "json", value: response };
				}

				return {
					type: "tool-result" as const,
					toolCallId: part.functionResponse.id,
					toolName: part.functionResponse.name || "unknown",
					output: output,
				};
			});

			return {
				role: "tool" as const,
				content: contentParts,
			};
		}

		const contentParts: { type: "text"; text: string }[] = [];

		for (const part of content.parts) {
			if (part.text) {
				contentParts.push({
					type: "text",
					text: part.text,
				});
			}
		}

		if (contentParts.length === 0) {
			return null;
		}

		if (contentParts.length === 1) {
			const textContent = contentParts[0].text;
			if (role === "system") {
				return { role: "system", content: textContent };
			}
			if (role === "assistant") {
				return { role: "assistant", content: textContent };
			}
			return { role: "user", content: textContent };
		}

		if (role === "system") {
			const combinedText = contentParts.map((p) => p.text).join("");
			return { role: "system", content: combinedText };
		}
		if (role === "assistant") {
			return { role: "assistant", content: contentParts };
		}
		return { role: "user", content: contentParts };
	}

	/**
	 * Map ADK role to AI SDK role
	 */
	private mapRole(role?: string): "user" | "assistant" | "system" {
		switch (role) {
			case "model":
			case "assistant":
				return "assistant";
			case "system":
				return "system";
			default:
				return "user";
		}
	}

	/**
	 * Map AI SDK finish reason to ADK finish reason
	 */
	private mapFinishReason(
		finishReason?: string,
	): "STOP" | "MAX_TOKENS" | "FINISH_REASON_UNSPECIFIED" {
		switch (finishReason) {
			case "stop":
			case "end_of_message":
				return "STOP";
			case "length":
			case "max_tokens":
				return "MAX_TOKENS";
			default:
				return "FINISH_REASON_UNSPECIFIED";
		}
	}

	private extractCacheMetadata(
		result:
			| Awaited<ReturnType<typeof generateText>>
			| {
					usage?: any;
					providerMetadata?: any;
			  },
	): CacheMetadata | undefined {
		try {
			const googleMetadata = result.providerMetadata?.google as
				| GoogleMetadata
				| undefined;

			const cachedTokens =
				googleMetadata?.usageMetadata?.cachedContentTokenCount;

			if (typeof cachedTokens === "number" && cachedTokens > 0) {
				this.logger.debug(
					`Cache hit: ${cachedTokens} tokens from cache (implicit or explicit)`,
				);

				return new CacheMetadata({
					fingerprint: `google-cache-${crypto.randomUUID()}`,
					contentsCount: cachedTokens,
					invocationsUsed: 1,
				});
			}

			// No cache hit detected
			return undefined;
		} catch (error) {
			this.logger.warn(`Failed to extract cache metadata: ${String(error)}`, {
				error,
			});
		}

		return undefined;
	}
}

interface GoogleMetadata {
	usageMetadata?: {
		cachedContentTokenCount?: number;
		thoughtsTokenCount?: number;
		promptTokenCount?: number;
		candidatesTokenCount?: number;
		totalTokenCount?: number;
	};
	groundingMetadata?: any;
	safetyRatings?: any;
}
