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
		let parts: Part[] = [];

		if (message.role === "tool") {
			// This is an ADK 'tool' message (a result from a tool)
			if (googleRole !== "function") {
				console.error(
					`[GoogleLLM] convertMessage: ADK 'tool' role was expected to map to Google 'function' role, but mapped to '${googleRole}'. This is a configuration error in mapRole.`,
					message,
				);
				// Create an error part to send to the model
				parts.push({
					functionResponse: {
						name: message.name || "unknown_function_error",
						response: {
							error: "Internal SDK error: Tool role mapping failed.",
							originalContent: message.content,
						},
					},
				});
			} else if (
				typeof message.name !== "string" ||
				typeof message.content !== "string"
			) {
				const errorMsg = `ADK 'tool' message (for Google 'function' role) requires 'name' (string) and 'content' (stringified JSON result). Received: name=${message.name}, content type=${typeof message.content}`;
				console.error(
					"[GoogleLLM] convertMessage - ERROR in tool message structure:",
					errorMsg,
					message,
				);
				parts.push({
					functionResponse: {
						name: message.name || "unknown_function_error",
						response: { error: errorMsg, originalContent: message.content },
					},
				});
			} else {
				try {
					parts.push({
						functionResponse: {
							name: message.name,
							response: JSON.parse(message.content), // The result, parsed into an object
						},
					});
				} catch (e: any) {
					const errorMsg = `Tool content for function '${message.name}' is not valid JSON: ${message.content}. Error: ${e.message}`;
					console.error(
						"[GoogleLLM] convertMessage - ERROR parsing tool content:",
						errorMsg,
						message,
					);
					parts.push({
						functionResponse: {
							name: message.name,
							response: { error: errorMsg, originalContent: message.content },
						},
					});
				}
			}
		} else if (message.role === "assistant") {
			// This is an ADK 'assistant' message (model's turn, might include requests for tool calls)
			// If the assistant provided any text alongside the tool call request
			if (
				typeof message.content === "string" &&
				message.content.trim() !== ""
			) {
				parts.push({ text: message.content });
			}
			// Add each tool call as a functionCall part
			if (message.tool_calls && message.tool_calls.length > 0) {
				for (const toolCall of message.tool_calls) {
					let argsObject = {};
					try {
						if (
							toolCall.function.arguments &&
							typeof toolCall.function.arguments === "string"
						) {
							argsObject = JSON.parse(toolCall.function.arguments);
						} else if (typeof toolCall.function.arguments === "object") {
							argsObject = toolCall.function.arguments; // Already an object
						}
					} catch (e: any) {
						console.warn(
							`[GoogleLLM] Failed to parse tool arguments for ${toolCall.function.name}, using empty object. Args: ${toolCall.function.arguments}. Error: ${e.message}`,
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
			// If an assistant message has no text content and no tool_calls,
			// ensure there's at least an empty text part if the content was explicitly null or empty.
			// Gemini expects 'model' role to have parts.
			if (parts.length === 0) {
				parts.push({
					text: typeof message.content === "string" ? message.content : "",
				});
			}
		} else if (message.role === "user" || message.role === "system") {
			// Standard user message, or system message (which gets mapped to 'user' role for contents)
			if (Array.isArray(message.content)) {
				for (const part of message.content) {
					if (part.type === "text") {
						parts.push({ text: part.text });
					} else if (part.type === "image" && part.image_url) {
						const imageUrlObject =
							typeof part.image_url === "string"
								? { url: part.image_url, mime_type: "image/jpeg" }
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
			// Ensure parts array is not empty for user/model roles if no specific content was pushed
			if (parts.length === 0) {
				parts.push({ text: "" });
			}
		} else {
			// Fallback for any unexpected ADK message roles
			console.warn(
				`[GoogleLLM] convertMessage: Unhandled ADK message role '${message.role}'. Treating as simple text.`,
			);
			parts.push({
				text:
					typeof message.content === "string"
						? message.content
						: JSON.stringify(message.content),
			});
		}

		// Final safety check: Gemini API requires the parts array to be non-empty for 'user' and 'model' roles.
		// For 'function' role, it must contain exactly one 'functionResponse' part.
		if (
			parts.length === 0 &&
			(googleRole === "user" || googleRole === "model")
		) {
			console.warn(
				`[GoogleLLM] convertMessage - Parts array was empty for googleRole '${googleRole}' (ADK role '${message.role}'). Adding empty text part. Message:`,
				JSON.stringify(message),
			);
			parts.push({ text: "" });
		}
		// Ensure function role has exactly one functionResponse part
		if (
			googleRole === "function" &&
			(parts.length !== 1 || !parts[0]?.functionResponse)
		) {
			console.error(
				`[GoogleLLM] convertMessage - Invalid parts for 'function' role. Expected 1 functionResponse part. Got:`,
				JSON.stringify(parts),
				"Original ADK message:",
				JSON.stringify(message),
			);
			// Overwrite parts with a structured error if this critical condition is met
			parts = [
				{
					functionResponse: {
						name: message.name || "unknown_function_structure_error",
						response: {
							error:
								"Internal SDK error: Invalid parts structure for function response.",
						},
					},
				},
			];
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
				return "model";
			case "tool":
				return "function";
			case "system":
				// System messages are handled by extracting them and putting them
				// into the 'systemInstruction' field of the request.
				// If they were to be part of 'contents', 'user' is often the role.
				return "user";
			default:
				console.warn(
					`[GoogleLLM] mapRole: Unknown ADK role '${role}', defaulting to 'user'.`,
				);
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
					parameters: this.filterGoogleUnsupportedProperties(func.parameters),
				},
			],
		}));
	}

	/**
	 * Filters out JSON Schema properties that Google Gemini doesn't support
	 */
	private filterGoogleUnsupportedProperties(schema: any): any {
		if (!schema || typeof schema !== "object") {
			return schema;
		}

		// Create a copy without unsupported properties using destructuring
		const { exclusiveMinimum, exclusiveMaximum, ...filtered } = schema;

		// Recursively filter properties if this is an object schema
		if (filtered.properties && typeof filtered.properties === "object") {
			filtered.properties = { ...filtered.properties };
			for (const [key, value] of Object.entries(filtered.properties)) {
				filtered.properties[key] =
					this.filterGoogleUnsupportedProperties(value);
			}
		}

		// Recursively filter items if this is an array schema
		if (filtered.items) {
			filtered.items = this.filterGoogleUnsupportedProperties(filtered.items);
		}

		// Handle anyOf, oneOf, allOf
		if (filtered.anyOf && Array.isArray(filtered.anyOf)) {
			filtered.anyOf = filtered.anyOf.map((item: any) =>
				this.filterGoogleUnsupportedProperties(item),
			);
		}
		if (filtered.oneOf && Array.isArray(filtered.oneOf)) {
			filtered.oneOf = filtered.oneOf.map((item: any) =>
				this.filterGoogleUnsupportedProperties(item),
			);
		}
		if (filtered.allOf && Array.isArray(filtered.allOf)) {
			filtered.allOf = filtered.allOf.map((item: any) =>
				this.filterGoogleUnsupportedProperties(item),
			);
		}

		return filtered;
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

		// Check if text is a string (even if empty)
		if (
			typeof response?.candidates?.[0]?.content?.parts?.[0]?.text === "string"
		) {
			result.content = response.candidates[0].content.parts[0].text;
		}

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
