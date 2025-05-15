import type {
	LLMRequest,
	Content,
	Part,
	Role as AdkRole,
	TextPart,
	FunctionCallPart,
	FunctionResponsePart,
	FunctionCallData,
	InlineDataPart,
} from "../../../models/llm-request";
import type {
	FunctionDeclaration,
	JSONSchema,
} from "../../../models/function-declaration";
import {
	LLMResponse,
	// type ToolCall, // This will be removed/replaced
} from "../../../models/llm-response";
import { BaseLLMConnection } from "../../base-llm-connection";
import type Anthropic from "@anthropic-ai/sdk";
import type {
	MessageParam as AnthropicApiMessage,
	ContentBlock as AnthropicResponseContentBlock,
	ContentBlockParam,
	TextBlockParam,
	ToolUseBlockParam,
	ToolResultBlockParam,
	ToolUseBlock as AnthropicToolUseBlock,
	InputJSONDelta,
	ContentBlockDeltaEvent,
	ContentBlockStartEvent,
	ContentBlockStopEvent,
	Messages,
} from "@anthropic-ai/sdk/resources/messages";

// Helper types for the Anthropic API
// interface AnthropicContentBlockType = "text" | "image" | "tool_use" | "tool_result"; // Incorrect syntax
type AnthropicContentBlockType = "text" | "image" | "tool_use" | "tool_result"; // Corrected syntax

interface AnthropicContentBlock {
	type: AnthropicContentBlockType;
	text?: string;
	source?: {
		type: "base64" | "url";
		media_type: string;
		data?: string;
		url?: string;
	};
	tool_use?: AnthropicToolUseBlock; // This seems to be SDK's ToolUseBlock
	tool_result?: {
		// This seems to be SDK's ToolResultBlock
		content: string | ContentBlockParam[]; // or ContentBlock[]
		tool_use_id: string;
	};
	// Direct properties for tool_use blocks in the API response
	id?: string; // tool_use_id
	name?: string; // tool name
	input?: any; // tool input
}

/**
 * Anthropic LLM Connection for live chat with Claude models
 */
export class AnthropicLLMConnection extends BaseLLMConnection {
	/**
	 * Axios instance for API calls
	 */
	private anthropicClient: Anthropic;

	/**
	 * Current model to use
	 */
	private model: string;

	/**
	 * Current messages in the conversation
	 */
	private messages: AnthropicApiMessage[] = [];

	/**
	 * System message if present
	 */
	private systemMessage?: string;

	/**
	 * Default parameters for requests
	 */
	private defaultParams: Record<string, any>;

	/**
	 * Callbacks for handling responses, errors, and connection end
	 */
	private responseCallback?: (response: LLMResponse) => void;
	private errorCallback?: (error: Error) => void;
	private endCallback?: () => void;
	private initialRequest: LLMRequest;
	private toolIdMapByIndex: { [index: number]: string } = {};

	/**
	 * Constructor
	 */
	constructor(
		client: Anthropic,
		model: string,
		initialRequest: LLMRequest,
		defaultParams: Record<string, any>,
	) {
		super();

		this.anthropicClient = client;
		this.model = model;
		this.initialRequest = initialRequest;
		this.defaultParams = defaultParams;
		this.toolIdMapByIndex = {};

		// Extract system message
		this.systemMessage = this.extractSystemMessage(initialRequest.contents);

		// Initialize messages without system message
		this.messages = this.convertAdkContentsToAnthropicMessages(
			this.filterSystemMessages(initialRequest.contents),
		);
	}

	/**
	 * Extract the system message from messages array
	 */
	private extractSystemMessage(contents: Content[]): string | undefined {
		// Anthropic's system message is a top-level parameter, not part of 'messages' array.
		// The python adk-python/adk/llm/providers/anthropic/anthropic_llm.py
		// searches for a system message in initial_request.messages if initial_request.system is not set.
		// Let's assume for now system message is directly in llmRequest.config.systemInstruction or similar
		// For now, let's see if the first message can be a system message, as per old logic
		// but this needs alignment with how system prompts are set in LLMRequest.
		// The initialRequest.config.systemInstruction is not directly available here.
		// The python code does:
		// system_prompt_parts = [
		//            part.text
		//            for part in content.parts
		//            if isinstance(part, TextPart)
		// ]
		// if system_prompt_parts:
		//     self.system_prompt = "\\n".join(system_prompt_parts)

		// This connection class previously looked for a "system" role message.
		// ADK's Content now uses "user", "model", "function".
		// System messages are typically set via LLMRequest.config.system_instruction or a similar field.
		// For the connection, we'll assume the main AnthropicLLM class handles system prompt extraction
		// and passes it via defaultParams or specific field if that changes.
		// The current constructor logic based on `initialRequest.messages` (now `contents`) is likely flawed for system messages.
		// For now, returning undefined as system messages should be handled by the AnthropicLLM class.
		return undefined; // Placeholder: System message handling needs review based on AnthropicLLM
	}

	/**
	 * Filter out system messages as they are handled separately in Anthropic API
	 */
	private filterSystemMessages(contents: Content[]): Content[] {
		// ADK Content objects don't have a 'system' role. System prompts are usually handled separately.
		// This method might be redundant if system messages are not part of `contents`.
		return contents; // No filtering needed if system role isn't in Content.
	}

	/**
	 * Converts an ADK message to an Anthropic message
	 */
	private convertAdkContentsToAnthropicMessages(
		contents: Content[],
	): AnthropicApiMessage[] {
		const anthropicMessages: AnthropicApiMessage[] = [];
		for (const content of contents) {
			const role = this.mapAdkRoleToAnthropicRole(content.role);
			if (!role) continue; // Skip if role cannot be mapped

			const anthropicParts: ContentBlockParam[] = [];
			for (const part of content.parts) {
				if ("text" in part) {
					anthropicParts.push({
						type: "text",
						text: (part as TextPart).text,
					});
				} else if ("inlineData" in part) {
					const idp = part as InlineDataPart;
					anthropicParts.push({
						type: "image",
						source: {
							type: "base64",
							media_type: idp.inlineData.mimeType as
								| "image/jpeg"
								| "image/png"
								| "image/gif"
								| "image/webp",
							data: idp.inlineData.data,
						},
					});
				} else if ("functionCall" in part && role === "assistant") {
					// Model is requesting a tool call
					const fc = (part as FunctionCallPart).functionCall;
					anthropicParts.push({
						type: "tool_use",
						id:
							fc.id ||
							`tool_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Anthropic requires an ID
						name: fc.name,
						input: fc.args,
					} as ToolUseBlockParam); // Cast to specific type
				} else if ("functionResponse" in part && role === "user") {
					// Providing a tool result (ADK 'function' role maps to Anthropic 'user' role for this)
					const fr = (part as FunctionResponsePart).functionResponse;
					// Anthropic expects tool results as a separate message typically, or specific block.
					// We need to find the corresponding tool_use_id.
					// This requires the `id` from the `FunctionCallPart` to be available.
					// Let's assume `fr.name` here might store the original tool_call_id if passed correctly.
					// This part is tricky as ADK's FunctionResponsePart.name is the function's name, not ID.
					// The ID should come from the LLMResponse that contained the FunctionCallPart.
					// This class might not have enough context for perfect mapping without that ID.

					// The AnthropicLLM class's `_convert_adk_content_to_anthropic_message` handles this
					// by iterating and if the previous message was an assistant tool_use, this user message
					// containing tool_result blocks refers to those.
					// For a connection, history is built incrementally.
					// We'll assume a single FunctionResponsePart means a single ToolResultBlockParam.
					// The `id` of the tool use must be correctly associated. This requires careful state management
					// or ensuring the `id` is part of `FunctionResponseData` if possible.
					// For now, we'll use fr.name as a placeholder for tool_use_id, but this IS LIKELY WRONG.
					// The ID should be sourced from the original tool_use block.
					const toolUseId = `placeholder_tool_use_id_for_${fr.name}`; // MAJOR PLACEHOLDER
					anthropicParts.push({
						type: "tool_result",
						tool_use_id: toolUseId, // NEEDS THE ACTUAL ID of the tool_use block
						content: [{ type: "text", text: JSON.stringify(fr.response) }], // Anthropic SDK wants content as string or ContentBlock[]
						// is_error: false, // Optional: if the tool execution failed
					} as ToolResultBlockParam);
				}
			}
			if (anthropicParts.length > 0) {
				anthropicMessages.push({ role, content: anthropicParts });
			}
		}
		return anthropicMessages;
	}

	private mapAdkRoleToAnthropicRole(
		adkRole: AdkRole,
	): "user" | "assistant" | undefined {
		switch (adkRole) {
			case "user":
				return "user";
			case "model": // ADK 'model' maps to Anthropic 'assistant'
				return "assistant";
			case "function":
				// ADK 'function' (tool response) content should be mapped to Anthropic 'user' role
				// with a 'tool_result' block inside.
				return "user";
			default:
				console.warn(`[AnthropicLLMConnection] Unknown ADK role: ${adkRole}`);
				return undefined;
		}
	}

	/**
	 * Sends a message to the LLM
	 * Implements BaseLLMConnection.send
	 *
	 * @param message The message to send
	 */
	public send(message: string): void {
		if (!this.isActive) {
			this.triggerError(new Error("Connection is not active"));
			return;
		}

		const userContent: Content = {
			role: "user",
			parts: [{ text: message }],
		};

		// Convert this single user message to Anthropic format and add to history
		const anthropicUserMessages = this.convertAdkContentsToAnthropicMessages([
			userContent,
		]);
		if (anthropicUserMessages.length > 0) {
			this.messages.push(...anthropicUserMessages);
		}

		this.sendMessageStream()
			.then(() => {
				// Stream handles responses and end callback
			})
			.catch((error) => {
				this.triggerError(error);
				if (this.endCallback) {
					this.endCallback(); // Ensure end is called on error
				}
			});
	}

	/**
	 * Handles responses from the LLM
	 * Implements BaseLLMConnection.onResponse
	 *
	 * @param callback The callback to handle responses
	 */
	public onResponse(callback: (response: LLMResponse) => void): void {
		this.responseCallback = callback;
	}

	/**
	 * Handles errors from the LLM
	 * Implements BaseLLMConnection.onError
	 *
	 * @param callback The callback to handle errors
	 */
	public onError(callback: (error: Error) => void): void {
		this.errorCallback = callback;
	}

	/**
	 * Handles the end of the connection
	 * Implements BaseLLMConnection.onEnd
	 *
	 * @param callback The callback to handle the end
	 */
	public onEnd(callback: () => void): void {
		this.endCallback = callback;
	}

	/**
	 * Triggers an error through the error callback
	 */
	private triggerError(error: Error): void {
		if (this.errorCallback) {
			this.errorCallback(error);
		}
	}

	/**
	 * Sends the message to the LLM and returns the response
	 */
	private async sendMessageStream(): Promise<void> {
		const tools: Anthropic.Tool[] | undefined =
			this.initialRequest.config.functions?.map((fd: FunctionDeclaration) => ({
				name: fd.name,
				description: fd.description,
				input_schema: fd.parameters as Messages.InputSchema,
			}));
		this.toolIdMapByIndex = {};

		try {
			const stream = this.anthropicClient.messages.stream({
				model: this.model,
				messages: this.messages,
				system: this.systemMessage,
				max_tokens: this.defaultParams.max_tokens || 4096,
				temperature: this.defaultParams.temperature,
				top_p: this.defaultParams.top_p,
				tools: tools,
				...this.defaultParams,
			});

			let accumulatedText = "";
			const accumulatedToolCallParts: FunctionCallPart[] = [];
			let currentTurnToolUses: { [id: string]: AnthropicToolUseBlock } = {};
			const lastRole: AdkRole = "model";

			for await (const event of stream) {
				if (!this.isActive) break;

				let isPartial = true;
				let turnComplete = false;
				const responseParts: Part[] = [];

				if (event.type === "message_start") {
					// message.usage contains input_tokens
					// console.log("Message start usage:", event.message.usage);
				} else if (event.type === "content_block_start") {
					const cbStartEvent = event as ContentBlockStartEvent;
					if (cbStartEvent.content_block.type === "tool_use") {
						const toolUse = cbStartEvent.content_block;
						currentTurnToolUses[toolUse.id] = {
							...toolUse,
							input: toolUse.input || {},
						};
						this.toolIdMapByIndex[cbStartEvent.index] = toolUse.id;
					}
				} else if (event.type === "content_block_delta") {
					const cbDeltaEvent = event as ContentBlockDeltaEvent;
					if (cbDeltaEvent.delta.type === "text_delta") {
						accumulatedText += cbDeltaEvent.delta.text;
						responseParts.push({ text: cbDeltaEvent.delta.text } as TextPart);
					} else if (cbDeltaEvent.delta.type === "input_json_delta") {
						const toolUseId = this.toolIdMapByIndex[cbDeltaEvent.index];
						if (toolUseId && currentTurnToolUses[toolUseId]) {
							// Logic for accumulating partial_json for InputJsonDelta
							// This typically requires a robust JSON partial string accumulator.
							// For now, we acknowledge the delta but rely on content_block_stop for full data.
							// The AnthropicLLM class itself has more complex logic here if needed.
						}
					}
				} else if (event.type === "content_block_stop") {
					const cbStopEvent = event as ContentBlockStopEvent;
					if (cbStopEvent.content_block.type === "tool_use") {
						const toolUseBlock =
							cbStopEvent.content_block as AnthropicToolUseBlock;
						accumulatedToolCallParts.push({
							functionCall: {
								id: toolUseBlock.id,
								name: toolUseBlock.name,
								args: toolUseBlock.input as Record<string, any>,
							},
						});
						responseParts.push(
							accumulatedToolCallParts[accumulatedToolCallParts.length - 1],
						);
					}
				} else if (event.type === "message_delta") {
					if (event.delta.stop_reason) {
						isPartial = false;
						turnComplete = true;
						// event.usage.output_tokens available here
						// console.log("Message delta usage:", event.usage);
					}
				} else if (event.type === "message_stop") {
					isPartial = false;
					turnComplete = true;
					// Final event, contains usage.input_tokens and usage.output_tokens if available
					// console.log("Message stop event:", event);
				}

				if (responseParts.length > 0 || turnComplete) {
					// Construct ADK Content for the response
					let adkContent: Content | undefined;
					const finalParts: Part[] = [];

					if (accumulatedText.trim()) {
						finalParts.push({ text: accumulatedText.trim() });
					}
					finalParts.push(
						...accumulatedToolCallParts.filter((tcp) =>
							responseParts.some((rp) => rp === tcp),
						),
					); // Only include current chunk's tools

					if (finalParts.length > 0) {
						adkContent = { role: "model", parts: finalParts };
					}

					this.responseCallback?.(
						new LLMResponse({
							content: adkContent,
							is_partial: isPartial,
							turn_complete: turnComplete,
							raw_response: event,
						}),
					);

					if (turnComplete) {
						// Update conversation history for the next turn
						const assistantResponseContent: ContentBlockParam[] = [];
						if (accumulatedText.trim()) {
							assistantResponseContent.push({
								type: "text",
								text: accumulatedText.trim(),
							});
						}
						accumulatedToolCallParts.forEach((fcp) => {
							assistantResponseContent.push({
								type: "tool_use",
								id: fcp.functionCall.id!,
								name: fcp.functionCall.name,
								input: fcp.functionCall.args,
							} as ToolUseBlockParam);
						});

						if (assistantResponseContent.length > 0) {
							this.messages.push({
								role: "assistant",
								content: assistantResponseContent,
							});
						}

						// Reset for next message
						accumulatedText = "";
						accumulatedToolCallParts.length = 0;
						currentTurnToolUses = {};
					} else {
						// If only text was streamed and it's partial, clear accumulated for next delta
						if (
							finalParts.some((p) => "text" in p) &&
							!finalParts.some((p) => "functionCall" in p)
						) {
							// Don't clear accumulatedText if it's genuinely accumulating across deltas.
							// Only clear parts that were just sent.
						}
						// Clear only the tool calls that were part of this specific chunk from accumulatedToolCallParts
						// This logic is getting complex; ideally stream yields discrete parts.
					}
				}
			}

			if (this.endCallback) {
				this.endCallback();
			}
		} catch (error) {
			this.triggerError(error as Error);
			if (this.endCallback) {
				this.endCallback();
			}
		}
	}
}
