import type { EmbeddingProvider } from "../types";

const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

/**
 * Default embedding model - OpenAI's text-embedding-3-small via OpenRouter
 */
const DEFAULT_MODEL = "openai/text-embedding-3-small";

/**
 * Dimensions for known embedding models available on OpenRouter
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
	"voyageai/voyage-3": 1024,
	"voyageai/voyage-3-lite": 512,
	"voyageai/voyage-code-3": 1024,
};

interface OpenRouterEmbeddingResponse {
	id: string;
	object: string;
	data: Array<{
		object: string;
		index: number;
		embedding: number[];
	}>;
	model: string;
	usage: {
		prompt_tokens: number;
		total_tokens: number;
	};
}

interface OpenRouterEmbeddingConfig {
	/**
	 * OpenRouter API key. Falls back to OPENROUTER_API_KEY env var if not provided.
	 */
	apiKey?: string;

	/**
	 * The embedding model to use. Defaults to "openai/text-embedding-3-small".
	 * See https://openrouter.ai/models?q=embedding for available models.
	 */
	model?: string;

	/**
	 * Custom dimensions for the embedding (only supported by some models).
	 * If not provided, uses the model's default dimensions.
	 */
	dimensions?: number;

	/**
	 * Optional site URL for OpenRouter rankings and analytics.
	 */
	siteUrl?: string;

	/**
	 * Optional site name for OpenRouter rankings and analytics.
	 */
	siteName?: string;
}

/**
 * OpenRouter embedding provider for generating text embeddings.
 * Supports multiple embedding models from various providers through OpenRouter's unified API.
 *
 * @example
 * ```typescript
 * // Basic usage with default model
 * const embedding = new OpenRouterEmbedding();
 *
 * // With specific model
 * const embedding = new OpenRouterEmbedding({
 *   model: "cohere/embed-english-v3.0",
 * });
 *
 * // With custom API key
 * const embedding = new OpenRouterEmbedding({
 *   apiKey: "your-api-key",
 *   model: "voyageai/voyage-3",
 * });
 * ```
 */
export class OpenRouterEmbedding implements EmbeddingProvider {
	private apiKey: string;
	private model: string;
	private _dimensions: number;
	private siteUrl?: string;
	private siteName?: string;

	/**
	 * Creates a new OpenRouter embedding provider
	 */
	constructor(config: OpenRouterEmbeddingConfig = {}) {
		this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || "";
		if (!this.apiKey) {
			throw new Error(
				"OpenRouter API key is required. Provide it via config.apiKey or OPENROUTER_API_KEY environment variable.",
			);
		}

		this.model = config.model || DEFAULT_MODEL;
		this.siteUrl = config.siteUrl;
		this.siteName = config.siteName;

		// Determine dimensions
		if (config.dimensions) {
			this._dimensions = config.dimensions;
		} else {
			this._dimensions = MODEL_DIMENSIONS[this.model] || 1536;
		}
	}

	/**
	 * The dimension of the embedding vectors
	 */
	get dimensions(): number {
		return this._dimensions;
	}

	/**
	 * Generates an embedding vector for the given text
	 */
	async embed(text: string): Promise<number[]> {
		const response = await this.callOpenRouter([text]);
		return response.data[0].embedding;
	}

	/**
	 * Generates embedding vectors for multiple texts in a single API call
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) {
			return [];
		}

		const response = await this.callOpenRouter(texts);

		// Sort by index to maintain order
		const sorted = response.data.sort((a, b) => a.index - b.index);
		return sorted.map((item) => item.embedding);
	}

	/**
	 * Calls the OpenRouter Embeddings API
	 */
	private async callOpenRouter(
		input: string[],
	): Promise<OpenRouterEmbeddingResponse> {
		const body: Record<string, unknown> = {
			model: this.model,
			input,
		};

		// Only include dimensions if it differs from the model default
		// and the model supports custom dimensions (OpenAI models)
		if (
			this._dimensions &&
			this.model.includes("text-embedding-3-") &&
			this._dimensions !== MODEL_DIMENSIONS[this.model]
		) {
			body.dimensions = this._dimensions;
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.apiKey}`,
		};

		// Add optional OpenRouter headers for analytics
		if (this.siteUrl) {
			headers["HTTP-Referer"] = this.siteUrl;
		}
		if (this.siteName) {
			headers["X-Title"] = this.siteName;
		}

		const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`OpenRouter Embeddings API error (${response.status}): ${errorText}`,
			);
		}

		return response.json() as Promise<OpenRouterEmbeddingResponse>;
	}
}
