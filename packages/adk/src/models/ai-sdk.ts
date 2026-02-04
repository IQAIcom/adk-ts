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
 * Configuration for AI SDK request parameters
 */
interface AiSdkRequestParams {
	model: LanguageModel;
	messages: ModelMessage[];
	system?: string;
	tools?: Record<string, Tool>;
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	providerOptions?: {
		google?: {
			cachedContent?: string;
		};
		anthropic?: {
			cacheControl?: {
				type: string;
				ttl: string;
			};
		};
	};
}

/**
 * AI SDK integration that accepts a pre-configured LanguageModel.
 * Enables ADK to work with any provider supported by Vercel's AI SDK.
 */
export class AiSdkLlm extends BaseLlm {
	private modelInstance: LanguageModel;
	protected logger = new Logger({ name: "AiSdkLlm" });
	private cacheManager: ContextCacheManager | null = null;

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
	private getModelId(model: LanguageModel): string {
		if (!model || typeof model !== "object") {
			return this.model;
		}

		if ("modelId" in model && typeof model.modelId === "string") {
			return model.modelId;
		}

		return this.model;
	}

	/**
	 * Normalizes Google model ID by removing provider prefix
	 * AI SDK uses "google/gemini-2.5-flash" but Google API expects "gemini-2.5-flash"
	 */
	private normalizeGoogleModelId(modelId: string): string {
		return modelId.replace(/^google\//, "");
	}

	/**
	 * Detects the provider of a given model
	 */
	private detectModelProvider(model: LanguageModel): ModelProvider {
		const modelId = this.getModelId(model);

		for (const [provider, patterns] of Object.entries(
			AiSdkLlm.PROVIDER_PATTERNS,
		)) {
			if (patterns.some((pattern) => pattern.test(modelId))) {
				return provider as ModelProvider;
			}
		}

		return ModelProvider.UNKNOWN;
	}

	/**
	 * Initializes the cache manager for Google models
	 * The manager lazily initializes its Google GenAI client on first use
	 */
	private initializeCacheManager(): void {
		if (!this.cacheManager) {
			this.cacheManager = new GeminiContextCacheManager(this.logger);
		}
	}

	/**
	 * Handles context caching for Google models
	 */
	private async handleGoogleContextCaching(
		llmRequest: LlmRequest,
	): Promise<CacheMetadata | null> {
		this.logger.debug("Handling Google context caching");

		// Ensure cache manager is initialized
		this.initializeCacheManager();

		// Normalize model ID for Google API compatibility
		const modelId = this.getModelId(this.modelInstance);
		llmRequest.model = this.normalizeGoogleModelId(modelId);

		this.logger.debug(`Using model for caching: ${llmRequest.model}`);

		// Handle caching through the manager
		const cacheMetadata =
			await this.cacheManager!.handleContextCaching(llmRequest);

		if (cacheMetadata?.cacheName) {
			this.logger.debug(`Using cache: ${cacheMetadata.cacheName}`);
		} else if (cacheMetadata) {
			this.logger.debug("Cache fingerprint only, no active cache");
		}

		return cacheMetadata;
	}

	/**
	 * Builds AI SDK request parameters with proper caching configuration
	 */
	private buildRequestParams(
		messages: ModelMessage[],
		systemMessage: string | undefined,
		tools: Record<string, Tool>,
		llmRequest: LlmRequest,
		provider: ModelProvider,
		cacheMetadata: CacheMetadata | null,
	): AiSdkRequestParams {
		const params: AiSdkRequestParams = {
			model: this.modelInstance,
			messages,
			maxTokens: llmRequest.config?.maxOutputTokens,
			temperature: llmRequest.config?.temperature,
			topP: llmRequest.config?.topP,
		};

		// Handle Google caching: when using cachedContent, system/tools must be omitted
		if (provider === ModelProvider.GOOGLE && cacheMetadata?.cacheName) {
			params.providerOptions = {
				google: {
					cachedContent: cacheMetadata.cacheName,
				},
			};
			// System and tools are already in the cache, don't include them
		} else {
			// Normal request without cache
			if (systemMessage) {
				params.system = systemMessage;
			}
			if (Object.keys(tools).length > 0) {
				params.tools = tools;
			}
		}

		// Handle Anthropic caching
		if (provider === ModelProvider.ANTHROPIC && llmRequest.cacheConfig) {
			const ttl =
				llmRequest.cacheConfig.ttlSeconds &&
				llmRequest.cacheConfig.ttlSeconds > 1800
					? "1h"
					: "5m";

			params.providerOptions = {
				...params.providerOptions,
				anthropic: {
					cacheControl: {
						type: "ephemeral",
						ttl,
					},
				},
			};
		}

		return params;
	}

	/**
	 * Logs provider-specific metadata
	 */
	private logProviderMetadata(
		provider: ModelProvider,
		providerMetadata: any,
	): void {
		if (provider === ModelProvider.ANTHROPIC) {
			const anthropicMetadata = providerMetadata?.anthropic;
			if (anthropicMetadata?.cacheCreationInputTokens) {
				this.logger.info(
					`Anthropic cache created: ${anthropicMetadata.cacheCreationInputTokens} tokens`,
				);
			}
		}
	}

	protected async *generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		try {
			const provider = this.detectModelProvider(this.modelInstance);
			const messages = this.convertToAiSdkMessages(llmRequest);
			const systemMessage = llmRequest.getSystemInstructionText();
			const tools = this.convertToAiSdkTools(llmRequest);

			// Handle context caching
			let cacheMetadata: CacheMetadata | null = null;

			if (llmRequest.cacheConfig) {
				if (provider === ModelProvider.GOOGLE) {
					cacheMetadata = await this.handleGoogleContextCaching(llmRequest);
				} else if (provider !== ModelProvider.ANTHROPIC) {
					this.logger.debug(
						`Context caching requested but not supported for provider: ${provider}`,
					);
				}
			}

			// Build request parameters
			const requestParams = this.buildRequestParams(
				messages,
				systemMessage,
				tools,
				llmRequest,
				provider,
				cacheMetadata,
			);

			// Handle streaming
			if (stream) {
				yield* this.handleStreamingResponse(
					requestParams,
					provider,
					cacheMetadata,
				);
			} else {
				yield* this.handleNonStreamingResponse(requestParams, provider);
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
	 * Handles streaming text generation
	 */
	private async *handleStreamingResponse(
		requestParams: AiSdkRequestParams,
		provider: ModelProvider,
		cacheMetadata: CacheMetadata | null,
	): AsyncGenerator<LlmResponse, void, unknown> {
		const result = streamText(requestParams);
		let accumulatedText = "";
		let cacheMetadataEmitted = false;

		for await (const delta of result.textStream) {
			accumulatedText += delta;

			yield new LlmResponse({
				content: { role: "model", parts: [{ text: delta }] },
				partial: true,
				cacheMetadata: !cacheMetadataEmitted ? cacheMetadata : undefined,
			});

			cacheMetadataEmitted = true;
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

		this.logProviderMetadata(provider, providerMetadata);

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
	}

	/**
	 * Handles non-streaming text generation
	 */
	private async *handleNonStreamingResponse(
		requestParams: AiSdkRequestParams,
		provider: ModelProvider,
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

		this.logProviderMetadata(provider, result.providerMetadata);

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
