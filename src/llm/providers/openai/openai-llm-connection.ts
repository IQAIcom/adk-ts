import type OpenAI from "openai";
import type {
	LLMRequest,
	Content,
	Part,
	Role,
	TextPart,
	FunctionCallPart,
	FunctionCallData,
	FunctionResponsePart,
} from "../../../models/llm-request";
import { LLMResponse } from "../../../models/llm-response";
import { BaseLLMConnection } from "../../base-llm-connection";

/**
 * OpenAI LLM Connection
 */
export class OpenAILLMConnection extends BaseLLMConnection {
	/**
	 * OpenAI client
	 */
	private client: OpenAI;

	/**
	 * The model name
	 */
	private model: string;

	/**
	 * The initial request
	 */
	private initialRequest: LLMRequest;

	/**
	 * Default parameters
	 */
	private defaultParams: Record<string, any>;

	/**
	 * Response callback
	 */
	private responseCallback?: (response: LLMResponse) => void;

	/**
	 * Error callback
	 */
	private errorCallback?: (error: Error) => void;

	/**
	 * End callback
	 */
	private endCallback?: () => void;

	/**
	 * Ongoing chat history
	 */
	private messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

	/**
	 * Constructor for OpenAILLMConnection
	 */
	constructor(
		client: OpenAI,
		model: string,
		initialRequest: LLMRequest,
		defaultParams: Record<string, any>,
	) {
		super();
		this.client = client;
		this.model = model;
		this.initialRequest = initialRequest;
		this.defaultParams = defaultParams;

		// Initialize messages from the initial request
		this.messages = this.convertAdkContentsToOpenAIMessages(
			initialRequest.contents,
		);
	}

	/**
	 * Converts ADK Content[] to OpenAI.Chat.ChatCompletionMessageParam[]
	 * This is a simplified version for the connection; OpenAILLM has a more detailed one.
	 */
	private convertAdkContentsToOpenAIMessages(
		contents: Content[],
	): OpenAI.Chat.ChatCompletionMessageParam[] {
		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
		for (const content of contents) {
			let role: OpenAI.Chat.ChatCompletionRole;
			let messageContent:
				| string
				| OpenAI.Chat.Completions.ChatCompletionContentPartText[]
				| null = "";
			const partsForOpenAI: OpenAI.Chat.Completions.ChatCompletionContentPartText[] =
				[];
			let toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] | undefined =
				undefined;
			let tool_call_id: string | undefined = undefined;

			switch (content.role) {
				case "user":
					role = "user";
					break;
				case "model": // ADK 'model' can be assistant or have tool_calls
					role = "assistant";
					break;
				case "function": // ADK 'function' role means a tool/function produced this
					role = "tool"; // OpenAI expects role 'tool' for function responses
					break;
				default:
					console.warn(
						`[OpenAILLMConnection] Unknown ADK role: ${content.role}, skipping content.`,
					);
					continue;
			}

			for (const part of content.parts) {
				if ("text" in part) {
					partsForOpenAI.push({ type: "text", text: (part as TextPart).text });
				} else if ("functionCall" in part && role === "assistant") {
					// This is from the assistant asking to call a function/tool
					if (!toolCalls) toolCalls = [];
					const fc = (part as FunctionCallPart).functionCall;
					toolCalls.push({
						id: fc.id || `tool_${Date.now()}`,
						type: "function",
						function: { name: fc.name, arguments: JSON.stringify(fc.args) },
					});
				} else if ("functionResponse" in part && role === "tool") {
					// This is the result of a function/tool call
					const fr = (part as FunctionResponsePart).functionResponse;
					messageContent = JSON.stringify(fr.response);
					tool_call_id = `placeholder_tool_call_id_for_${fr.name}`;
				}
				// TODO: Handle InlineDataPart for images (OpenAI vision)
			}

			if (role !== "tool") {
				if (partsForOpenAI.length === 1) {
					messageContent = partsForOpenAI[0].text;
				} else if (partsForOpenAI.length > 1) {
					messageContent = partsForOpenAI;
				} else {
					if (role === "assistant" && !toolCalls) messageContent = null;
				}
			}

			if (role === "assistant") {
				openAiMessages.push({
					role,
					content: messageContent,
					tool_calls: toolCalls,
				});
			} else if (role === "tool") {
				if (!tool_call_id) {
					console.error(
						"[OpenAILLMConnection] tool_call_id is missing for a 'tool' role message. OpenAI API will reject this.",
					);
					continue;
				}
				openAiMessages.push({
					role,
					content: messageContent as string,
					tool_call_id,
				});
			} else {
				openAiMessages.push({
					role,
					content: messageContent as
						| string
						| OpenAI.Chat.Completions.ChatCompletionContentPartText[],
				});
			}
		}
		return openAiMessages;
	}

	/**
	 * Adds a tool/function result message to the conversation history
	 * This method ensures we don't duplicate tool_call_id values
	 */
	private addToolResultMessage(
		toolCallId: string,
		name: string,
		content: string,
	): void {
		// Check if there's already a message with this tool_call_id
		const existingMessageIndex = this.messages.findIndex(
			(msg) => (msg as any).tool_call_id === toolCallId,
		);

		// If found, update it instead of adding a new one
		if (existingMessageIndex >= 0) {
			this.messages[existingMessageIndex] = {
				role: "tool",
				content,
				tool_call_id: toolCallId,
			};
		} else {
			// Add as a new message
			this.messages.push({
				role: "tool",
				content,
				tool_call_id: toolCallId,
			});
		}
	}

	/**
	 * Sends a message to the OpenAI model
	 */
	async send(message: string): Promise<void> {
		if (!this.isActive) {
			throw new Error("Connection is closed");
		}

		try {
			this.messages.push({ role: "user", content: message });

			// Explicitly type params for streaming to help type inference for the client call
			const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming =
				{
					model: this.model,
					messages: this.messages,
					stream: true,
					...(this
						.defaultParams as Partial<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming>),
				};

			if (
				this.initialRequest.config.functions &&
				this.initialRequest.config.functions.length > 0
			) {
				params.tools = this.initialRequest.config.functions.map((func) => ({
					type: "function",
					function: {
						name: func.name,
						description: func.description,
						parameters: func.parameters as Record<string, unknown>,
					},
				}));
			}

			const stream = await this.client.chat.completions.create(params);

			let accumulatedText = "";
			// The map stores the accumulated state of each tool call detected in the stream
			const accumulatedToolCallsMap: Map<
				string,
				{ id: string; name: string; arguments: string; type: "function" }
			> = new Map();
			let finalTurnComplete = false;

			for await (const chunk of stream) {
				if (!this.isActive) break; // Stop processing if connection closed externally

				const choice = chunk.choices[0];
				if (!choice) continue;

				const delta = choice.delta;
				const currentParts: Part[] = [];
				let isPartialUpdate = true; // Most chunks are partial

				if (delta?.content) {
					accumulatedText += delta.content;
					currentParts.push({ text: delta.content });
				}

				if (delta?.tool_calls) {
					for (const toolCallDelta of delta.tool_calls) {
						if (toolCallDelta.id) {
							let existingToolCall = accumulatedToolCallsMap.get(
								toolCallDelta.id,
							);
							if (!existingToolCall) {
								existingToolCall = {
									id: toolCallDelta.id,
									type: "function", // Assuming all tool calls are functions
									name: toolCallDelta.function?.name || "",
									arguments: toolCallDelta.function?.arguments || "",
								};
							} else {
								if (toolCallDelta.function?.name) {
									existingToolCall.name += toolCallDelta.function.name;
								}
								if (toolCallDelta.function?.arguments) {
									existingToolCall.arguments +=
										toolCallDelta.function.arguments;
								}
							}
							accumulatedToolCallsMap.set(toolCallDelta.id, existingToolCall);
						}
					}
				}

				if (choice.finish_reason) {
					isPartialUpdate = false;
					finalTurnComplete = true;
					// If finished due to tool_calls, all tool call parts are now complete
					if (
						choice.finish_reason === "tool_calls" &&
						accumulatedToolCallsMap.size > 0
					) {
						currentParts.length = 0; // Clear any partial text from this chunk
						accumulatedToolCallsMap.forEach((tc) => {
							try {
								currentParts.push({
									functionCall: {
										id: tc.id,
										name: tc.name,
										args: JSON.parse(tc.arguments || "{}"),
									},
								});
							} catch (e) {
								console.error(
									"[OpenAILLMConnection] Error parsing tool call arguments:",
									e,
									"Args:",
									tc.arguments,
								);
								currentParts.push({
									functionCall: {
										id: tc.id,
										name: tc.name,
										args: { error: "failed to parse arguments" },
									},
								});
							}
						});
						// Add accumulated text if any, before the tool calls
						if (accumulatedText.trim()) {
							currentParts.unshift({ text: accumulatedText.trim() });
						}
					} else if (accumulatedText) {
						// If finished for other reasons (e.g. stop, length), use accumulated text
						currentParts.push({ text: accumulatedText });
					}
				} else if (!delta?.content && !delta?.tool_calls) {
					// If it's not a finish event and there's no new content or tool_call delta, skip yielding empty response.
					continue;
				}

				if (currentParts.length > 0) {
					const response = new LLMResponse({
						content: { role: "model", parts: currentParts },
						is_partial: isPartialUpdate,
						turn_complete: finalTurnComplete,
						raw_response: chunk,
					});
					this.responseCallback?.(response);

					if (finalTurnComplete) {
						// Update conversational history for next turn
						const finalToolCallsForHistory: OpenAI.Chat.ChatCompletionMessageToolCall[] =
							Array.from(accumulatedToolCallsMap.values()).map((tc) => ({
								id: tc.id,
								type: "function", // type is 'function' for tool_calls
								function: { name: tc.name, arguments: tc.arguments },
							}));

						this.messages.push({
							role: "assistant",
							content: accumulatedText || null,
							tool_calls:
								finalToolCallsForHistory.length > 0
									? finalToolCallsForHistory
									: undefined,
						});
						accumulatedText = "";
						accumulatedToolCallsMap.clear();
					}
				}
			}

			if (finalTurnComplete || !this.isActive) {
				// Also call end if connection was closed during stream
				this.endCallback?.();
			}
		} catch (error) {
			if (error instanceof Error) {
				this.errorCallback?.(error);
				this.responseCallback?.(
					new LLMResponse({
						content: { role: "model", parts: [{ text: error.message }] },
						error_message: error.message,
						turn_complete: true,
					}),
				);
			} else {
				this.errorCallback?.(new Error("Unknown error in OpenAI connection"));
				this.responseCallback?.(
					new LLMResponse({
						content: {
							role: "model",
							parts: [{ text: "Unknown error in OpenAI connection" }],
						},
						error_message: "Unknown error in OpenAI connection",
						turn_complete: true,
					}),
				);
			}
			this.endCallback?.(); // Ensure end is called on error
		}
	}

	/**
	 * Registers a response handler
	 */
	onResponse(callback: (response: LLMResponse) => void): void {
		this.responseCallback = callback;
	}

	/**
	 * Registers an error handler
	 */
	onError(callback: (error: Error) => void): void {
		this.errorCallback = callback;
	}

	/**
	 * Registers an end handler
	 */
	onEnd(callback: () => void): void {
		this.endCallback = callback;
	}
}
