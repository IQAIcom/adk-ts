import { Logger } from "@adk/helpers/logger";
import dedent from "dedent";
import OpenAI from "openai";
import { BaseLlm } from "./base-llm";
import type { BaseLLMConnection } from "./base-llm-connection";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

const logger = new Logger({ name: "OpenAiLlm" });

const NEW_LINE = "\n";

type OpenAIRole = "user" | "assistant" | "system";

/**
 * Convert ADK role to OpenAI role format
 */
function toOpenAiRole(role?: string): OpenAIRole {
	if (role === "model") {
		return "assistant";
	}
	if (role === "system") {
		return "system";
	}
	return "user";
}

/**
 * Convert OpenAI finish reason to ADK finish reason
 */
function toAdkFinishReason(
	openaiFinishReason?: string,
): "STOP" | "MAX_TOKENS" | "FINISH_REASON_UNSPECIFIED" {
	switch (openaiFinishReason) {
		case "stop":
		case "tool_calls":
			return "STOP";
		case "length":
			return "MAX_TOKENS";
		default:
			return "FINISH_REASON_UNSPECIFIED";
	}
}

/**
 * Convert ADK Part to OpenAI message content
 */
function partToOpenAiContent(part: any): OpenAI.ChatCompletionContentPart {
	if (part.text) {
		return {
			type: "text",
			text: part.text,
		};
	}

	if (part.inline_data?.mime_type && part.inline_data?.data) {
		return {
			type: "image_url",
			image_url: {
				url: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`,
			},
		};
	}

	throw new Error("Unsupported part type for OpenAI conversion");
}

/**
 * Convert ADK Content to OpenAI ChatCompletionMessage
 */
function contentToOpenAiMessage(
	content: any,
): OpenAI.ChatCompletionMessageParam {
	const role = toOpenAiRole(content.role);

	if (role === "system") {
		return {
			role: "system",
			content: content.parts?.[0]?.text || "",
		};
	}

	// Handle function calls
	if (content.parts?.some((part: any) => part.functionCall)) {
		const functionCallPart = content.parts.find(
			(part: any) => part.functionCall,
		);
		return {
			role: "assistant",
			tool_calls: [
				{
					id: functionCallPart.functionCall.id || "",
					type: "function",
					function: {
						name: functionCallPart.functionCall.name,
						arguments: JSON.stringify(functionCallPart.functionCall.args || {}),
					},
				},
			],
		};
	}

	// Handle function responses
	if (content.parts?.some((part: any) => part.functionResponse)) {
		const functionResponsePart = content.parts.find(
			(part: any) => part.functionResponse,
		);
		return {
			role: "tool",
			tool_call_id: functionResponsePart.functionResponse.id || "",
			content: JSON.stringify(
				functionResponsePart.functionResponse.response || {},
			),
		};
	}

	// Handle regular content
	if (content.parts?.length === 1 && content.parts[0].text) {
		return {
			role,
			content: content.parts[0].text,
		};
	}

	// Handle multi-part content
	return {
		role,
		content: (content.parts || []).map(partToOpenAiContent),
	};
}

/**
 * Convert OpenAI message to ADK LlmResponse
 */
function openAiMessageToLlmResponse(
	choice: OpenAI.ChatCompletion.Choice,
	usage?: OpenAI.CompletionUsage,
): LlmResponse {
	const message = choice.message;
	logger.debug("OpenAI response:", JSON.stringify({ message, usage }, null, 2));

	const parts: any[] = [];

	// Handle text content
	if (message.content) {
		parts.push({ text: message.content });
	}

	// Handle tool calls
	if (message.tool_calls) {
		for (const toolCall of message.tool_calls) {
			if (toolCall.type === "function") {
				parts.push({
					functionCall: {
						id: toolCall.id,
						name: toolCall.function.name,
						args: JSON.parse(toolCall.function.arguments || "{}"),
					},
				});
			}
		}
	}

	return new LlmResponse({
		content: {
			role: "model",
			parts,
		},
		usageMetadata: usage
			? {
					promptTokenCount: usage.prompt_tokens,
					candidatesTokenCount: usage.completion_tokens,
					totalTokenCount: usage.total_tokens,
				}
			: undefined,
		finishReason: toAdkFinishReason(choice.finish_reason),
	});
}

/**
 * Convert ADK function declaration to OpenAI tool
 */
function functionDeclarationToOpenAiTool(
	functionDeclaration: any,
): OpenAI.ChatCompletionTool {
	return {
		type: "function",
		function: {
			name: functionDeclaration.name,
			description: functionDeclaration.description || "",
			parameters: functionDeclaration.parameters || {},
		},
	};
}

/**
 * OpenAI LLM implementation using GPT models
 * Enhanced with comprehensive debug logging similar to Google LLM
 */
export class OpenAiLlm extends BaseLlm {
	private _client?: OpenAI;

	/**
	 * Constructor for OpenAI LLM
	 */
	constructor(model = "gpt-4o-mini") {
		super(model);
	}

	/**
	 * Provides the list of supported models
	 */
	static override supportedModels(): string[] {
		return ["gpt-3.5-.*", "gpt-4.*", "gpt-4o.*", "o1-.*", "o3-.*"];
	}

	protected async *generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		// Preprocess request
		this.preprocessRequest(llmRequest);

		logger.debug(
			`Sending OpenAI request, model: ${llmRequest.model || this.model}, stream: ${stream}`,
		);
		logger.debug(this.buildRequestLog(llmRequest));

		const model = llmRequest.model || this.model;
		const messages = (llmRequest.contents || []).map(contentToOpenAiMessage);

		let tools: OpenAI.ChatCompletionTool[] | undefined;
		if ((llmRequest.config?.tools?.[0] as any)?.functionDeclarations) {
			tools = (llmRequest.config.tools[0] as any).functionDeclarations.map(
				functionDeclarationToOpenAiTool,
			);
		}

		// Add system instruction as first message if provided
		const systemContent = llmRequest.getSystemInstructionText();
		if (systemContent) {
			messages.unshift({
				role: "system",
				content: systemContent,
			});
		}

		// Messages are already in OpenAI format from contentToOpenAiMessage
		const openAiMessages: OpenAI.ChatCompletionMessageParam[] = messages;

		const requestParams:
			| OpenAI.ChatCompletionCreateParamsNonStreaming
			| OpenAI.ChatCompletionCreateParamsStreaming = {
			model,
			messages: openAiMessages,
			tools,
			tool_choice: tools ? "auto" : undefined,
			max_tokens: llmRequest.config?.maxOutputTokens,
			temperature: llmRequest.config?.temperature,
			top_p: llmRequest.config?.topP,
			stream,
		};

		if (stream) {
			const streamResponse = await this.client.chat.completions.create({
				...requestParams,
				stream: true,
			});

			let thoughtText = "";
			let text = "";
			let usageMetadata: OpenAI.CompletionUsage | undefined;
			const accumulatedToolCalls: OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall[] =
				[];

			for await (const chunk of streamResponse) {
				const choice = chunk.choices[0];
				if (!choice) continue;

				const delta = choice.delta;
				logger.debug("Delta content:", delta.content);

				// Create LlmResponse for this chunk
				const llmResponse = this.createChunkResponse(delta, chunk.usage);
				if (chunk.usage) {
					usageMetadata = chunk.usage;
				}

				// Log each chunk response similar to Google LLM
				logger.debug(this.buildResponseLog(llmResponse));

				// Handle content accumulation similar to Google LLM
				if (llmResponse.content?.parts?.[0]?.text) {
					const part0 = llmResponse.content.parts[0];
					if ((part0 as any).thought) {
						thoughtText += part0.text;
					} else {
						text += part0.text;
					}
					llmResponse.partial = true;
				} else if (
					(thoughtText || text) &&
					(!llmResponse.content ||
						!llmResponse.content.parts ||
						!this.hasInlineData(llmResponse))
				) {
					// Yield merged content - equivalent to Google's pattern
					const parts: any[] = [];
					if (thoughtText) {
						parts.push({ text: thoughtText, thought: true });
					}
					if (text) {
						parts.push({ text });
					}

					yield new LlmResponse({
						content: {
							parts,
							role: "model",
						},
						usageMetadata: usageMetadata
							? {
									promptTokenCount: usageMetadata.prompt_tokens,
									candidatesTokenCount: usageMetadata.completion_tokens,
									totalTokenCount: usageMetadata.total_tokens,
								}
							: undefined,
					});
					thoughtText = "";
					text = "";
				}

				// Handle tool calls accumulation
				if (delta.tool_calls) {
					for (const toolCall of delta.tool_calls) {
						const index = toolCall.index || 0;
						if (!accumulatedToolCalls[index]) {
							accumulatedToolCalls[index] = {
								index,
								id: toolCall.id || "",
								type: "function",
								function: { name: "", arguments: "" },
							};
						}

						if (toolCall.function?.name) {
							accumulatedToolCalls[index].function!.name +=
								toolCall.function.name;
						}
						if (toolCall.function?.arguments) {
							accumulatedToolCalls[index].function!.arguments +=
								toolCall.function.arguments;
						}
					}
				}

				// Handle final response - similar to Google's finish reason handling
				if (choice.finish_reason) {
					const parts: any[] = [];

					// Add accumulated text content
					if (thoughtText) {
						parts.push({ text: thoughtText, thought: true });
					}
					if (text) {
						parts.push({ text });
					}

					// Add accumulated tool calls
					if (accumulatedToolCalls.length > 0) {
						for (const toolCall of accumulatedToolCalls) {
							if (toolCall.function?.name) {
								parts.push({
									functionCall: {
										id: toolCall.id,
										name: toolCall.function.name,
										args: JSON.parse(toolCall.function.arguments || "{}"),
									},
								});
							}
						}
					}

					const finalResponse = new LlmResponse({
						content: {
							role: "model",
							parts,
						},
						usageMetadata: usageMetadata
							? {
									promptTokenCount: usageMetadata.prompt_tokens,
									candidatesTokenCount: usageMetadata.completion_tokens,
									totalTokenCount: usageMetadata.total_tokens,
								}
							: undefined,
						finishReason: toAdkFinishReason(choice.finish_reason),
					});

					logger.debug(this.buildResponseLog(finalResponse));
					yield finalResponse;
				} else {
					// Yield partial response if we have content
					yield llmResponse;
				}
			}

			// Final yield condition - equivalent to Google's final check
			if ((text || thoughtText) && usageMetadata) {
				const parts: any[] = [];
				if (thoughtText) {
					parts.push({ text: thoughtText, thought: true });
				}
				if (text) {
					parts.push({ text });
				}

				yield new LlmResponse({
					content: {
						parts,
						role: "model",
					},
					usageMetadata: {
						promptTokenCount: usageMetadata.prompt_tokens,
						candidatesTokenCount: usageMetadata.completion_tokens,
						totalTokenCount: usageMetadata.total_tokens,
					},
				});
			}
		} else {
			const response = await this.client.chat.completions.create({
				...requestParams,
				stream: false,
			});

			const choice = response.choices[0];
			if (choice) {
				const llmResponse = openAiMessageToLlmResponse(choice, response.usage);
				logger.debug(this.buildResponseLog(llmResponse));
				yield llmResponse;
			}
		}
	}

	/**
	 * Create LlmResponse from streaming chunk - similar to Google's LlmResponse.create
	 */
	private createChunkResponse(
		delta: OpenAI.ChatCompletionChunk.Choice.Delta,
		usage?: OpenAI.CompletionUsage,
	): LlmResponse {
		const parts: any[] = [];

		// Handle text content
		if (delta.content) {
			const contentType = this.getContentType(delta.content);
			if (contentType === "thought") {
				parts.push({ text: delta.content, thought: true });
			} else {
				parts.push({ text: delta.content });
			}
		}

		// Handle tool calls in chunks (though usually they come complete)
		if (delta.tool_calls) {
			for (const toolCall of delta.tool_calls) {
				if (toolCall.type === "function" && toolCall.function?.name) {
					parts.push({
						functionCall: {
							id: toolCall.id || "",
							name: toolCall.function.name,
							args: JSON.parse(toolCall.function.arguments || "{}"),
						},
					});
				}
			}
		}

		return new LlmResponse({
			content:
				parts.length > 0
					? {
							role: "model",
							parts,
						}
					: undefined,
			usageMetadata: usage
				? {
						promptTokenCount: usage.prompt_tokens,
						candidatesTokenCount: usage.completion_tokens,
						totalTokenCount: usage.total_tokens,
					}
				: undefined,
		});
	}

	/**
	 * Detect content type for flow control
	 * This is a simplified implementation - you may need to adjust based on your specific requirements
	 */
	private getContentType(content: string): "thought" | "regular" {
		// Simple heuristic - you may want to implement more sophisticated logic
		// based on your specific use case and how you identify "thought" content

		// Example: if content starts with certain markers or patterns
		if (content.includes("<thinking>") || content.includes("[thinking]")) {
			return "thought";
		}

		// Default to regular content
		return "regular";
	}

	/**
	 * Check if response has inline data (similar to Google LLM)
	 */
	private hasInlineData(response: LlmResponse): boolean {
		// OpenAI doesn't typically return inline data in the same way as Google
		// but this method is here for consistency with the flow control pattern
		const parts = response.content?.parts;
		return parts?.some((part: any) => part.inlineData) || false;
	}

	/**
	 * Preprocess request similar to Google LLM
	 */
	private preprocessRequest(llmRequest: LlmRequest): void {
		// OpenAI-specific preprocessing can be added here
		// For example, handling specific content types or configurations

		// Remove any OpenAI-incompatible configurations
		if (llmRequest.config) {
			// OpenAI doesn't support labels like Google's Vertex AI
			(llmRequest.config as any).labels = undefined;

			// Handle any other OpenAI-specific preprocessing
			if (llmRequest.contents) {
				for (const content of llmRequest.contents) {
					if (!content.parts) continue;
					for (const part of content.parts) {
						// OpenAI-specific part preprocessing if needed
						this.preprocessPart(part);
					}
				}
			}
		}
	}

	/**
	 * Preprocess individual parts for OpenAI compatibility
	 */
	private preprocessPart(part: any): void {
		// Handle any part-specific preprocessing for OpenAI
		// For example, converting certain data formats or removing unsupported fields

		if (part.inline_data) {
			// Ensure inline data is in the correct format for OpenAI
			if (!part.inline_data.mime_type || !part.inline_data.data) {
				// biome-ignore lint/performance/noDelete: Remove invalid inline data
				delete part.inline_data;
			}
		}
	}

	/**
	 * Build request log string for debugging (similar to Google LLM)
	 */
	private buildRequestLog(req: LlmRequest): string {
		const functionDecls =
			(req.config?.tools?.[0] as any)?.functionDeclarations || [];

		const functionLogs =
			functionDecls.length > 0
				? functionDecls.map(
						(funcDecl: any) =>
							`${funcDecl.name}: ${JSON.stringify(funcDecl.parameters?.properties || {})}`,
					)
				: [];

		const contentsLogs =
			req.contents?.map((content) =>
				JSON.stringify(content, (key, value) => {
					// Exclude large data fields from logs
					if (
						key === "data" &&
						typeof value === "string" &&
						value.length > 100
					) {
						return "[EXCLUDED]";
					}
					return value;
				}),
			) || [];

		return dedent`
		LLM Request:
		-----------------------------------------------------------
		System Instruction:
		${req.getSystemInstructionText() || ""}
		-----------------------------------------------------------
		Contents:
		${contentsLogs.join(NEW_LINE)}
		-----------------------------------------------------------
		Functions:
		${functionLogs.join(NEW_LINE)}
		-----------------------------------------------------------`;
	}

	/**
	 * Build response log string for debugging (similar to Google LLM)
	 */
	private buildResponseLog(response: LlmResponse): string {
		const functionCallsText: string[] = [];

		if (response.content?.parts) {
			for (const part of response.content.parts) {
				if ((part as any).functionCall) {
					const funcCall = (part as any).functionCall;
					functionCallsText.push(
						`name: ${funcCall.name}, args: ${JSON.stringify(funcCall.args)}`,
					);
				}
			}
		}

		const text =
			response.content?.parts
				?.filter((part: any) => part.text)
				?.map((part: any) => part.text)
				?.join("") || "";

		return dedent`
		LLM Response:
		-----------------------------------------------------------
		Text:
		${text}
		-----------------------------------------------------------
		Function calls:
		${functionCallsText.join(NEW_LINE)}
		-----------------------------------------------------------
		Usage:
		${JSON.stringify(response.usageMetadata, null, 2)}
		-----------------------------------------------------------
		Finish Reason:
		${response.finishReason}
		-----------------------------------------------------------`;
	}

	/**
	 * Gets the OpenAI client
	 */
	private get client(): OpenAI {
		if (!this._client) {
			const apiKey = process.env.OPENAI_API_KEY;

			if (!apiKey) {
				throw new Error(
					"OPENAI_API_KEY environment variable is required for OpenAI models",
				);
			}

			this._client = new OpenAI({
				apiKey,
			});
		}
		return this._client;
	}

	/**
	 * Live connection is not supported for OpenAI models
	 */
	override connect(_llmRequest: LlmRequest): BaseLLMConnection {
		throw new Error(`Live connection is not supported for ${this.model}.`);
	}
}
