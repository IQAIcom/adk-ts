import OpenAI from "openai";
import type {
	LLMRequest,
	Content,
	Part,
	Role,
	TextPart,
	InlineDataPart,
	FunctionCallPart,
	FunctionResponsePart,
	FunctionCallData,
} from "../../../models/llm-request";
import type { FunctionDeclaration } from "../../../models/function-declaration";
import { LLMResponse } from "../../../models/llm-response";
import { BaseLLM } from "../../../models/base-llm";
import type { BaseLLMConnection } from "../../../models/base-llm-connection";
import { OpenAILLMConnection } from "./openai-llm-connection";

/**
 * Configuration for OpenAI LLM
 */
export interface OpenAILLMConfig {
	/**
	 * OpenAI API key (can be provided via process.env.OPENAI_API_KEY)
	 */
	apiKey?: string;

	/**
	 * OpenAI base URL override
	 */
	baseURL?: string;

	/**
	 * OpenAI organization ID
	 */
	organization?: string;

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

		/**
		 * Frequency penalty
		 */
		frequency_penalty?: number;

		/**
		 * Presence penalty
		 */
		presence_penalty?: number;
	};
}

/**
 * OpenAI LLM implementation
 */
export class OpenAILLM extends BaseLLM {
	/**
	 * OpenAI client instance
	 */
	private client: OpenAI;

	/**
	 * Default parameters for requests
	 */
	private defaultParams: Record<string, any>;

	/**
	 * If the last content is not from a user, append an empty user content.
	 * OpenAI API typically expects alternating user/assistant messages.
	 */
	protected _maybeAppendUserContent(llmRequest: LLMRequest): void {
		if (
			llmRequest.contents.length > 0 &&
			llmRequest.contents[llmRequest.contents.length - 1].role !== "user"
		) {
			// Check if the last model message was a tool_call, in which case a function/tool response is expected next, not a user message.
			const lastContent = llmRequest.contents[llmRequest.contents.length - 1];
			if (
				lastContent.role === "model" &&
				lastContent.parts.some((part) => "functionCall" in part)
			) {
				// Do nothing, awaiting function response
			} else {
				llmRequest.contents.push({ role: "user", parts: [{ text: "" }] }); // Append empty user message
			}
		} else if (llmRequest.contents.length === 0) {
			llmRequest.contents.push({ role: "user", parts: [{ text: "Hello" }] }); // Start with a user message
		}
	}

	/**
	 * Constructor for OpenAILLM
	 */
	constructor(model: string, config?: OpenAILLMConfig) {
		super(model);

		// Create the OpenAI client
		this.client = new OpenAI({
			apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
			baseURL: config?.baseURL,
			organization: config?.organization,
		});

		// Store default parameters
		this.defaultParams = {
			temperature: config?.defaultParams?.temperature ?? 0.7,
			top_p: config?.defaultParams?.top_p ?? 1,
			max_tokens: config?.defaultParams?.max_tokens,
			frequency_penalty: config?.defaultParams?.frequency_penalty ?? 0,
			presence_penalty: config?.defaultParams?.presence_penalty ?? 0,
		};
	}

	/**
	 * Returns a list of supported models in regex for LLMRegistry
	 */
	static supportedModels(): string[] {
		return [
			// GPT-4 models
			"gpt-4-.*",
			// GPT-4o models
			"gpt-4o-.*",
			// GPT-3.5 models
			"gpt-3.5-.*",
			// Future-proofing
			"text-davinci-.*",
		];
	}

	/**
	 * Converts ADK Content[] to OpenAI ChatCompletionMessageParam[]
	 */
	private convertAdkContentsToOpenAIMessages(
		contents: Content[],
	): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
		// TODO: Implement this based on the logic from AnthropicLLM/GoogleLLM and OpenAI specifics
		// This will involve mapping ADK Roles and Parts to OpenAI's format, including tool_calls and function_responses.
		const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
		// Placeholder implementation
		for (const content of contents) {
			if (
				content.role === "user" &&
				content.parts[0] &&
				"text" in content.parts[0]
			) {
				messages.push({
					role: "user",
					content: (content.parts[0] as TextPart).text,
				});
			} else if (
				content.role === "model" &&
				content.parts[0] &&
				"text" in content.parts[0]
			) {
				messages.push({
					role: "assistant",
					content: (content.parts[0] as TextPart).text,
				});
			}
		}
		return messages;
	}

	/**
	 * Converts an OpenAI ChatCompletionMessage or ChatCompletionMessageChunk to ADK Content object
	 */
	private convertOpenAIMessageToAdkContent(
		openAIMessage: // OpenAI.Chat.Completions.ChatCompletionMessage is for whole messages
			| OpenAI.Chat.Completions.ChatCompletionMessage // For non-streaming response message
			| OpenAI.Chat.Completions.ChatCompletionChunk // For streaming response chunk
			| OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta, // For the delta part of a chunk
	): Content | null {
		const adkParts: Part[] = [];
		let adkRole: Role = "model"; // Default role for LLM responses

		// Determine if we're dealing with a full message, a chunk, or just a delta
		let messageContent: string | null | undefined = null;
		let toolCalls:
			| OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
			| OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall[]
			| undefined;

		if ("choices" in openAIMessage) {
			// It's a ChatCompletionChunk
			const delta = openAIMessage.choices[0]?.delta;
			if (!delta) return null;
			messageContent = delta.content;
			toolCalls = delta.tool_calls;
			adkRole = this.mapOpenAIRoleToAdkRole(delta.role || "assistant"); // Delta might not have role, default to assistant
		} else if ("role" in openAIMessage && "content" in openAIMessage) {
			// It's a full ChatCompletionMessage
			messageContent = openAIMessage.content;
			toolCalls = openAIMessage.tool_calls;
			adkRole = this.mapOpenAIRoleToAdkRole(openAIMessage.role || "assistant"); // Added fallback for role
		} else if ("content" in openAIMessage || "tool_calls" in openAIMessage) {
			// It's likely a Delta object directly
			const delta =
				openAIMessage as OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta;
			messageContent = delta.content;
			toolCalls = delta.tool_calls;
			// Role might not be present in delta alone, assume model/assistant if not specified
			adkRole = this.mapOpenAIRoleToAdkRole(delta.role || "assistant");
		}

		if (messageContent) {
			adkParts.push({ text: messageContent });
		}

		if (toolCalls) {
			for (const toolCall of toolCalls) {
				// Check if it's a streaming tool_call delta vs a complete tool_call
				if (toolCall.function?.name) {
					// if name is present, it's usable
					try {
						adkParts.push({
							functionCall: {
								id: toolCall.id, // ID will be present in full message, might be in delta for new calls
								name: toolCall.function.name,
								args: toolCall.function.arguments // This will be a string, needs parsing.
									? JSON.parse(toolCall.function.arguments)
									: {},
							},
						});
					} catch (e) {
						console.error(
							"[OpenAILLM] Error parsing tool call arguments:",
							e,
							"Args:",
							toolCall.function.arguments,
						);
						adkParts.push({
							functionCall: {
								id: toolCall.id,
								name: toolCall.function.name,
								args: {
									error: "failed to parse arguments",
									raw: toolCall.function.arguments,
								},
							},
						});
					}
				} else if (toolCall.id && toolCall.function?.arguments) {
					// This is a streaming chunk, potentially just for arguments of an existing tool call.
					// The main streaming loop in generateContentAsync handles accumulation.
					// This converter should ideally produce a partial FunctionCallPart if possible,
					// or the main loop needs to handle argument accumulation before calling this.
					// For now, if only args are streaming, this part might not create a full FunctionCallPart.
					// This function is more for converting *complete* message objects or *text* deltas.
					// Let's assume the caller (generateContentAsync stream loop) will handle accumulation
					// and call this method with a more complete structure or just text parts from delta.
				}
			}
		}
		// TODO: Handle older function_call if necessary, though tool_calls is preferred.

		return adkParts.length > 0 ? { role: adkRole, parts: adkParts } : null;
	}

	/**
	 * Maps OpenAI role to ADK Role.
	 */
	private mapOpenAIRoleToAdkRole(
		openAIRole: OpenAI.Chat.ChatCompletionRole | string,
	): Role {
		switch (openAIRole) {
			case "user":
				return "user";
			case "assistant":
				return "model";
			case "system": // OpenAI 'system' could map to ADK 'model' or be handled differently.
				// ADK doesn't have a 'system' role in Content objects for now.
				// For simplicity, treating as 'model' if encountered here, though system prompts are usually separate.
				console.warn(
					"[OpenAILLM] System role encountered in message conversion; ADK uses user/model/function.",
				);
				return "model";
			case "tool": // OpenAI 'tool' role (for tool/function responses) maps to ADK 'function' role
				return "function";
			case "function": // OpenAI legacy 'function' role (model requesting function call)
				return "model"; // The ADK content will have a functionCallPart
			default:
				console.warn(
					`[OpenAILLM] Unknown OpenAI role: ${openAIRole}, defaulting to model.`,
				);
				return "model";
		}
	}

	/**
	 * Converts ADK FunctionDeclarations to OpenAI Tools format
	 */
	private convertAdkFunctionsToOpenAITools(
		functions: FunctionDeclaration[],
	): OpenAI.Chat.Completions.ChatCompletionTool[] {
		if (!functions || functions.length === 0) {
			return [];
		}
		return functions.map((func) => ({
			type: "function",
			function: {
				name: func.name,
				description: func.description,
				parameters: func.parameters as Record<string, unknown>, // OpenAI expects a JSON schema object
			},
		}));
	}

	/**
	 * Generates content from the given request
	 */
	async *generateContentAsync(
		llmRequest: LLMRequest,
		stream = false,
	): AsyncGenerator<LLMResponse, void, unknown> {
		this._maybeAppendUserContent?.(llmRequest);
		const messages = this.convertAdkContentsToOpenAIMessages(
			llmRequest.contents,
		);
		const tools = llmRequest.config.functions
			? this.convertAdkFunctionsToOpenAITools(llmRequest.config.functions)
			: undefined;

		const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
			model: this.model,
			messages: messages,
			stream: stream,
			...(this
				.defaultParams as Partial<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming>),
			...(tools && tools.length > 0 && { tools }),
			// Add relevant parameters from llmRequest.config if they exist and are supported by OpenAI
			...(llmRequest.config.temperature && {
				temperature: llmRequest.config.temperature,
			}),
			...(llmRequest.config.max_tokens && {
				max_tokens: llmRequest.config.max_tokens,
			}),
			...(llmRequest.config.top_p && { top_p: llmRequest.config.top_p }),
			...(llmRequest.config.frequency_penalty && {
				frequency_penalty: llmRequest.config.frequency_penalty,
			}),
			...(llmRequest.config.presence_penalty && {
				presence_penalty: llmRequest.config.presence_penalty,
			}),
		};

		try {
			if (stream) {
				const responseStream = await this.client.chat.completions.create(
					params as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
				);

				let accumulatedText = "";
				const accumulatedToolCalls: Map<string, FunctionCallData> = new Map();
				let finalChoiceFinishReason: string | null = null;

				for await (const chunk of responseStream) {
					const choice = chunk.choices[0];
					if (!choice) continue;

					const delta = choice.delta;
					const currentParts: Part[] = [];
					let turnComplete = false;

					if (delta?.content) {
						accumulatedText += delta.content;
						currentParts.push({ text: delta.content });
					}

					if (delta?.tool_calls) {
						for (const toolCallDelta of delta.tool_calls) {
							if (toolCallDelta.id) {
								let existingToolCall = accumulatedToolCalls.get(
									toolCallDelta.id,
								);
								if (!existingToolCall) {
									existingToolCall = {
										id: toolCallDelta.id,
										name: toolCallDelta.function?.name || "",
										args: JSON.parse(toolCallDelta.function?.arguments || "{}"), // Initial parse
									};
								} else {
									if (toolCallDelta.function?.name) {
										existingToolCall.name += toolCallDelta.function.name; // Should ideally not change
									}
									if (toolCallDelta.function?.arguments) {
										// Argument streaming needs careful accumulation of the string parts then a final parse
										// For simplicity, this assumes args are mostly complete or handled by final parse later
										// A more robust way is to store arguments as string and parse once at the end.
										try {
											const newArgs = JSON.parse(
												toolCallDelta.function.arguments,
											);
											existingToolCall.args = {
												...existingToolCall.args,
												...newArgs,
											};
										} catch (e) {
											/* ignore parse error on partial stream */
										}
									}
								}
								accumulatedToolCalls.set(toolCallDelta.id, existingToolCall);
							}
						}
					}

					if (choice.finish_reason) {
						finalChoiceFinishReason = choice.finish_reason;
						turnComplete = true;
						// If finished due to tool_calls, construct the final tool call parts
						if (
							finalChoiceFinishReason === "tool_calls" &&
							accumulatedToolCalls.size > 0
						) {
							currentParts.length = 0; // Clear any partial text from this final chunk for tool calls
							accumulatedToolCalls.forEach((tc) =>
								currentParts.push({ functionCall: tc }),
							);
							// Add accumulated text if any, before the tool calls
							if (
								accumulatedText.trim() &&
								!currentParts.some((p) => "text" in p)
							) {
								currentParts.unshift({ text: accumulatedText.trim() });
							}
						} else if (accumulatedText) {
							// If finished for other reasons, ensure accumulated text is the primary part
							currentParts.length = 0;
							currentParts.push({ text: accumulatedText });
						}
					}

					if (currentParts.length > 0 || turnComplete) {
						// Yield if there are parts or if it's a final (even empty) signal
						yield new LLMResponse({
							content: { role: "model", parts: currentParts },
							is_partial: !turnComplete,
							turn_complete: turnComplete,
							raw_response: chunk,
						});
					}
				}
			} else {
				const response = await this.client.chat.completions.create(
					params as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
				);
				const adkContent = response.choices[0]
					? this.convertOpenAIMessageToAdkContent(response.choices[0].message)
					: null;
				if (adkContent) {
					yield new LLMResponse({
						content: adkContent,
						raw_response: response,
						turn_complete: true,
						is_partial: false,
					});
				} else {
					yield new LLMResponse({
						content: { role: "model", parts: [] },
						raw_response: response,
						turn_complete: true,
						is_partial: false,
						error_message:
							"Failed to convert OpenAI non-streaming response to ADK Content",
					});
				}
			}
		} catch (error) {
			console.error("Error calling OpenAI:", error);
			throw error;
		}
	}

	/**
	 * Creates a live connection to the LLM
	 */
	connect(llmRequest: LLMRequest): BaseLLMConnection {
		return new OpenAILLMConnection(
			this.client,
			this.model,
			llmRequest,
			this.defaultParams,
		);
	}
}
