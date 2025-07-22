import { Logger } from "@adk/logger";
import Anthropic from "@anthropic-ai/sdk";
import { BaseLlm } from "./base-llm";
import type { BaseLLMConnection } from "./base-llm-connection";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

type AnthropicRole = "user" | "assistant";

const MAX_TOKENS = 1024;

/**
 * Anthropic LLM implementation using Claude models
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

		let tools: Anthropic.Tool[] | undefined;
		if ((llmRequest.config?.tools?.[0] as any)?.functionDeclarations) {
			tools = (llmRequest.config.tools[0] as any).functionDeclarations.map(
				(decl: any) => this.functionDeclarationToAnthropicTool(decl),
			);
		}

		const systemInstruction = llmRequest.getSystemInstructionText();

		if (stream) {
			// TODO: Implement streaming support for Anthropic
			throw new Error("Streaming is not yet supported for Anthropic models");
		}

		const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => {
			const content = Array.isArray(msg.content)
				? msg.content.map((block) => this.partToAnthropicBlock(block))
				: msg.content;

			return {
				role: msg.role as "user" | "assistant",
				content: content as Anthropic.MessageParam["content"],
			};
		});

		const message = await this.client.messages.create({
			model,
			system: systemInstruction,
			messages: anthropicMessages,
			tools,
			tool_choice: tools ? { type: "auto" } : undefined,
			max_tokens: llmRequest.config?.maxOutputTokens || MAX_TOKENS,
			temperature: llmRequest.config?.temperature,
			top_p: llmRequest.config?.topP,
		});

		yield this.anthropicMessageToLlmResponse(message);
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

		return new LlmResponse({
			content: {
				role: "model",
				parts: message.content.map((block) => this.anthropicBlockToPart(block)),
			},
			usageMetadata: {
				promptTokenCount: message.usage.input_tokens,
				candidatesTokenCount: message.usage.output_tokens,
				totalTokenCount:
					message.usage.input_tokens + message.usage.output_tokens,
			},
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
