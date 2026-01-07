import { Logger } from "@adk/logger";
import type { Content, Part } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import {
	AssistantContent,
	generateText,
	jsonSchema,
	type LanguageModel,
	ModelMessage,
	streamText,
	type Tool,
} from "ai";
import type { ContextCacheConfig } from "../agents/context-cache-config";
import { BaseLlm } from "./base-llm";
import { ContextCacheManager } from "./context-cache-manager";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

/**
 * AI SDK integration with caching support for multiple providers.
 * Enables ADK to work with any provider supported by Vercel's AI SDK.
 */
export class AiSdkLlm extends BaseLlm {
	private modelInstance: LanguageModel;
	protected logger = new Logger({ name: "AiSdkLlm" });
	private providerName: string;
	private cacheManager?: ContextCacheManager;

	constructor(modelInstance: LanguageModel) {
		let modelId = "ai-sdk-model";
		if (typeof modelInstance !== "string" && "modelId" in modelInstance) {
			modelId = (modelInstance as any).modelId;
		}
		super(modelId);
		this.modelInstance = modelInstance;
		this.providerName = this.detectProvider(modelInstance);

		// Initialize cache manager for Google models
		if (this.providerName === "google") {
			try {
				const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
				const apiKey = process.env.GOOGLE_API_KEY;
				const project = process.env.GOOGLE_CLOUD_PROJECT;
				const location = process.env.GOOGLE_CLOUD_LOCATION;

				let genaiClient: GoogleGenAI | undefined;

				if (useVertexAI && project && location) {
					genaiClient = new GoogleGenAI({
						vertexai: true,
						project,
						location,
					});
				} else if (apiKey) {
					genaiClient = new GoogleGenAI({ apiKey });
				}

				if (genaiClient) {
					this.cacheManager = new ContextCacheManager(this.logger, genaiClient);
				}
			} catch (error) {
				this.logger.warn("Failed to initialize Google cache manager:", error);
			}
		}
	}

	static override supportedModels(): string[] {
		return [];
	}

	/**
	 * Detect provider from model instance
	 */
	private detectProvider(model: LanguageModel): string {
		if (typeof model === "string") {
			const m = model as string;
			if (m.includes("anthropic")) return "anthropic";
			if (m.includes("google")) return "google";
			if (m.includes("openai")) return "openai";
		} else if (model && typeof model === "object") {
			// Check provider field
			if ("provider" in model) {
				const provider = (model as any).provider;
				if (provider.includes("anthropic")) return "anthropic";
				if (provider.includes("google")) return "google";
				if (provider.includes("openai")) return "openai";
			}

			// Fallback: check model ID
			if ("modelId" in model) {
				const modelId = (model as any).modelId.toLowerCase();
				if (modelId.includes("claude")) return "anthropic";
				if (modelId.includes("gemini")) return "google";
				if (modelId.includes("gpt")) return "openai";
			}
		}

		return "unknown";
	}

	protected async *generateContentAsyncImpl(
		request: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		try {
			// Handle Google caching via ContextCacheManager
			let cacheMetadata = null;
			if (
				this.providerName === "google" &&
				this.cacheManager &&
				request.cacheConfig
			) {
				cacheMetadata = await this.cacheManager.handleContextCaching(request);
			}

			const messages = this.convertToAiSdkMessages(request);
			const systemMessage = this.prepareSystemMessage(request);
			const tools = this.convertToAiSdkTools(request);

			const requestParams: Parameters<typeof streamText>[0] = {
				model: this.modelInstance,
				messages,
				system: systemMessage,
				tools: Object.keys(tools).length > 0 ? tools : undefined,
				temperature: request.config?.temperature,
				topP: request.config?.topP,
			};

			// Add maxTokens if specified (supported by most providers)
			if (request.config?.maxOutputTokens) {
				(requestParams as any).maxTokens = request.config.maxOutputTokens;
			}

			// Add Google Context Caching support
			if (this.providerName === "google" && request.config?.cachedContent) {
				requestParams.providerOptions = {
					google: {
						cachedContent: request.config.cachedContent,
					},
				};
			}

			// Add provider-specific caching (Anthropic only, Google handled above)
			if (this.providerName === "anthropic" && request.cacheConfig) {
				this.applyCacheConfig(requestParams, request);
			}

			if (stream) {
				yield* this.handleStreamingResponse(requestParams, cacheMetadata);
			} else {
				yield* this.handleNonStreamingResponse(requestParams, cacheMetadata);
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
	 * Apply provider-specific cache configuration (Anthropic only)
	 * Google caching is handled via ContextCacheManager
	 */
	private applyCacheConfig(requestParams: any, request: LlmRequest): void {
		if (!request.cacheConfig) return;

		const cacheConfig = request.cacheConfig;

		if (this.providerName === "anthropic") {
			this.applyAnthropicCache(requestParams, cacheConfig);
		} else {
			this.logger.debug(
				`Cache config not supported for provider: ${this.providerName}`,
			);
		}
	}

	/**
	 * Apply Anthropic-specific caching
	 * Uses cache_control blocks on system/messages/tools
	 */
	private applyAnthropicCache(
		requestParams: any,
		cacheConfig: ContextCacheConfig,
	): void {
		const ttl = this.getAnthropicTTL(cacheConfig.ttlSeconds);
		const cacheControl = {
			type: "ephemeral" as const,
			...(ttl !== "5m" && { ttl }),
		};

		// Add cache_control to system message
		if (requestParams.system) {
			if (typeof requestParams.system === "string") {
				requestParams.system = [
					{
						type: "text",
						text: requestParams.system,
						experimental_providerMetadata: {
							anthropic: { cacheControl },
						},
					},
				];
			}
		}

		// Add cache_control to last user message
		if (requestParams.messages?.length > 0) {
			const lastUserMsgIdx = this.findLastUserMessageIndex(
				requestParams.messages,
			);
			if (lastUserMsgIdx !== -1) {
				const msg = requestParams.messages[lastUserMsgIdx];
				if (!msg.experimental_providerMetadata) {
					msg.experimental_providerMetadata = {};
				}
				if (!msg.experimental_providerMetadata.anthropic) {
					msg.experimental_providerMetadata.anthropic = {};
				}
				msg.experimental_providerMetadata.anthropic.cacheControl = cacheControl;
			}
		}

		// Add cache_control to last tool
		if (requestParams.tools) {
			const toolNames = Object.keys(requestParams.tools);
			if (toolNames.length > 0) {
				const lastToolName = toolNames[toolNames.length - 1];
				const lastTool = requestParams.tools[lastToolName];
				if (!lastTool.experimental_providerMetadata) {
					lastTool.experimental_providerMetadata = {};
				}
				if (!lastTool.experimental_providerMetadata.anthropic) {
					lastTool.experimental_providerMetadata.anthropic = {};
				}
				lastTool.experimental_providerMetadata.anthropic.cacheControl =
					cacheControl;
			}
		}

		console.log(`✓ Cache CONFIG: Anthropic caching enabled (TTL: ${ttl})`);
	}

	/**
	 * Get Anthropic TTL format
	 */
	private getAnthropicTTL(ttlSeconds: number): "5m" | "1h" {
		const LONG_TTL_THRESHOLD = 1800; // 30 minutes
		return ttlSeconds > LONG_TTL_THRESHOLD ? "1h" : "5m";
	}

	/**
	 * Find the last user message index
	 */
	private findLastUserMessageIndex(messages: ModelMessage[]): number {
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === "user") {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Prepare system message with optional caching
	 */
	private prepareSystemMessage(request: LlmRequest): string | undefined {
		return request.getSystemInstructionText();
	}

	/**
	 * Handle streaming response
	 */
	private async *handleStreamingResponse(
		requestParams: any,
		cacheMetadata: any = null,
	): AsyncGenerator<LlmResponse, void, unknown> {
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

		const response = new LlmResponse({
			content: {
				role: "model",
				parts: parts.length > 0 ? parts : [{ text: "" }],
			},
			usageMetadata: this.buildUsageMetadata(finalUsage),
			finishReason: this.mapFinishReason(finishReason),
			turnComplete: true,
		});

		// Populate cache metadata for Google
		if (cacheMetadata && this.cacheManager) {
			this.cacheManager.populateCacheMetadataInResponse(
				response,
				cacheMetadata,
			);
		}

		yield response;
	}

	/**
	 * Handle non-streaming response
	 */
	private async *handleNonStreamingResponse(
		requestParams: any,
		cacheMetadata: any = null,
	): AsyncGenerator<LlmResponse, void, unknown> {
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

		const response = new LlmResponse({
			content: {
				role: "model",
				parts: parts.length > 0 ? parts : [{ text: "" }],
			},
			usageMetadata: this.buildUsageMetadata(result.usage),
			finishReason: this.mapFinishReason(result.finishReason),
			turnComplete: true,
		});

		// Populate cache metadata for Google
		if (cacheMetadata && this.cacheManager) {
			this.cacheManager.populateCacheMetadataInResponse(
				response,
				cacheMetadata,
			);
		}

		yield response;
	}

	/**
	 * Build usage metadata with cache information
	 */
	private buildUsageMetadata(usage: any): any {
		if (!usage) return undefined;

		const metadata: any = {
			promptTokenCount: usage.promptTokens || usage.inputTokens || 0,
			candidatesTokenCount: usage.completionTokens || usage.outputTokens || 0,
			totalTokenCount: usage.totalTokens || 0,
		};

		// Add cache-specific metrics if available
		if (usage.cacheReadInputTokens !== undefined) {
			metadata.cacheReadInputTokens = usage.cacheReadInputTokens;
		}
		if (usage.cacheCreationInputTokens !== undefined) {
			metadata.cacheCreationInputTokens = usage.cacheCreationInputTokens;
		}

		return metadata;
	}

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

	private transformSchemaForAiSdk(schema: any): any {
		if (Array.isArray(schema)) {
			return schema.map((item) => this.transformSchemaForAiSdk(item));
		}

		if (!schema || typeof schema !== "object") {
			return schema;
		}

		const transformedSchema = { ...schema };

		if (transformedSchema.type && typeof transformedSchema.type === "string") {
			transformedSchema.type = transformedSchema.type.toLowerCase();
		}

		if (transformedSchema.properties) {
			transformedSchema.properties = Object.fromEntries(
				Object.entries(transformedSchema.properties).map(([key, value]) => [
					key,
					this.transformSchemaForAiSdk(value),
				]),
			);
		}

		if (transformedSchema.items) {
			transformedSchema.items = this.transformSchemaForAiSdk(
				transformedSchema.items,
			);
		}

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

	private contentToAiSdkMessage(content: Content): ModelMessage | null {
		const role = this.mapRole(content.role);

		if (!content.parts || content.parts.length === 0) {
			return null;
		}

		if (content.parts.length === 1 && content.parts[0].text) {
			const textContent = content.parts[0].text;
			if (role === "system") return { role: "system", content: textContent };
			if (role === "assistant")
				return { role: "assistant", content: textContent };
			return { role: "user", content: textContent };
		}

		if (content.parts?.some((part) => part.functionCall)) {
			const contentParts: AssistantContent = [];

			for (const part of content.parts) {
				if (part.text) {
					contentParts.push({ type: "text", text: part.text });
				} else if (part.functionCall) {
					contentParts.push({
						type: "tool-call",
						toolCallId: part.functionCall.id,
						toolName: part.functionCall.name,
						input: part.functionCall.args,
					});
				}
			}

			return { role: "assistant" as const, content: contentParts };
		}

		if (content.parts?.some((part) => part.functionResponse)) {
			const contentParts = content.parts
				.filter((part) => part.functionResponse)
				.map((part) => {
					const response = part.functionResponse.response;
					let output: any;

					if (response === undefined || response === null) {
						output = { type: "json", value: null };
					} else if (typeof response === "string") {
						output = { type: "text", value: response };
					} else {
						output = { type: "json", value: response };
					}

					return {
						type: "tool-result" as const,
						toolCallId: part.functionResponse.id,
						toolName: part.functionResponse.name || "unknown",
						output: output,
					};
				});

			return { role: "tool" as const, content: contentParts };
		}

		const contentParts: { type: "text"; text: string }[] = [];
		for (const part of content.parts) {
			if (part.text) {
				contentParts.push({ type: "text", text: part.text });
			}
		}

		if (contentParts.length === 0) return null;

		if (contentParts.length === 1) {
			const textContent = contentParts[0].text;
			if (role === "system") return { role: "system", content: textContent };
			if (role === "assistant")
				return { role: "assistant", content: textContent };
			return { role: "user", content: textContent };
		}

		if (role === "system") {
			return {
				role: "system",
				content: contentParts.map((p) => p.text).join(""),
			};
		}
		if (role === "assistant") {
			return { role: "assistant", content: contentParts };
		}
		return { role: "user", content: contentParts };
	}

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
