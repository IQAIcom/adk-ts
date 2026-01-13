import { Logger } from "@adk/logger";
import type { Content, Part } from "@google/genai";
import {
	AssistantContent,
	generateText,
	jsonSchema,
	type LanguageModel,
	ModelMessage,
	streamText,
	type Tool,
} from "ai";
import { BaseLlm } from "./base-llm";
import { CacheMetadata } from "./cache-metadata";
import {
	type ContextCacheManager,
	GeminiContextCacheManager,
} from "./context-cache-manager";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

/**
 * Supported model providers
 */
enum ModelProvider {
	GOOGLE = "google",
	ANTHROPIC = "anthropic",
	UNKNOWN = "unknown",
}

/**
 * AI SDK integration that accepts a pre-configured LanguageModel.
 * Enables ADK to work with any provider supported by Vercel's AI SDK.
 */
export class AiSdkLlm extends BaseLlm {
	private modelInstance: LanguageModel;
	protected logger = new Logger({ name: "AiSdkLlm" });

	/**
	 * Model provider patterns for detection
	 */
	private static readonly PROVIDER_PATTERNS: Record<ModelProvider, RegExp[]> = {
		[ModelProvider.GOOGLE]: [/^google\//i, /^gemini/i, /^models\/gemini/i],
		[ModelProvider.ANTHROPIC]: [/^anthropic\//i, /^claude/i],
		[ModelProvider.UNKNOWN]: [],
	};

	/**
	 * Constructor accepts a pre-configured LanguageModel instance
	 * @param model - Pre-configured LanguageModel from provider(modelName)
	 */
	constructor(modelInstance: LanguageModel) {
		let modelId = "ai-sdk-model";
		if (typeof modelInstance !== "string") {
			modelId = modelInstance.modelId;
		}
		super(modelId);
		this.modelInstance = modelInstance;
	}

	/**
	 * Returns empty array - following Python ADK pattern
	 */
	static override supportedModels(): string[] {
		return [];
	}

	/**
	 * Safely extracts modelId from a LanguageModel instance
	 */
	private getModelId(model: LanguageModel): string | null {
		if (!model || typeof model !== "object") {
			return null;
		}

		if ("modelId" in model && typeof model.modelId === "string") {
			return model.modelId;
		}

		return null;
	}

	/**
	 * Detects the provider of a given model
	 */
	private detectModelProvider(model: LanguageModel): ModelProvider {
		const modelId = this.getModelId(model);

		if (!modelId) {
			return ModelProvider.UNKNOWN;
		}

		for (const [provider, patterns] of Object.entries(
			AiSdkLlm.PROVIDER_PATTERNS,
		)) {
			if (patterns.some((pattern) => pattern.test(modelId))) {
				return provider as ModelProvider;
			}
		}

		return ModelProvider.UNKNOWN;
	}

	protected async *generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		try {
			const messages = this.convertToAiSdkMessages(llmRequest);
			const systemMessage = llmRequest.getSystemInstructionText();
			const tools = this.convertToAiSdkTools(llmRequest);
			const provider = this.detectModelProvider(this.modelInstance);
			let cacheMetadata: CacheMetadata | null = null;
			let cacheManager: ContextCacheManager | null = null;

			if (llmRequest.cacheConfig && provider === ModelProvider.GOOGLE) {
				this.logger.debug("Handling Google context caching");
				const tempManager = new GeminiContextCacheManager(this.logger);
				const genaiClient = tempManager.getGenaiClient();
				cacheManager = new GeminiContextCacheManager(this.logger, genaiClient);
				cacheMetadata = await cacheManager.handleContextCaching(llmRequest);

				if (cacheMetadata) {
					if (cacheMetadata.cacheName) {
						this.logger.debug(`Using cache: ${cacheMetadata.cacheName}`);
					} else {
						this.logger.debug("Cache fingerprint only, no active cache");
					}
				}
			} else if (llmRequest.cacheConfig && provider !== ModelProvider.GOOGLE) {
				this.logger.debug(
					`Context caching requested but not supported for provider: ${provider}`,
				);
			}

			const requestParams = {
				model: this.modelInstance,
				messages,
				// When using cached content, system/tools must be undefined
				system: cacheMetadata?.cacheName ? undefined : systemMessage,
				tools:
					cacheMetadata?.cacheName || Object.keys(tools).length === 0
						? undefined
						: tools,
				maxTokens: llmRequest.config?.maxOutputTokens,
				temperature: llmRequest.config?.temperature,
				topP: llmRequest.config?.topP,
				...(provider === ModelProvider.GOOGLE && cacheMetadata?.cacheName
					? {
							providerOptions: {
								google: {
									cachedContent: cacheMetadata.cacheName,
								},
							},
						}
					: {}),
				...(provider === ModelProvider.ANTHROPIC && llmRequest.cacheConfig
					? {
							providerOptions: {
								anthropic: {
									cacheControl: {
										type: "ephemeral",
										ttl:
											llmRequest.cacheConfig.ttlSeconds &&
											llmRequest.cacheConfig.ttlSeconds > 1800
												? "1h"
												: "5m",
									},
								},
							},
						}
					: {}),
			};

			// Handle streaming
			if (stream) {
				const result = streamText(requestParams);
				let accumulatedText = "";
				let cacheMetadataEmitted = false;

				for await (const delta of result.textStream) {
					accumulatedText += delta;

					yield new LlmResponse({
						content: { role: "model", parts: [{ text: accumulatedText }] },
						partial: true,
						cacheMetadata: !cacheMetadataEmitted ? cacheMetadata : undefined,
					});

					cacheMetadataEmitted = true;
				}

				const toolCalls = await result.toolCalls;
				const parts: Part[] = [];
				if (accumulatedText) parts.push({ text: accumulatedText });
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

				// Anthropic provider metadata logging
				if (provider === ModelProvider.ANTHROPIC) {
					const providerMetadata = await result.providerMetadata;
					const anthropicMetadata = providerMetadata?.anthropic;
					if (anthropicMetadata?.cacheCreationInputTokens) {
						this.logger.info(
							`Anthropic cache created: ${anthropicMetadata.cacheCreationInputTokens} tokens`,
						);
					}
				}

				yield new LlmResponse({
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
				});
			} else {
				const result = await generateText(requestParams);

				const parts: Part[] = [];
				if (result.text) parts.push({ text: result.text });
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

				// Anthropic provider metadata logging
				if (provider === ModelProvider.ANTHROPIC) {
					const anthropicMetadata = result.providerMetadata?.anthropic;
					if (anthropicMetadata?.cacheCreationInputTokens) {
						this.logger.info(
							`Anthropic cache created: ${anthropicMetadata.cacheCreationInputTokens} tokens`,
						);
					}
				}

				yield new LlmResponse({
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
				});
			}
		} catch (error) {
			this.logger.error(`AI SDK Error: ${String(error)}`, {
				error,
				llmRequest,
			});
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
}
