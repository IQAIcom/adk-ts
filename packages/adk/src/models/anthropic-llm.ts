import { Logger } from "@adk/logger";
import Anthropic from "@anthropic-ai/sdk";
import { BaseLlm } from "./base-llm";
import type { BaseLLMConnection } from "./base-llm-connection";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

type AnthropicRole = "user" | "assistant";

const MAX_TOKENS = 1024;

/**
 * Anthropic-specific cache configuration options
 * These extend the base ContextCacheConfig with Anthropic-specific features
 */
export interface AnthropicCacheOptions {
	/** TTL for Anthropic cache - "5m" or "1h". Defaults to "5m" */
	ttl?: "5m" | "1h";
	/**
	 * Enable caching for system prompt.
	 * Recommended for prompts with large static instructions.
	 * @default true
	 */
	cacheSystemPrompt?: boolean;
	/**
	 * Enable caching for tools.
	 * Recommended when using multiple tools across requests.
	 * @default true
	 */
	cacheTools?: boolean;
	/**
	 * Enable caching for conversation history.
	 * Recommended for multi-turn conversations.
	 * @default true
	 */
	cacheConversationHistory?: boolean;
}

/**
 * Anthropic LLM implementation using Claude models with prompt caching support
 */
export class AnthropicLlm extends BaseLlm {
	private _client?: Anthropic;
	protected logger = new Logger({ name: "AnthropicLlm" });

	/**
	 * Constructor for Anthropic LLM
	 */
	constructor(model = "claude-3-5-sonnet-20241022") {
		super(model);
	}

	/**
	 * Provides the list of supported models
	 */
	static override supportedModels(): string[] {
		return ["claude-3-.*", "claude-.*-4.*"];
	}

	/**
	 * Main content generation method - handles both streaming and non-streaming
	 */
	protected async *generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		const model = llmRequest.model || this.model;
		const messages = (llmRequest.contents || []).map((content) =>
			this.contentToAnthropicMessage(content),
		);

		// Determine if caching should be enabled based on ContextCacheConfig
		const shouldCache = this.shouldEnableCache(llmRequest);
		const cacheOptions = this.getCacheOptions(llmRequest);

		// Handle tools with optional caching
		let tools: Anthropic.Tool[] | undefined;
		if ((llmRequest.config?.tools?.[0] as any)?.functionDeclarations) {
			const declarations = (llmRequest.config.tools[0] as any)
				.functionDeclarations;
			tools = declarations.map((decl: any, index: number) => {
				const tool = this.functionDeclarationToAnthropicTool(decl);

				// Add cache_control to the last tool if caching is enabled
				if (
					shouldCache &&
					cacheOptions.cacheTools &&
					index === declarations.length - 1
				) {
					return {
						...tool,
						cache_control: this.createCacheControl(cacheOptions),
					};
				}
				return tool;
			});
		}

		// Handle system instruction with optional caching
		const systemInstructionText = llmRequest.getSystemInstructionText();
		let system: Anthropic.Messages.MessageCreateParams["system"];

		if (systemInstructionText) {
			if (shouldCache && cacheOptions.cacheSystemPrompt) {
				system = [
					{
						type: "text",
						text: systemInstructionText,
						cache_control: this.createCacheControl(cacheOptions),
					},
				];
			} else {
				system = systemInstructionText;
			}
		}

		if (stream) {
			// TODO: Implement streaming support for Anthropic
			throw new Error("Streaming is not yet supported for Anthropic models");
		}

		// Apply cache control to conversation history if enabled
		const anthropicMessages: Anthropic.MessageParam[] = messages.map(
			(msg, index) => {
				const content = Array.isArray(msg.content)
					? msg.content.map((block) => this.partToAnthropicBlock(block))
					: msg.content;

				const messageParam: Anthropic.MessageParam = {
					role: msg.role as "user" | "assistant",
					content: content as Anthropic.MessageParam["content"],
				};

				// Add cache_control to the last user message if conversation caching is enabled
				if (
					shouldCache &&
					cacheOptions.cacheConversationHistory &&
					index === messages.length - 1 &&
					msg.role === "user" &&
					Array.isArray(messageParam.content)
				) {
					const lastContentIndex = messageParam.content.length - 1;
					if (lastContentIndex >= 0) {
						(messageParam.content[lastContentIndex] as any).cache_control =
							this.createCacheControl(cacheOptions);
					}
				}

				return messageParam;
			},
		);

		this.logger.info(
			`Sending request to Anthropic model: ${model}${shouldCache ? " (with caching)" : ""}`,
		);

		const message = await this.client.messages.create({
			model,
			system,
			messages: anthropicMessages,
			tools,
			tool_choice: tools ? { type: "auto" } : undefined,
			max_tokens: llmRequest.config?.maxOutputTokens || MAX_TOKENS,
			temperature: llmRequest.config?.temperature,
			top_p: llmRequest.config?.topP,
		});

		const response = this.anthropicMessageToLlmResponse(message);

		// Log cache performance if caching was used
		if (shouldCache) {
			this.logCachePerformance(message.usage);
		}

		yield response;
	}

	/**
	 * Determine if caching should be enabled based on ContextCacheConfig
	 */
	private shouldEnableCache(llmRequest: LlmRequest): boolean {
		// Caching is enabled if cacheConfig is present
		return (
			llmRequest.cacheConfig !== undefined && llmRequest.cacheConfig !== null
		);
	}

	/**
	 * Get cache options from request, with defaults
	 */
	private getCacheOptions(
		llmRequest: LlmRequest,
	): Required<AnthropicCacheOptions> {
		const defaults: Required<AnthropicCacheOptions> = {
			ttl: "5m",
			cacheSystemPrompt: true,
			cacheTools: true,
			cacheConversationHistory: true,
		};

		// NOTE: This is just an idea, not core implementation

		if (!llmRequest.anthropicCacheOptions) {
			return defaults;
		}

		return {
			ttl: llmRequest.anthropicCacheOptions.ttl ?? defaults.ttl,
			cacheSystemPrompt:
				llmRequest.anthropicCacheOptions.cacheSystemPrompt ??
				defaults.cacheSystemPrompt,
			cacheTools:
				llmRequest.anthropicCacheOptions.cacheTools ?? defaults.cacheTools,
			cacheConversationHistory:
				llmRequest.anthropicCacheOptions.cacheConversationHistory ??
				defaults.cacheConversationHistory,
		};
	}

	/**
	 * Creates cache_control object based on options
	 */
	private createCacheControl(options: Required<AnthropicCacheOptions>): {
		type: "ephemeral";
		ttl?: "5m" | "1h";
	} {
		const control: { type: "ephemeral"; ttl?: "5m" | "1h" } = {
			type: "ephemeral",
		};

		if (options.ttl && options.ttl !== "5m") {
			// Only add ttl if it's not the default
			control.ttl = options.ttl;
		}

		return control;
	}

	/**
	 * Log cache performance metrics
	 */
	private logCachePerformance(usage: Anthropic.Messages.Usage): void {
		const cacheRead = usage.cache_read_input_tokens || 0;
		const cacheCreation = usage.cache_creation_input_tokens || 0;

		if (cacheRead > 0) {
			console.log(
				`✓ Cache HIT: ${cacheRead} tokens read from cache (90% cost savings)`,
			);
			this.logger.info(`Cache HIT: ${cacheRead} tokens read from cache`);
		}

		if (cacheCreation > 0) {
			console.log(`✓ Cache CREATED: ${cacheCreation} tokens written to cache`);
			this.logger.info(
				`Cache CREATED: ${cacheCreation} tokens written to cache`,
			);
		}

		if (cacheRead === 0 && cacheCreation === 0) {
			this.logger.debug("No cache hits or creation");
		}
	}

	/**
	 * Live connection is not supported for Anthropic models
	 */
	override connect(_llmRequest: LlmRequest): BaseLLMConnection {
		throw new Error(`Live connection is not supported for ${this.model}.`);
	}

	/**
	 * Convert Anthropic Message to ADK LlmResponse
	 */
	private anthropicMessageToLlmResponse(
		message: Anthropic.Message,
	): LlmResponse {
		this.logger.debug(
			`Anthropic response: ${message.usage.output_tokens} tokens, ${message.stop_reason}`,
		);

		// Create usage metadata with cache information
		const usageMetadata: any = {
			promptTokenCount: message.usage.input_tokens,
			candidatesTokenCount: message.usage.output_tokens,
			totalTokenCount: message.usage.input_tokens + message.usage.output_tokens,
		};

		// Add cache metrics if available
		const usage = message.usage as any;
		if (usage.cache_read_input_tokens !== undefined) {
			usageMetadata.cacheReadInputTokens = usage.cache_read_input_tokens;
		}
		if (usage.cache_creation_input_tokens !== undefined) {
			usageMetadata.cacheCreationInputTokens =
				usage.cache_creation_input_tokens;
		}

		return new LlmResponse({
			content: {
				role: "model",
				parts: message.content.map((block) => this.anthropicBlockToPart(block)),
			},
			usageMetadata,
			finishReason: this.toAdkFinishReason(message.stop_reason),
		});
	}

	/**
	 * Convert ADK Content to Anthropic MessageParam
	 */
	private contentToAnthropicMessage(content: any): Anthropic.MessageParam {
		return {
			role: this.toAnthropicRole(content.role),
			content: (content.parts || []).map((part: any) =>
				this.partToAnthropicBlock(part),
			),
		};
	}

	/**
	 * Convert ADK Part to Anthropic content block
	 */
	private partToAnthropicBlock(
		part: any,
	): Anthropic.MessageParam["content"][0] {
		if (part.text) {
			return {
				type: "text",
				text: part.text,
			};
		}

		if (part.function_call) {
			return {
				type: "tool_use",
				id: part.function_call.id || "",
				name: part.function_call.name,
				input: part.function_call.args || {},
			};
		}

		if (part.function_response) {
			let content = "";
			if (part.function_response.response?.result) {
				content = String(part.function_response.response.result);
			}
			return {
				type: "tool_result",
				tool_use_id: part.function_response.id || "",
				content,
				is_error: false,
			};
		}

		throw new Error("Unsupported part type for Anthropic conversion");
	}

	/**
	 * Convert Anthropic content block to ADK Part
	 */
	private anthropicBlockToPart(block: any): any {
		if (block.type === "text") {
			return { text: block.text };
		}

		if (block.type === "tool_use") {
			return {
				function_call: {
					id: block.id,
					name: block.name,
					args: block.input,
				},
			};
		}

		throw new Error("Unsupported Anthropic content block type");
	}

	/**
	 * Convert ADK function declaration to Anthropic tool param
	 */
	private functionDeclarationToAnthropicTool(
		functionDeclaration: any,
	): Anthropic.Tool {
		const properties: Record<string, any> = {};

		if (functionDeclaration.parameters?.properties) {
			for (const [key, value] of Object.entries(
				functionDeclaration.parameters.properties,
			)) {
				const valueDict = { ...(value as any) };
				this.updateTypeString(valueDict);
				properties[key] = valueDict;
			}
		}

		return {
			name: functionDeclaration.name,
			description: functionDeclaration.description || "",
			input_schema: {
				type: "object",
				properties,
			},
		};
	}

	/**
	 * Convert ADK role to Anthropic role format
	 */
	private toAnthropicRole(role?: string): AnthropicRole {
		if (role === "model" || role === "assistant") {
			return "assistant";
		}
		return "user";
	}

	/**
	 * Convert Anthropic stop reason to ADK finish reason
	 */
	private toAdkFinishReason(
		anthropicStopReason?: string,
	): "STOP" | "MAX_TOKENS" | "FINISH_REASON_UNSPECIFIED" {
		if (
			["end_turn", "stop_sequence", "tool_use"].includes(
				anthropicStopReason || "",
			)
		) {
			return "STOP";
		}
		if (anthropicStopReason === "max_tokens") {
			return "MAX_TOKENS";
		}
		return "FINISH_REASON_UNSPECIFIED";
	}

	/**
	 * Update type strings in schema to lowercase for Anthropic compatibility
	 */
	private updateTypeString(valueDict: Record<string, any>): void {
		if ("type" in valueDict) {
			valueDict.type = valueDict.type.toLowerCase();
		}

		if ("items" in valueDict) {
			this.updateTypeString(valueDict.items);
			if ("properties" in valueDict.items) {
				for (const value of Object.values(valueDict.items.properties)) {
					this.updateTypeString(value as Record<string, any>);
				}
			}
		}
	}

	/**
	 * Gets the Anthropic client
	 */
	private get client(): Anthropic {
		if (!this._client) {
			const apiKey = process.env.ANTHROPIC_API_KEY;

			if (!apiKey) {
				throw new Error(
					"ANTHROPIC_API_KEY environment variable is required for Anthropic models",
				);
			}

			this._client = new Anthropic({
				apiKey,
			});
		}
		return this._client;
	}
}
