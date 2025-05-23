import {
	type GenerateContentConfig,
	type GenerateContentParameters,
	GoogleGenAI,
	type GoogleGenAIOptions,
	type Part,
} from "@google/genai";
import { BaseLLM } from "./base-llm";
import type { LLMRequest, Message, MessageRole } from "./llm-request";
import { LLMResponse } from "./llm-response";

/**
 * Google Gemini LLM configuration
 */
export interface GoogleLLMConfig {
	/**
	 * Google Cloud Project ID (can be provided via GOOGLE_CLOUD_PROJECT env var)
	 */
	projectId?: string;

	/**
	 * Google Cloud location (can be provided via GOOGLE_CLOUD_LOCATION env var)
	 */
	location?: string;

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
		maxOutputTokens?: number;
	};
}

/**
 * Google Gemini LLM implementation
 */
export class GoogleLLM extends BaseLLM {
	/**
	 * Generative model instance
	 */
	private ai: GoogleGenAI;

	/**
	 * Default parameters for requests
	 */
	private defaultParams: Record<string, any>;

	/**
	 * Constructor for GoogleLLM
	 */
	constructor(model: string, config?: GoogleLLMConfig) {
		super(model);

		// Get configuration from environment or passed config
		const apiKey = process.env.GOOGLE_API_KEY;

		// Get vertex configuration from environment or passed config
		const projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT;
		const location = config?.location || process.env.GOOGLE_CLOUD_LOCATION;
		const useVertexAI = process.env.USE_VERTEX_AI?.toLowerCase() === "true";

		// Validate configurations
		if (!useVertexAI && !apiKey) {
			throw new Error(
				"Google API Key is required. Provide via config or GOOGLE_API_KEY env var.",
			);
		}

		if (useVertexAI && (!projectId || !location)) {
			throw new Error(
				"Google Cloud Project ID and Location are required when using Vertex AI.",
			);
		}

		// Prepare options based on authentication method
		let options: GoogleGenAIOptions;

		if (useVertexAI) {
			options = {
				vertexai: true,
				project: projectId,
				location,
			};
		} else {
			options = {
				apiKey,
			};
		}

		// Create Google GenAI instance
		this.ai = new GoogleGenAI(options);

		// Store default parameters with fallbacks
		this.defaultParams = {
			temperature: config?.defaultParams?.temperature ?? 0.7,
			topP: config?.defaultParams?.top_p ?? 1,
			maxOutputTokens: config?.defaultParams?.maxOutputTokens ?? 1024,
		};
	}

	/**
	 * Returns a list of supported models in regex for LLMRegistry
	 */
	static supportedModels(): string[] {
		return [
			// Gemini models
			"gemini-.*",
		];
	}
	/**
	 * Convert a message to Google Vertex AI format
	 */
	private convertMessage(message: Message): any {
		const googleRole = this.mapRole(message.role);
		const parts: Part[] = []; // Use the imported Part type

		// Case 1: This is a tool result being sent back to the model
		if (googleRole === "function") {
			// ADK 'tool' Message should have 'name' and 'content' (stringified JSON result).
			// 'tool_call_id' from ADK message isn't directly used in Gemini's functionResponse part,
			// but the 'name' is crucial.
			if (
				typeof message.name !== "string" ||
				typeof message.content !== "string"
			) {
				const errorMsg = `ADK 'tool' message for Gemini requires 'name' (string) and 'content' (stringified JSON result). Received: name=${message.name}, content type=${typeof message.content}`;
				console.error(errorMsg, message);
				// Return a part that indicates an error, or handle as per your error strategy
				parts.push({ text: `Error processing tool result: ${errorMsg}` });
				return { role: googleRole, parts };
			}
			try {
				parts.push({
					functionResponse: {
						name: message.name, // The name of the function that was called
						response: JSON.parse(message.content), // The result, parsed into an object
					},
				});
			} catch (e: any) {
				const errorMsg = `Tool content for function '${message.name}' is not valid JSON: ${message.content}. Error: ${e.message}`;
				console.error(errorMsg, message);
				// Send the error back as part of the response to the model
				parts.push({
					functionResponse: {
						name: message.name,
						response: { error: errorMsg, originalContent: message.content },
					},
				});
			}
		}
		// Case 2: This is the assistant's request to call one or more tools
		else if (
			message.role === "assistant" &&
			message.tool_calls &&
			message.tool_calls.length > 0
		) {
			// If the assistant provided any text alongside the tool call request
			if (
				typeof message.content === "string" &&
				message.content.trim() !== ""
			) {
				parts.push({ text: message.content });
			}
			// Add each tool call as a functionCall part
			for (const toolCall of message.tool_calls) {
				let argsObject = {};
				try {
					if (
						toolCall.function.arguments &&
						typeof toolCall.function.arguments === "string"
					) {
						argsObject = JSON.parse(toolCall.function.arguments);
					} else if (typeof toolCall.function.arguments === "object") {
						// If arguments are already an object (less common for string-based LLM outputs)
						argsObject = toolCall.function.arguments;
					}
				} catch (e: any) {
					console.warn(
						`Failed to parse tool arguments for ${toolCall.function.name}, using empty object. Args: ${toolCall.function.arguments}. Error: ${e.message}`,
					);
				}
				parts.push({
					functionCall: {
						name: toolCall.function.name,
						args: argsObject,
					},
				});
			}
		}
		// Case 3: Standard user message or assistant's simple text response (or multimodal content)
		else {
			if (Array.isArray(message.content)) {
				for (const part of message.content) {
					if (part.type === "text") {
						parts.push({ text: part.text });
					} else if (part.type === "image" && part.image_url) {
						// Ensure image_url is treated as an object if it might be a string
						const imageUrlObject =
							typeof part.image_url === "string"
								? { url: part.image_url, mime_type: "image/jpeg" } // Provide a default mime_type
								: part.image_url;

						parts.push({
							inlineData: {
								data: imageUrlObject.url.startsWith("data:")
									? imageUrlObject.url.split(",")[1]
									: Buffer.from(imageUrlObject.url).toString("base64"),
							},
						});
					}
				}
			} else if (typeof message.content === "string") {
				parts.push({ text: message.content });
			} else if (
				message.content === null &&
				(googleRole === "user" || googleRole === "model")
			) {
				// Handle null content for user/model roles by sending an empty text part,
				// as Gemini expects parts to be non-empty.
				parts.push({ text: "" });
			}
		}

		// Gemini API requires the parts array to be non-empty for 'user' and 'model' roles.
		// If parts is still empty here for such roles, and it's not a structured call/response, add an empty text part.
		if (
			parts.length === 0 &&
			(googleRole === "user" ||
				(googleRole === "model" &&
					(!message.tool_calls || message.tool_calls.length === 0)))
		) {
			if (
				message.content === null ||
				message.content === "" ||
				message.content === undefined
			) {
				parts.push({ text: "" });
			} else {
				// This might indicate an unhandled content type or an issue in the logic above.
				console.warn(
					`Message for role '${googleRole}' resulted in empty parts despite having content. Original message:`,
					JSON.stringify(message),
					"Adding an empty text part as a fallback.",
				);
				parts.push({ text: "" });
			}
		}

		return {
			role: googleRole,
			parts: parts,
		};
	}

	/**
	 * Map ADK role to Google role
	 */
	private mapRole(role: MessageRole): string {
		switch (role) {
			case "user":
				return "user";
			case "assistant":
			case "function":
			case "tool":
			case "model":
				return "model";
			case "system":
				return "user"; // Map system to user as we'll handle system messages separately
			default:
				return "user";
		}
	}

	/**
	 * Extract system message from messages array
	 */
	private extractSystemMessage(messages: Message[]): {
		systemMessage: string | null;
		filteredMessages: Message[];
	} {
		const systemMessages = messages.filter((msg) => msg.role === "system");
		const filteredMessages = messages.filter((msg) => msg.role !== "system");

		// Combine all system messages into one if there are multiple
		let systemMessage: string | null = null;
		if (systemMessages.length > 0) {
			systemMessage = systemMessages
				.map((msg) =>
					typeof msg.content === "string"
						? msg.content
						: JSON.stringify(msg.content),
				)
				.join("\n");
		}

		return { systemMessage, filteredMessages };
	}

	/**
	 * Convert functions to Google function declarations
	 */
	private convertFunctionsToTools(functions: any[]): any[] {
		if (!functions || functions.length === 0) {
			return [];
		}

		return functions.map((func) => ({
			functionDeclarations: [
				{
					name: func.name,
					description: func.description,
					parameters: func.parameters,
				},
			],
		}));
	}

	/**
	 * Convert Google response to LLMResponse
	 */
	private convertResponse(response: any): LLMResponse {
		// Create base response
		const result = new LLMResponse({
			role: "assistant",
			content: null,
		});

		// Extract text content
		if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
			result.content = response.candidates[0].content.parts[0].text;
		}

		// Handle function calls
		if (response?.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
			const functionCall = response.candidates[0].content.parts[0].functionCall;

			result.function_call = {
				name: functionCall.name,
				arguments: JSON.stringify(functionCall.args || {}),
			};

			// Set tool_calls array too for newer format
			result.tool_calls = [
				{
					id: `google-${Date.now()}`,
					function: {
						name: functionCall.name,
						arguments: JSON.stringify(functionCall.args || {}),
					},
				},
			];
		}

		return result;
	}

	/**
	 * Generates content from the given request
	 */
	async *generateContentAsync(
		llmRequest: LLMRequest,
		stream = false,
	): AsyncGenerator<LLMResponse, void, unknown> {
		try {
			// Extract system message and filter it out from regular messages
			const { systemMessage, filteredMessages } = this.extractSystemMessage(
				llmRequest.messages,
			);

			// Convert remaining messages to Google format
			const messages = filteredMessages.map((msg) => this.convertMessage(msg));

			// Prepare generation config
			const generationConfig: GenerateContentConfig = {
				temperature:
					llmRequest.config.temperature ?? this.defaultParams.temperature,
				topP: llmRequest.config.top_p ?? this.defaultParams.topP,
				maxOutputTokens:
					llmRequest.config.max_tokens ?? this.defaultParams.maxOutputTokens,
				systemInstruction: systemMessage
					? {
							parts: [{ text: systemMessage }],
						}
					: undefined,
			};

			// Prepare tools if specified
			const tools = llmRequest.config.functions
				? this.convertFunctionsToTools(llmRequest.config.functions)
				: undefined;

			// Prepare chat request
			const requestOptions: GenerateContentParameters = {
				contents: messages,
				config: generationConfig,
				model: this.model,
			};

			// Add tools if available
			if (tools && tools.length > 0 && requestOptions.config) {
				requestOptions.config.tools = tools;
			}

			if (stream) {
				// Handle streaming
				const streamingResult =
					await this.ai.models.generateContentStream(requestOptions);

				for await (const chunk of streamingResult) {
					if (!chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
						continue;
					}
					const partialText =
						chunk.candidates[0]?.content?.parts[0]?.text || "";

					// Create partial response
					const partialResponse = new LLMResponse({
						content: partialText,
						role: "assistant",
						is_partial: true,
					});

					yield partialResponse;
				}
			} else {
				// Non-streaming request
				const response = await this.ai.models.generateContent(requestOptions);
				yield this.convertResponse(response);
			}
		} catch (error) {
			console.error("Error generating content from Google Gemini:", error);
			throw error;
		}
	}
}
