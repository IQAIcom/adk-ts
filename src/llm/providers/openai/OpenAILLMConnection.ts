import type OpenAI from "openai";
import type { LLMRequest } from "../../../models/request/LLMRequest";
import { LLMResponse } from "../../../models/response/LLMResponse";
import { BaseLLMConnection } from "../../BaseLLMConnection";

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
		this.messages = initialRequest.messages.map((message) => {
			// Base message without name
			const baseMsg: Partial<OpenAI.Chat.ChatCompletionMessageParam> = {
				role: message.role as OpenAI.Chat.ChatCompletionMessageParam["role"],
				content: typeof message.content === "string" ? message.content : "",
			};

			// Add name only for function or tool messages where it's needed
			if (message.role === "function" && message.name) {
				(baseMsg as OpenAI.Chat.ChatCompletionFunctionMessageParam).name =
					message.name;
			}

			// Add tool_call_id for tool messages
			if (message.role === "tool" && message.tool_call_id) {
				(baseMsg as OpenAI.Chat.ChatCompletionToolMessageParam).tool_call_id =
					message.tool_call_id;
			}

			return baseMsg as OpenAI.Chat.ChatCompletionMessageParam;
		});
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
			// Add the new message to the history
			this.messages.push({
				role: "user",
				content: message,
			});

			// Create a parameters object
			const params: OpenAI.Chat.ChatCompletionCreateParams = {
				model: this.model,
				messages: this.messages,
				stream: true,
				temperature: this.defaultParams.temperature,
				max_tokens: this.defaultParams.max_tokens,
				top_p: this.defaultParams.top_p,
				frequency_penalty: this.defaultParams.frequency_penalty,
				presence_penalty: this.defaultParams.presence_penalty,
			};

			// Add tools if they exist in the initial request
			if (
				this.initialRequest.config.functions &&
				this.initialRequest.config.functions.length > 0
			) {
				params.tools = this.initialRequest.config.functions.map((func) => ({
					type: "function",
					function: {
						name: func.name,
						description: func.description,
						parameters: func.parameters,
					},
				}));
			}

			// Get a streaming response
			const stream = await this.client.chat.completions.create(params);
			let responseContent = "";
			let functionCall: any = null;
			const toolCalls: any[] = [];

			// Process the stream
			for await (const chunk of stream) {
				if (chunk.choices.length === 0) continue;

				const delta = chunk.choices[0].delta;

				// Add to the content
				if (delta?.content) {
					responseContent += delta.content;
				}

				// Process function calls
				if (delta?.function_call) {
					if (!functionCall) {
						functionCall = {
							name: delta.function_call.name || "",
							arguments: delta.function_call.arguments || "",
						};
					} else {
						functionCall.name += delta.function_call.name || "";
						functionCall.arguments += delta.function_call.arguments || "";
					}
				}

				// Process tool calls
				if (delta?.tool_calls) {
					for (const toolDelta of delta.tool_calls) {
						const id = toolDelta.id || "";
						let tool = toolCalls.find((t) => t.id === id);

						if (!tool) {
							tool = {
								id,
								function: {
									name: toolDelta.function?.name || "",
									arguments: toolDelta.function?.arguments || "",
								},
							};
							toolCalls.push(tool);
						} else {
							tool.function.name += toolDelta.function?.name || "";
							tool.function.arguments += toolDelta.function?.arguments || "";
						}
					}
				}

				// Create and send a response
				if (this.responseCallback) {
					const response = new LLMResponse({
						content: delta?.content || null,
						role: "assistant",
						function_call: functionCall,
						tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
						is_partial: true,
					});

					this.responseCallback(response);
				}
			}

			// Add the assistant message to the history
			this.messages.push({
				role: "assistant",
				content: responseContent,
				function_call: functionCall,
				tool_calls:
					toolCalls.length > 0
						? toolCalls.map((tool) => ({
								id: tool.id,
								type: "function",
								function: {
									name: tool.function.name,
									arguments: tool.function.arguments,
								},
							}))
						: undefined,
			});

			// If we have a final function call, add a function result message
			if (functionCall) {
				// Notify listeners that the response is complete
				if (this.responseCallback) {
					const response = new LLMResponse({
						content: responseContent,
						function_call: functionCall,
						role: "assistant",
						is_partial: false,
					});

					this.responseCallback(response);
				}

				if (this.endCallback) {
					this.endCallback();
				}
			}
			// If we have tool calls, add tool result messages
			else if (toolCalls.length > 0) {
				// Notify listeners that the response is complete
				if (this.responseCallback) {
					const response = new LLMResponse({
						content: responseContent,
						tool_calls: toolCalls.map((tool) => ({
							id: tool.id,
							function: {
								name: tool.function.name,
								arguments: tool.function.arguments,
							},
						})),
						role: "assistant",
						is_partial: false,
					});

					this.responseCallback(response);
				}

				if (this.endCallback) {
					this.endCallback();
				}
			}
			// Simple text response
			else {
				// Notify listeners that the response is complete
				if (this.responseCallback) {
					const response = new LLMResponse({
						content: responseContent,
						role: "assistant",
						is_partial: false,
					});

					this.responseCallback(response);
				}

				if (this.endCallback) {
					this.endCallback();
				}
			}
		} catch (error) {
			if (this.errorCallback) {
				this.errorCallback(error as Error);
			}
			throw error;
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
