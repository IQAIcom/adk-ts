import { Logger } from "../../logger";
import type { EmbeddingProvider } from "../types";

/**
 * Configuration for OpenRouter embedding provider
 */
export interface OpenRouterEmbeddingProviderConfig {
	/**
	 * OpenRouter API key. If not provided, uses OPENROUTER_API_KEY env var.
	 */
	apiKey?: string;

	/**
	 * Model to use for embeddings.
	 * OpenRouter supports various embedding models from different providers.
	 *
	 * Popular options:
	 * - "openai/text-embedding-3-small" (1536 dimensions)
	 * - "openai/text-embedding-3-large" (3072 dimensions)
	 * - "openai/text-embedding-ada-002" (1536 dimensions)
	 * - "cohere/embed-english-v3.0" (1024 dimensions)
	 * - "cohere/embed-multilingual-v3.0" (1024 dimensions)
	 *
	 * @default "openai/text-embedding-3-small"
	 */
	model?: string;

	/**
	 * Override the embedding dimensions.
	 * If not provided, will be inferred from the model.
	 */
	dimensions?: number;

	/**
	 * Base URL for the OpenRouter API.
	 * @default "https://openrouter.ai/api/v1"
	 */
	baseUrl?: string;

	/**
	 * Optional site URL for OpenRouter analytics.
	 */
	siteUrl?: string;

	/**
	 * Optional site name for OpenRouter analytics.
	 */
	siteName?: string;
}

/**
 * Known embedding dimensions for popular models.
 * Users can override with the dimensions config option.
 */
const MODEL_DIMENSIONS: Record<string, number> = {
	// OpenAI models
	"openai/text-embedding-3-small": 1536,
	"openai/text-embedding-3-large": 3072,
	"openai/text-embedding-ada-002": 1536,
	// Cohere models
	"cohere/embed-english-v3.0": 1024,
	"cohere/embed-multilingual-v3.0": 1024,
	"cohere/embed-english-light-v3.0": 384,
	"cohere/embed-multilingual-light-v3.0": 384,
	// Google models
	"google/text-embedding-004": 768,
	// Voyage models
	"voyage/voyage-3": 1024,
	"voyage/voyage-3-lite": 512,
	"voyage/voyage-code-3": 1024,
};

/**
 * OpenRouter embedding provider for accessing multiple embedding models
 * through a unified API.
 *
 * OpenRouter provides access to embedding models from OpenAI, Cohere,
 * Google, and other providers using a single API key.
 *
 * @example
 * ```typescript
 * // Using OpenAI embeddings through OpenRouter
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({ vectorStore }),
 *   embeddingProvider: new OpenRouterEmbeddingProvider({
 *     model: 'openai/text-embedding-3-small',
 *   }),
 * });
 *
 * // Using Cohere embeddings through OpenRouter
 * const cohereProvider = new OpenRouterEmbeddingProvider({
 *   model: 'cohere/embed-english-v3.0',
 *   apiKey: process.env.OPENROUTER_API_KEY,
 * });
 * ```
 */
export class OpenRouterEmbeddingProvider implements EmbeddingProvider {
	private readonly apiKey: string;
	private readonly model: string;
	private readonly baseUrl: string;
	private readonly siteUrl?: string;
	private readonly siteName?: string;
	private readonly logger = new Logger({ name: "OpenRouterEmbeddingProvider" });
	readonly dimensions: number;

	constructor(config: OpenRouterEmbeddingProviderConfig = {}) {
		const apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY;
		if (!apiKey) {
			throw new Error(
				"OpenRouter API key not provided. Set OPENROUTER_API_KEY or pass apiKey in config.",
			);
		}

		this.apiKey = apiKey;
		this.model = config.model ?? "openai/text-embedding-3-small";
		this.baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1";
		this.siteUrl = config.siteUrl;
		this.siteName = config.siteName;

		// Use provided dimensions or infer from model
		this.dimensions = config.dimensions ?? MODEL_DIMENSIONS[this.model] ?? 1536;

		this.logger.debug(`Initialized with model: ${this.model}`, {
			dimensions: this.dimensions,
		});
	}

	/**
	 * Generate embedding for a single text.
	 */
	async embed(text: string): Promise<number[]> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.apiKey}`,
		};

		// Add optional OpenRouter headers
		if (this.siteUrl) {
			headers["HTTP-Referer"] = this.siteUrl;
		}
		if (this.siteName) {
			headers["X-Title"] = this.siteName;
		}

		const response = await fetch(`${this.baseUrl}/embeddings`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				model: this.model,
				input: text,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(
				`OpenRouter embedding error: ${response.status} - ${error}`,
			);
		}

		const data = await response.json();
		return data.data?.[0]?.embedding ?? [];
	}

	/**
	 * Generate embeddings for multiple texts in a batch.
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) {
			return [];
		}

		this.logger.debug("Generating batch embeddings", { count: texts.length });

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.apiKey}`,
		};

		if (this.siteUrl) {
			headers["HTTP-Referer"] = this.siteUrl;
		}
		if (this.siteName) {
			headers["X-Title"] = this.siteName;
		}

		const response = await fetch(`${this.baseUrl}/embeddings`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				model: this.model,
				input: texts,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(
				`OpenRouter embedding error: ${response.status} - ${error}`,
			);
		}

		const data = await response.json();

		// Sort by index to maintain order
		const embeddings = data.data
			?.sort((a: { index: number }, b: { index: number }) => a.index - b.index)
			.map((item: { embedding: number[] }) => item.embedding);

		return embeddings ?? [];
	}
}
