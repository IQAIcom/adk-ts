import { type GenerativeModel, VertexAI } from "@google-cloud/vertexai";
import type {
	LLMRequest,
	Content,
	Part,
	Role,
	TextPart,
	InlineDataPart,
	FunctionCallPart,
	FunctionResponsePart,
} from "../../../models/llm-request";
import type { FunctionDeclaration } from "../../../models/function-declaration";
import { LLMResponse } from "../../../models/llm-response";
import { BaseLLM } from "../../../models/base-llm";

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
	 * Vertex AI instance
	 */
	private vertex: VertexAI;

	/**
	 * Generative model instance
	 */
	private generativeModel: GenerativeModel;

	/**
	 * Default parameters for requests
	 */
	private defaultParams: Record<string, any>;

	/**
	 * Ensures the conversation history ends with a user message if the last one isn't, or starts with one.
	 * Google's Gemini API typically expects turns to alternate, often starting with a user turn.
	 */
	protected _maybeAppendUserContent(llmRequest: LLMRequest): void {
		// For Google, it's generally good practice to ensure the conversation doesn't end on a model turn
		// without a function call, as the model might expect a user response or function result.
		// However, strict alternation isn't always enforced if function calls are involved.
		// We will ensure the conversation starts with a user message if empty.
		if (llmRequest.contents.length === 0) {
			llmRequest.contents.push({ role: "user", parts: [{ text: "Hello." }] }); // Start with a user message
		}
		// Unlike Anthropic, we won't automatically add an empty user message if the last role isn't user,
		// as Gemini might be awaiting a function response which comes as a 'function' role content from ADK.
	}

	/**
	 * Constructor for GoogleLLM
	 */
	constructor(model: string, config?: GoogleLLMConfig) {
		super(model);

		// Get configuration from environment or passed config
		const projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT;
		const location =
			config?.location || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

		if (!projectId) {
			throw new Error(
				"Google Cloud Project ID is required. Provide via config or GOOGLE_CLOUD_PROJECT env var.",
			);
		}

		// Create Vertex AI instance
		this.vertex = new VertexAI({ project: projectId, location });

		// Create generative model instance
		this.generativeModel = this.vertex.getGenerativeModel({
			model: this.model,
		});

		// Store default parameters
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
			"gemini-*",
		];
	}

	/**
	 * Map ADK role to Google role
	 */
	private mapAdkRoleToGoogleRole(role: Role): "user" | "model" | "function" {
		switch (role) {
			case "user":
				return "user";
			case "model": // ADK 'model' (assistant/LLM responses) maps to Google 'model'
				return "model";
			case "function": // ADK 'function' role (for function responses from tools) maps to Google 'function' role Content
				return "function";
			default: {
				// This case should not be reached if Role is strictly typed
				const exhaustiveCheck: never = role;
				console.warn(
					`[GoogleLLM] Unknown ADK role: ${exhaustiveCheck}, defaulting to user.`,
				);
				return "user";
			}
		}
	}

	/**
	 * Convert functions to Google function declarations
	 */
	private convertAdkFunctionsToGoogleTools(
		functions: FunctionDeclaration[],
	): any[] {
		// Return type should be VertexAI.Tool[] from SDK
		if (!functions || functions.length === 0) {
			return [];
		}
		// Google expects a top-level Tool array, each tool containing functionDeclarations
		return [
			{
				functionDeclarations: functions.map((func) => ({
					name: func.name,
					description: func.description,
					parameters: func.parameters, // This should be JSONSchema7 from FunctionDeclaration
				})),
			},
		];
	}

	/**
	 * Convert Google response to LLMResponse
	 */
	private convertGoogleResponseToAdkResponse(response: any): LLMResponse {
		// response: GenerateContentResponse from @google-cloud/vertexai
		// Create base response - content will be built from parts
		const adkParts: Part[] = [];
		let adkRole: Role = "model"; // Default for model's response turn

		if (response?.candidates?.length > 0) {
			const candidate = response.candidates[0];
			if (candidate.content?.parts) {
				// Google's candidate.content.role is the role of that specific content block (e.g. 'model')
				adkRole = candidate.content.role
					? this.mapGoogleRoleToAdkRole(candidate.content.role)
					: "model";

				for (const part of candidate.content.parts) {
					if (part.text) {
						adkParts.push({ text: part.text });
					} else if (part.inlineData?.data && part.inlineData?.mimeType) {
						adkParts.push({
							inlineData: {
								mimeType: part.inlineData.mimeType,
								data: part.inlineData.data,
							},
						});
					} else if (part.functionCall?.name) {
						// Ensure name exists for a valid function call
						adkParts.push({
							functionCall: {
								name: part.functionCall.name,
								args: part.functionCall.args || {},
							},
						});
						// The ADK Content role should be 'model' when it contains a functionCall from the LLM.
						adkRole = "model";
					} else if (part.functionResponse?.name) {
						// Ensure name exists for a valid function response
						// This is for when the ADK is *processing* a response that contains a functionResponse part.
						// Normally, an LLMResponse will contain functionCall, not functionResponse.
						adkParts.push({
							functionResponse: {
								name: part.functionResponse.name,
								response: part.functionResponse.response || {},
							},
						});
						// If the model somehow returns a function response directly, ADK role might be 'function'.
						// This is unusual. The overall LLMResponse content role should be 'model'.
						// We'll stick to adkRole = "model" as this is the LLM's turn.
					}
				}
			}
		}

		// Ensure there's at least one part if adkParts is empty but there was a candidate.
		// This maintains a valid Content structure {role, parts[]}.
		if (adkParts.length === 0 && response?.candidates?.length > 0) {
			adkParts.push({ text: "" }); // Default empty text part
		}

		return new LLMResponse({
			content:
				adkParts.length > 0 ? { role: adkRole, parts: adkParts } : undefined,
			raw_response: response,
			// TODO: Map stop reason (candidate.finishReason), token counts (response.usageMetadata), etc.
		});
	}

	/**
	 * Maps Google's content role to ADK's Role.
	 */
	private mapGoogleRoleToAdkRole(googleRole: string): Role {
		switch (googleRole.toLowerCase()) {
			case "user":
				return "user";
			case "model":
				return "model";
			case "function":
				return "function";
			default:
				console.warn(
					`[GoogleLLM] Unknown Google role: ${googleRole}, defaulting to model.`,
				);
				return "model";
		}
	}

	/**
	 * Generates content from the given request
	 */
	async *generateContentAsync(
		llmRequest: LLMRequest,
		stream = false,
	): AsyncGenerator<LLMResponse, void, unknown> {
		this._maybeAppendUserContent?.(llmRequest);

		// Convert ADK Contents to Google SDK Content objects
		const googleContents: any[] = llmRequest.contents.map(
			(adkContent: Content) => {
				const googleRole = this.mapAdkRoleToGoogleRole(adkContent.role);
				const googleParts: any[] = []; // VertexAI.Part[]

				for (const part of adkContent.parts) {
					if ("text" in part) {
						googleParts.push({ text: (part as TextPart).text });
					} else if ("inlineData" in part) {
						const idPart = part as InlineDataPart;
						googleParts.push({
							inlineData: {
								mimeType: idPart.inlineData.mimeType,
								data: idPart.inlineData.data,
							},
						});
					} else if ("functionCall" in part) {
						// A functionCall part from ADK model (e.g. from a previous model response)
						// should be transformed into a `tool_code` or similar if being sent *to* the model.
						// However, Google expects `functionCall` from the model's *response*.
						// If this is part of the history *sent to* Google, it implies the model previously made a call.
						// This would be represented as a 'model' role content with that functionCall part.
						const fcPart = part as FunctionCallPart;
						googleParts.push({
							functionCall: {
								// This structure is for *model output* in Google, ensure it's correct for input if needed.
								name: fcPart.functionCall.name,
								args: fcPart.functionCall.args,
							},
						});
					} else if ("functionResponse" in part) {
						// This is a response from a tool, to be sent to the model.
						const frPart = part as FunctionResponsePart;
						googleParts.push({
							functionResponse: {
								name: frPart.functionResponse.name,
								response: {
									// Google expects the 'content' of the function response to be the actual response data.
									// ADK stores this in frPart.functionResponse.response.
									// Ensure this is correctly structured. If frPart.functionResponse.response is already the content obj:
									name: frPart.functionResponse.name, // Name is repeated by Google here for clarity
									content: frPart.functionResponse.response,
								},
							},
						});
					}
				}
				return { role: googleRole, parts: googleParts };
			},
		);

		try {
			// Prepare generation config
			const generationConfig = {
				temperature:
					llmRequest.config.temperature ?? this.defaultParams.temperature,
				topP: llmRequest.config.top_p ?? this.defaultParams.topP,
				maxOutputTokens:
					llmRequest.config.max_tokens ?? this.defaultParams.maxOutputTokens,
			};

			// Prepare tools if specified
			const tools = llmRequest.config.functions
				? this.convertAdkFunctionsToGoogleTools(llmRequest.config.functions)
				: undefined;

			// Prepare chat request
			const requestOptions: any = {
				contents: googleContents,
				generationConfig,
			};

			// Add tools if available
			if (tools && tools.length > 0) {
				requestOptions.tools = tools;
			}

			if (stream) {
				// Handle streaming
				const streamingResult =
					await this.generativeModel.generateContentStream(requestOptions);

				for await (const chunk of streamingResult.stream) {
					// In streaming, each chunk is a GenerateContentResponse
					// We need to convert this chunk to an ADK LLMResponse
					// The convertGoogleResponseToAdkResponse method is designed for this.
					const adkChunkResponse =
						this.convertGoogleResponseToAdkResponse(chunk);

					// Ensure is_partial is set correctly for streaming chunks.
					// The final chunk from the stream might not be distinguishable here without looking at finishReason.
					// For simplicity, mark all stream chunks as partial unless convertGoogleResponseToAdkResponse handles it.
					// (convertGoogleResponseToAdkResponse currently doesn't set is_partial or turn_complete)
					yield new LLMResponse({
						...adkChunkResponse,
						is_partial: true, // Mark intermediate stream chunks as partial
						turn_complete: false, // Turn is not complete until the stream ends
					});
				}

				// Final response handling for function calls which may only be in the final aggregated response
				const finalResponse = await streamingResult.response;
				// The final aggregated response should indicate completion.
				yield new LLMResponse({
					...this.convertGoogleResponseToAdkResponse(finalResponse),
					is_partial: false,
					turn_complete: true,
				});
			} else {
				// Non-streaming request
				const response =
					await this.generativeModel.generateContent(requestOptions);
				yield this.convertGoogleResponseToAdkResponse(response);
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error("Error generating content with Google:", error.message);
				yield new LLMResponse({
					content: { role: "model", parts: [{ text: error.message }] },
					error_message: error.message,
				});
			} else {
				console.error("Unknown error generating content with Google:", error);
				yield new LLMResponse({
					content: {
						role: "model",
						parts: [{ text: "Unknown error generating content" }],
					},
					error_message: "Unknown error",
				});
			}
		}
	}
}
