import axios, { AxiosInstance } from "axios";
import { BaseLLM } from "../../../models/base-llm";
import type { BaseLLMConnection } from "../../../models/base-llm-connection";
import { AnthropicLLMConnection } from "./anthropic-llm-connection";
import type {
	LLMRequest,
	Content,
	Part,
	Role,
	TextPart,
	FunctionCallPart,
	FunctionResponsePart,
	FunctionCallData,
} from "../../../models/llm-request";
import { LLMResponse } from "../../../models/llm-response";

/**
 * Configuration for Anthropic LLM
 */
export interface AnthropicLLMConfig {
	/**
	 * Anthropic API key (can be provided via process.env.ANTHROPIC_API_KEY)
	 */
	apiKey?: string;

	/**
	 * Anthropic base URL override
	 */
	baseURL?: string;

	/**
	 * Default model parameters
	 */
	defaultParams?: {
		/**
		 * Temperature for generation
		 */
		temperature?: number;

		/**
		 * Top-p for generation
		 */
		top_p?: number;

		/**
		 * Maximum tokens to generate
		 */
		max_tokens?: number;
	};
}

// Helper types for the Anthropic API
interface AnthropicApiMessage {
	role: "user" | "assistant";
	content: string | AnthropicContentBlock[];
}

type AnthropicContentBlockType = "text" | "image" | "tool_use" | "tool_result";

interface AnthropicContentBlock {
	type: AnthropicContentBlockType;
	text?: string;
	source?: {
		type: "base64" | "url";
		media_type: string;
		data?: string;
		url?: string;
	};
	tool_use?: AnthropicToolUse;
	tool_result?: {
		content: string;
		tool_use_id: string;
	};
	// Direct properties for tool_use blocks
	id?: string;
	name?: string;
	input?: any;
}

interface AnthropicTool {
	name: string;
	description: string;
	input_schema: any;
}

interface AnthropicToolUse {
	id: string;
	name: string;
	input: any;
}

interface AnthropicApiResponse {
	id: string;
	type: string;
	role: string;
	model: string;
	content: AnthropicContentBlock[];
	stop_reason: string;
	stop_sequence: string | null;
	usage: {
		input_tokens: number;
		output_tokens: number;
	};
}

/**
 * Anthropic LLM implementation for Claude models
 * Uses direct API calls instead of the SDK for better control
 */
export class AnthropicLLM extends BaseLLM {
	/**
	 * Anthropic API key
	 */
	private apiKey: string;

	/**
	 * Anthropic API base URL
	 */
	private baseURL: string;

	/**
	 * Default parameters for requests
	 */
	private defaultParams: Record<string, any>;

	/**
	 * If the last content is not from a user, append an empty user content.
	 * Anthropic requires a user message to precede an assistant message.
	 */
	protected _maybeAppendUserContent(llmRequest: LLMRequest): void {
		if (
			llmRequest.contents.length > 0 &&
			llmRequest.contents[llmRequest.contents.length - 1].role !== "user"
		) {
			llmRequest.contents.push({ role: "user", parts: [{ text: "" }] });
		} else if (llmRequest.contents.length === 0) {
			// Anthropic also expects at least one user message to start
			llmRequest.contents.push({ role: "user", parts: [{ text: "Hello" }] }); // Or some other default starter
		}
	}

	/**
	 * Constructor for AnthropicLLM
	 */
	constructor(model: string, config?: AnthropicLLMConfig) {
		super(model);

		// Set up API configuration
		this.apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || "";
		this.baseURL = config?.baseURL || "https://api.anthropic.com/v1";

		if (!this.apiKey) {
			throw new Error(
				"Anthropic API key is required. Provide it in config or set ANTHROPIC_API_KEY environment variable.",
			);
		}

		// Store default parameters
		this.defaultParams = {
			temperature: config?.defaultParams?.temperature ?? 0.7,
			top_p: config?.defaultParams?.top_p ?? 1,
			max_tokens: config?.defaultParams?.max_tokens ?? 1024,
		};
	}

	/**
	 * Returns a list of supported models in regex for LLMRegistry
	 */
	static supportedModels(): string[] {
		return [
			// Claude 3 models
			"claude-3-.*",
			// Claude 2 models
			"claude-2.*",
			// Claude Instant models
			"claude-instant.*",
		];
	}

	/**
	 * Convert ADK Content array to Anthropic message format
	 */
	private convertAdkContentsToAnthropicMessages(
		contents: Content[],
	): AnthropicApiMessage[] {
		const anthropicMessages: AnthropicApiMessage[] = [];
		for (const content of contents) {
			// Anthropic expects alternating user/assistant messages.
			// 'function' role Content (FunctionResponsePart) should be mapped to user message with tool_result.
			// 'model' role Content containing FunctionCallPart should be mapped to assistant message with tool_use.
			// Other 'model' role Content are assistant messages.
			// 'user' role Content are user messages.

			let role: "user" | "assistant";
			const anthropicContentBlocks: AnthropicContentBlock[] = [];

			if (content.role === "user") {
				role = "user";
				for (const part of content.parts) {
					if ("text" in part) {
						anthropicContentBlocks.push({
							type: "text",
							text: (part as TextPart).text,
						});
					}
					// TODO: Handle InlineDataPart for images if Anthropic supports it in this structure
				}
			} else if (content.role === "model") {
				role = "assistant";
				for (const part of content.parts) {
					if ("text" in part) {
						anthropicContentBlocks.push({
							type: "text",
							text: (part as TextPart).text,
						});
					} else if ("functionCall" in part) {
						const fc = (part as FunctionCallPart).functionCall;
						anthropicContentBlocks.push({
							type: "tool_use",
							id: fc.id || `toolu_${Date.now()}`, // Anthropic requires an ID for tool_use
							name: fc.name,
							input: fc.args,
						});
					}
				}
			} else if (content.role === "function") {
				role = "user"; // Tool results are sent as user messages
				for (const part of content.parts) {
					if ("functionResponse" in part) {
						const fr = (part as FunctionResponsePart).functionResponse;
						// Find the corresponding tool_use_id. This is tricky as it's not directly in FunctionResponsePart.
						// This requires that the 'name' of the function response part matches the 'name' of a previous tool_use block.
						// And we need to map it to an ID. For now, this is a simplification.
						// A robust solution might require passing IDs through the system.
						// The Python SDK example seems to find the tool_use_id based on the previous assistant message.
						// This is a placeholder:
						const toolUseId = `toolu_${fr.name}_${Date.now()}`; // This needs a better mapping
						anthropicContentBlocks.push({
							type: "tool_result",
							tool_result: {
								tool_use_id: toolUseId,
								content: JSON.stringify(fr.response),
							},
							// is_error: false, // Optional: if the tool execution resulted in an error
						});
					}
				}
			} else {
				// Skip unknown roles or throw error
				console.warn(`[AnthropicLLM] Unknown content role: ${content.role}`);
				continue;
			}

			if (anthropicContentBlocks.length > 0) {
				anthropicMessages.push({ role, content: anthropicContentBlocks });
			}
		}
		return anthropicMessages;
	}

	/**
	 * Convert Anthropic API message (specifically content blocks) to ADK Content parts
	 */
	private convertAnthropicBlocksToAdkParts(
		blocks: AnthropicContentBlock[],
	): Part[] {
		const adkParts: Part[] = [];
		for (const block of blocks) {
			if (block.type === "text" && block.text) {
				adkParts.push({ text: block.text });
			} else if (
				block.type === "tool_use" &&
				block.id &&
				block.name &&
				block.input
			) {
				adkParts.push({
					functionCall: {
						id: block.id,
						name: block.name,
						args: block.input,
					},
				});
			}
			// Not typically receiving tool_result directly in this direction for LLMResponse,
			// but if it were needed for some reason:
			// else if (block.type === "tool_result" && block.tool_use_id && block.content) {
			//   // This would map to a FunctionResponsePart, but LLMResponse usually contains FunctionCallPart or TextPart
			// }
		}
		return adkParts;
	}

	/**
	 * Extract the system message from contents array
	 */
	private extractSystemMessage(contents: Content[]): string | undefined {
		// "system" is not a valid Role in Content[]. This method might be vestigial
		// or needs rethinking if system prompts are embedded in Content[].
		// For now, casting to string to satisfy linter, but this will likely not find a true system message.
		const systemMessageContent = contents.find(
			(m) => (m.role as string) === "system",
		);
		if (systemMessageContent && systemMessageContent.parts.length > 0) {
			const firstPart = systemMessageContent.parts[0];
			if ("text" in firstPart) {
				return firstPart.text;
			}
			// If the first part of a supposed system message is not text, JSON stringify it.
			// This case should ideally not happen for a well-formed system prompt.
			return JSON.stringify(firstPart);
		}
		return undefined;
	}

	/**
	 * Filter out system messages as they are handled separately
	 */
	private filterSystemMessages(contents: Content[]): Content[] {
		// Similarly, casting role to string to bypass type error.
		return contents.filter((m) => (m.role as string) !== "system");
	}

	/**
	 * Convert ADK function declarations to Anthropic tool format
	 */
	private convertFunctionsToTools(
		functions: any[], // Should be FunctionDeclaration[]
	): AnthropicTool[] {
		return functions.map((funcDecl) => ({
			name: funcDecl.name,
			description: funcDecl.description || "",
			input_schema: funcDecl.parameters || { type: "object", properties: {} }, // Anthropic uses JSON Schema
		}));
	}

	/**
	 * Convert Anthropic tool calls to ADK tool calls
	 */
	private convertToolUsesToFunctionCallParts(
		toolUses: AnthropicToolUse[],
	): FunctionCallPart[] {
		return toolUses.map((toolUse) => ({
			functionCall: {
				id: toolUse.id,
				name: toolUse.name,
				args: toolUse.input,
			},
		}));
	}

	/**
	 * Make a direct API call to Anthropic
	 */
	private async callAnthropicAPI(params: any, stream = false): Promise<any> {
		try {
			const response = await axios({
				method: "POST",
				url: `${this.baseURL}/messages`,
				headers: {
					"Content-Type": "application/json",
					"x-api-key": this.apiKey,
					"anthropic-version": "2023-06-01",
				},
				data: {
					...params,
					stream,
				},
				responseType: stream ? "stream" : "json",
			});

			if (process.env.DEBUG === "true") {
				console.log("Anthropic API Response Status:", response.status);
				if (!stream) {
					console.log("Response Data Structure:", Object.keys(response.data));
					console.log(
						"Response Content Structure:",
						response.data.content.map((block: any) => ({ type: block.type })),
					);
				}
			}

			return response.data;
		} catch (error) {
			console.error("Error calling Anthropic API:", error);
			throw error;
		}
	}

	/**
	 * Generates content from the given request
	 */
	async *generateContentAsync(
		llmRequest: LLMRequest,
		stream = false,
	): AsyncGenerator<LLMResponse, void, unknown> {
		this._maybeAppendUserContent(llmRequest); // Ensure correct message order

		const systemMessage = this.extractSystemMessage(llmRequest.contents);
		const messages = this.convertAdkContentsToAnthropicMessages(
			this.filterSystemMessages(llmRequest.contents),
		);

		const params: any = {
			...this.defaultParams,
			model: this.model,
			messages: messages,
			stream: stream,
		};

		if (systemMessage) {
			params.system = systemMessage;
		}

		if (llmRequest.config.max_tokens) {
			params.max_tokens = llmRequest.config.max_tokens;
		}
		if (llmRequest.config.temperature) {
			params.temperature = llmRequest.config.temperature;
		}
		if (llmRequest.config.top_p) {
			params.top_p = llmRequest.config.top_p;
		}
		// Anthropic does not directly support frequency_penalty or presence_penalty

		if (llmRequest.config.functions && llmRequest.config.functions.length > 0) {
			params.tools = this.convertFunctionsToTools(llmRequest.config.functions);
		}

		if (stream) {
			// Streaming logic adapted from the previous version in history, needs full review and testing.
			const responseStream = await this.callAnthropicAPI(params, true);
			let accumulatedText = "";
			const currentContentParts: Part[] = [];
			let stopReason: string | null = null;
			let isComplete = false;

			for await (const event of responseStream) {
				if (typeof event === "string") {
					// Raw data chunks, try to parse if they are SSE style `data: {json}`
					const lines = event.split("\n");
					for (const line of lines) {
						if (line.startsWith("data: ")) {
							try {
								const jsonData = JSON.parse(line.substring(5));
								// Re-process jsonData as if it were a direct event object
								// This is a simplified re-entry, actual event structure might differ
								// TODO: Properly handle parsed jsonData events from raw stream.
								if (
									jsonData.type === "content_block_delta" &&
									jsonData.delta.type === "text_delta"
								) {
									yield new LLMResponse({
										content: {
											role: "model",
											parts: [{ text: jsonData.delta.text } as TextPart],
										},
										is_partial: true,
										raw_response: jsonData,
									});
								} else if (jsonData.type === "message_stop") {
									const finalApiResponse =
										jsonData.message as AnthropicApiResponse;
									const finalAdkParts = this.convertAnthropicBlocksToAdkParts(
										finalApiResponse.content,
									);
									yield new LLMResponse({
										content: { role: "model", parts: finalAdkParts },
										is_partial: false,
										turn_complete: true,
										raw_response: finalApiResponse,
									});
									return;
								}
							} catch (e) {
								console.error(
									"[AnthropicLLM Stream] Error parsing stream data:",
									e,
									"Raw line:",
									line,
								);
							}
						}
					}
					continue;
				}

				// Assuming 'event' is now a parsed JSON object from Anthropic's stream
				if (event.type === "content_block_delta") {
					if (event.delta.type === "text_delta") {
						accumulatedText += event.delta.text;
						// currentContentParts.push({ text: event.delta.text }); // This would create many parts
						yield new LLMResponse({
							content: {
								role: "model",
								parts: [{ text: event.delta.text } as TextPart],
							},
							is_partial: true,
							raw_response: event,
						});
					} else if (event.delta.type === "input_json_delta") {
						// Part of a tool_use block, not usually yielded as discrete LLMResponse for args delta
					}
				} else if (event.type === "content_block_start") {
					if (event.content_block.type === "tool_use") {
						// A tool use is starting. The full tool_use block will typically arrive
						// in a message_delta or message_stop event's content array.
					}
				} else if (event.type === "message_delta") {
					if (event.delta?.stop_reason) {
						stopReason = event.delta.stop_reason;
					}
					if (event.usage && event.message?.content) {
						const partsFromDelta = this.convertAnthropicBlocksToAdkParts(
							event.message.content,
						);
						const hasNewData = partsFromDelta.some(
							(p) => ("text" in p && p.text) || "functionCall" in p,
						);
						if (hasNewData) {
							yield new LLMResponse({
								content: { role: "model", parts: partsFromDelta },
								is_partial: true,
								turn_complete: false, // Usually false for delta
								raw_response: event,
							});
						}
					}
				} else if (event.type === "message_stop") {
					isComplete = true;
					const finalApiResponse = event.message as AnthropicApiResponse;
					const finalAdkParts = this.convertAnthropicBlocksToAdkParts(
						finalApiResponse.content,
					);
					stopReason = finalApiResponse.stop_reason;
					yield new LLMResponse({
						content: { role: "model", parts: finalAdkParts },
						is_partial: false,
						turn_complete: true,
						raw_response: finalApiResponse,
					});
					return; // End of stream
				}
			}
			// Fallback if stream ends without a proper message_stop or if error
			if (!isComplete) {
				yield new LLMResponse({
					content: {
						role: "model",
						parts: accumulatedText ? [{ text: accumulatedText }] : [],
					},
					is_partial: false,
					turn_complete: true,
					error_message: stopReason
						? `Stream ended with reason: ${stopReason}`
						: "Stream ended unexpectedly",
				});
			}
			return; // Explicitly return after stream processing
		}

		// Non-streaming response (removed the 'else' block)
		const responseData = await this.callAnthropicAPI(params, false);
		const adkParts = this.convertAnthropicBlocksToAdkParts(
			responseData.content,
		);

		yield new LLMResponse({
			content: { role: "model", parts: adkParts },
			is_partial: false,
			turn_complete: true,
			raw_response: responseData,
		});
	}

	/**
	 * Creates a live connection to the LLM
	 */
	connect(llmRequest: LLMRequest): BaseLLMConnection {
		const axiosInstance = axios.create({
			baseURL: this.baseURL,
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apiKey,
				"anthropic-version": "2023-06-01",
			},
		});
		return new AnthropicLLMConnection(
			axiosInstance,
			this.model,
			llmRequest,
			this.defaultParams,
		);
	}
}
