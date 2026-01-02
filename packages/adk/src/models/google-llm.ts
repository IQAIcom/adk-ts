import {
	type Content,
	type GenerateContentResponse,
	GoogleGenAI,
	type Part,
} from "@google/genai";
import { BaseLlm } from "./base-llm";
import type { BaseLLMConnection } from "./base-llm-connection";
import type { CacheMetadata } from "./cache-metadata";
import { GeminiContextCacheManager } from "./gemini-context-manager";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

const AGENT_ENGINE_TELEMETRY_TAG = "remote_reasoning_engine";
const AGENT_ENGINE_TELEMETRY_ENV_VARIABLE_NAME = "GOOGLE_CLOUD_AGENT_ENGINE_ID";

const RESOURCE_EXHAUSTED_POSSIBLE_FIX_MESSAGE = `
On how to mitigate this issue, please refer to:
`;

/**
 * Google LLM Variant enum
 */
enum GoogleLLMVariant {
	VERTEX_AI = "VERTEX_AI",
	GEMINI_API = "GEMINI_API",
}

class ResourceExhaustedError extends Error {
	code: number;
	details: any;
	response: any;

	constructor(originalError: any) {
		const baseMessage = originalError.message || String(originalError);
		super(`${RESOURCE_EXHAUSTED_POSSIBLE_FIX_MESSAGE}\n\n${baseMessage}`);
		this.name = "ResourceExhaustedError";
		this.code = originalError.code || 429;
		this.details = originalError.details;
		this.response = originalError.response;
	}
}

/**
 * Streaming response aggregator for handling partial responses
 */
class StreamingResponseAggregator {
	private thoughtText = "";
	private text = "";
	private lastUsageMetadata: any = null;

	async *processResponse(
		response: GenerateContentResponse,
	): AsyncGenerator<LlmResponse, void, unknown> {
		const llmResponse = LlmResponse.create(response);
		this.lastUsageMetadata = llmResponse.usageMetadata;

		if (llmResponse.content?.parts?.[0]?.text) {
			const part0 = llmResponse.content.parts[0];
			if ((part0 as any).thought) {
				this.thoughtText += part0.text;
			} else {
				this.text += part0.text;
			}
			llmResponse.partial = true;
		} else if (
			(this.thoughtText || this.text) &&
			(!llmResponse.content ||
				!llmResponse.content.parts ||
				!this.hasInlineData(response))
		) {
			// Send accumulated text as a complete response
			const parts: Part[] = [];
			if (this.thoughtText) {
				parts.push({ text: this.thoughtText, thought: true } as Part);
			}
			if (this.text) {
				parts.push({ text: this.text });
			}

			yield new LlmResponse({
				content: { parts, role: "model" },
				usageMetadata: this.lastUsageMetadata,
			});

			this.thoughtText = "";
			this.text = "";
		}

		yield llmResponse;
	}

	close(): LlmResponse | null {
		if (this.text || this.thoughtText) {
			const parts: Part[] = [];
			if (this.thoughtText) {
				parts.push({ text: this.thoughtText, thought: true } as Part);
			}
			if (this.text) {
				parts.push({ text: this.text });
			}

			const finalResponse = new LlmResponse({
				content: {
					parts,
					role: "model",
				},
				usageMetadata: this.lastUsageMetadata,
			});

			this.thoughtText = "";
			this.text = "";

			return finalResponse;
		}
		return null;
	}

	private hasInlineData(response: GenerateContentResponse): boolean {
		const parts = response.candidates?.[0]?.content?.parts;
		return parts?.some((part) => (part as any)?.inlineData) || false;
	}
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
			"google/.*",
			"projects/.+/locations/.+/endpoints/.+",
			"projects/.+/locations/.+/publishers/google/models/gemini.+",
		];
	}

	protected async *generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		this.preprocessRequest(llmRequest);

		// Ensure model is set on the request for downstream components (like cache manager)
		if (!llmRequest.model) {
			llmRequest.model = this.model;
		}

		let cacheMetadata: CacheMetadata | null = null;
		let cacheManager: GeminiContextCacheManager | null = null;

		if (llmRequest.cacheConfig) {
			this.logger.debug("Handling context caching");
			cacheManager = new GeminiContextCacheManager(this.apiClient, this.logger);
			cacheMetadata = await cacheManager.handleContextCaching(llmRequest);

			if (cacheMetadata) {
				if (cacheMetadata.cacheName) {
					this.logger.debug(`Using cache: ${cacheMetadata.cacheName}`);
				} else {
					this.logger.debug("Cache fingerprint only, no active cache");
				}
			}
		}

		const model = llmRequest.model || this.model;
		const contents = this.convertContents(llmRequest.contents || []);
		const config = llmRequest.config;

		this.logger.info(
			`Sending request to model: ${model}, backend: ${this.apiBackend}, stream: ${stream}`,
		);

		try {
			if (stream) {
				const responses = await this.apiClient.models.generateContentStream({
					model,
					contents,
					config,
				});

				const aggregator = new StreamingResponseAggregator();

				for await (const resp of responses) {
					for await (const llmResponse of aggregator.processResponse(resp)) {
						yield llmResponse;
					}
				}

				// Get final aggregated response
				const closeResult = aggregator.close();
				if (closeResult) {
					// Populate cache metadata in the final aggregated response for streaming
					if (cacheMetadata && cacheManager) {
						cacheManager.populateCacheMetadataInResponse(
							closeResult,
							cacheMetadata,
						);
					}
					yield closeResult;
				}
			} else {
				const response = await this.apiClient.models.generateContent({
					model,
					contents,
					config,
				});

				this.logger.info("Response received from model");
				this.logger.debug(
					`Google response: ${response.usageMetadata?.candidatesTokenCount || 0} tokens`,
				);

				const llmResponse = LlmResponse.create(response);

				if (cacheMetadata && cacheManager) {
					cacheManager.populateCacheMetadataInResponse(
						llmResponse,
						cacheMetadata,
					);
				}

				yield llmResponse;
			}
		} catch (error: any) {
			// Enhance 429 errors with helpful guidance
			if (error.code === 429 || error.status === 429) {
				throw new ResourceExhaustedError(error);
			}
			throw error;
		}
	}

	/**
	 * Connects to the Gemini model and returns an llm connection.
	 */
	override connect(_llmRequest: LlmRequest): BaseLLMConnection {
		throw new Error(`Live connection is not supported for ${this.model}.`);
	}

	/**
	 * Convert LlmRequest contents to GoogleGenAI format
	 */
	private convertContents(contents: any[]): Content[] {
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
