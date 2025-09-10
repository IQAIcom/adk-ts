import {
	type Content,
	FinishReason,
	type GenerateContentResponse,
	GoogleGenAI,
	type Part,
} from "@google/genai";
import { BaseLlm } from "./base-llm";
import type { BaseLLMConnection } from "./base-llm-connection";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

const AGENT_ENGINE_TELEMETRY_TAG = "remote_reasoning_engine";
const AGENT_ENGINE_TELEMETRY_ENV_VARIABLE_NAME = "GOOGLE_CLOUD_AGENT_ENGINE_ID";

/**
 * Google LLM Variant enum
 */
enum GoogleLLMVariant {
	VERTEX_AI = "VERTEX_AI",
	GEMINI_API = "GEMINI_API",
}

/**
 * Integration for Gemini models.
 */
export class GoogleLlm extends BaseLlm {
	private _apiClient?: GoogleGenAI;
	private _liveApiClient?: GoogleGenAI;
	private _apiBackend?: GoogleLLMVariant;
	private _trackingHeaders?: Record<string, string>;

	/**
	 * Constructor for Gemini
	 */
	constructor(model = "gemini-2.5-flash") {
		super(model);
	}

	/**
	 * Provides the list of supported models.
	 */
	static override supportedModels(): string[] {
		return [
			"gemini-.*",
			// fine-tuned vertex endpoint pattern
			"projects/.+/locations/.+/endpoints/.+",
			// vertex gemini long name
			"projects/.+/locations/.+/publishers/google/models/gemini.+",
		];
	}

	/**
	 * Main content generation method - handles both streaming and non-streaming
	 */
	protected async *generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		this.preprocessRequest(llmRequest);

		const model = llmRequest.model || this.model;
		const contents = this.convertContents(llmRequest.contents || []);
		const config = llmRequest.config;

		if (stream) {
			const responses = await this.apiClient.models.generateContentStream({
				model,
				contents,
				config,
			});

			let response: GenerateContentResponse | null = null;
			let thoughtText = "";
			let text = "";
			let usageMetadata: any = null;

			for await (const resp of responses) {
				response = resp; // Track the latest response
				const llmResponse = LlmResponse.create(resp);
				usageMetadata = llmResponse.usageMetadata;

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
						!this.hasInlineData(resp))
				) {
					// Yield merged content - equivalent to Python's types.ModelContent(parts=parts)
					const parts: Part[] = [];
					if (thoughtText) {
						parts.push({ text: thoughtText, thought: true } as Part);
					}
					if (text) {
						parts.push({ text });
					}

					yield new LlmResponse({
						content: {
							parts,
							role: "model",
						},
						usageMetadata,
					});
					thoughtText = "";
					text = "";
				}
				yield llmResponse;
			}

			// Final yield condition - equivalent to Python's final check
			if (
				(text || thoughtText) &&
				response &&
				response.candidates &&
				response.candidates[0]?.finishReason === FinishReason.STOP
			) {
				const parts: Part[] = [];
				if (thoughtText) {
					parts.push({ text: thoughtText, thought: true } as Part);
				}
				if (text) {
					parts.push({ text });
				}

				yield new LlmResponse({
					content: {
						parts,
						role: "model",
					},
					usageMetadata,
				});
			}
		} else {
			const response = await this.apiClient.models.generateContent({
				model,
				contents,
				config,
			});
			const llmResponse = LlmResponse.create(response);
			this.logger.debug(
				`Google response: ${llmResponse.usageMetadata?.candidatesTokenCount || 0} tokens`,
			);
			yield llmResponse;
		}
	}

	/**
	 * Connects to the Gemini model and returns an llm connection.
	 */
	override connect(_llmRequest: LlmRequest): BaseLLMConnection {
		// This would need to be implemented with proper connection handling
		// For now, throw an error as in the base class
		throw new Error(`Live connection is not supported for ${this.model}.`);
	}

	/**
	 * Check if response has inline data
	 */
	private hasInlineData(response: GenerateContentResponse): boolean {
		const parts = response.candidates?.[0]?.content?.parts;
		return parts?.some((part) => (part as any)?.inlineData) || false;
	}

	/**
	 * Convert LlmRequest contents to GoogleGenAI format
	 */
	private convertContents(contents: any[]): Content[] {
		// Convert from LlmRequest format to GoogleGenAI format
		return contents.map((content) => ({
			role: content.role === "assistant" ? "model" : content.role,
			parts: content.parts || [{ text: content.content || "" }],
		}));
	}

	/**
	 * Preprocesses the request based on the API backend.
	 */
	private preprocessRequest(llmRequest: LlmRequest): void {
		if (this.apiBackend === GoogleLLMVariant.GEMINI_API) {
			// Using API key from Google AI Studio doesn't support labels
			if (llmRequest.config) {
				(llmRequest.config as any).labels = undefined;
			}
			if (llmRequest.contents) {
				for (const content of llmRequest.contents) {
					if (!content.parts) continue;
					for (const part of content.parts) {
						this.removeDisplayNameIfPresent((part as any).inlineData);
						this.removeDisplayNameIfPresent((part as any).fileData);
					}
				}
			}
		}
	}

	/**
	 * Sets display_name to null for the Gemini API (non-Vertex) backend.
	 */
	private removeDisplayNameIfPresent(dataObj: any): void {
		if (dataObj?.displayName) {
			dataObj.displayName = null;
		}
	}

	/**
	 * Provides the api client.
	 */
	get apiClient(): GoogleGenAI {
		if (!this._apiClient) {
			// Check for environment variables first
			const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
			const apiKey = process.env.GOOGLE_API_KEY;
			const project = process.env.GOOGLE_CLOUD_PROJECT;
			const location = process.env.GOOGLE_CLOUD_LOCATION;

			if (useVertexAI && project && location) {
				this._apiClient = new GoogleGenAI({
					vertexai: true,
					project,
					location,
				});
			} else if (apiKey) {
				this._apiClient = new GoogleGenAI({
					apiKey,
				});
			} else {
				throw new Error(
					"Google API Key or Vertex AI configuration is required. " +
						"Set GOOGLE_API_KEY or GOOGLE_GENAI_USE_VERTEXAI=true with GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION.",
				);
			}
		}
		return this._apiClient;
	}

	/**
	 * Gets the API backend type.
	 */
	get apiBackend(): GoogleLLMVariant {
		if (!this._apiBackend) {
			// Check if using Vertex AI based on environment or client configuration
			const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
			this._apiBackend = useVertexAI
				? GoogleLLMVariant.VERTEX_AI
				: GoogleLLMVariant.GEMINI_API;
		}
		return this._apiBackend;
	}

	/**
	 * Gets the tracking headers.
	 */
	get trackingHeaders(): Record<string, string> {
		if (!this._trackingHeaders) {
			let frameworkLabel = "google-adk/1.0.0"; // Replace with actual version
			if (process.env[AGENT_ENGINE_TELEMETRY_ENV_VARIABLE_NAME]) {
				frameworkLabel = `${frameworkLabel}+${AGENT_ENGINE_TELEMETRY_TAG}`;
			}
			const languageLabel = `gl-node/${process.version}`;
			const versionHeaderValue = `${frameworkLabel} ${languageLabel}`;

			this._trackingHeaders = {
				"x-goog-api-client": versionHeaderValue,
				"user-agent": versionHeaderValue,
			};
		}
		return this._trackingHeaders;
	}

	/**
	 * Gets the live API version.
	 */
	get liveApiVersion(): string {
		return this.apiBackend === GoogleLLMVariant.VERTEX_AI
			? "v1beta1"
			: "v1alpha";
	}

	/**
	 * Gets the live API client.
	 */
	get liveApiClient(): GoogleGenAI {
		if (!this._liveApiClient) {
			const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
			const apiKey = process.env.GOOGLE_API_KEY;
			const project = process.env.GOOGLE_CLOUD_PROJECT;
			const location = process.env.GOOGLE_CLOUD_LOCATION;

			if (useVertexAI && project && location) {
				this._liveApiClient = new GoogleGenAI({
					vertexai: true,
					project,
					location,
					apiVersion: this.liveApiVersion,
				});
			} else if (apiKey) {
				this._liveApiClient = new GoogleGenAI({
					apiKey,
					apiVersion: this.liveApiVersion,
				});
			} else {
				throw new Error("API configuration required for live client");
			}
		}
		return this._liveApiClient;
	}
}
