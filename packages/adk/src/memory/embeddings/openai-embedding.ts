import type { EmbeddingProvider } from "../types";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";

/**
 * Default embedding model with good performance/cost balance
 */
const DEFAULT_MODEL = "text-embedding-3-small";

/**
 * Dimensions for known OpenAI embedding models
 */
const MODEL_DIMENSIONS: Record<string, number> = {
	"text-embedding-3-small": 1536,
	"text-embedding-3-large": 3072,
	"text-embedding-ada-002": 1536,
};

interface OpenAIEmbeddingResponse {
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

interface OpenAIEmbeddingConfig {
	/**
	 * OpenAI API key. Falls back to OPENAI_API_KEY env var if not provided.
	 */
	apiKey?: string;

	/**
	 * The embedding model to use. Defaults to "text-embedding-3-small".
	 */
	model?: string;

	/**
	 * Custom dimensions for the embedding (only supported by some models).
	 * If not provided, uses the model's default dimensions.
	 */
	dimensions?: number;
}

/**
 * OpenAI embedding provider for generating text embeddings.
 * Uses the OpenAI Embeddings API.
 */
export class OpenAIEmbedding implements EmbeddingProvider {
	private apiKey: string;
	private model: string;
	private _dimensions: number;

	/**
	 * Creates a new OpenAI embedding provider
	 */
	constructor(config: OpenAIEmbeddingConfig = {}) {
		this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
		if (!this.apiKey) {
			throw new Error(
				"OpenAI API key is required. Provide it via config.apiKey or OPENAI_API_KEY environment variable.",
			);
		}

		this.model = config.model || DEFAULT_MODEL;

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
		const response = await this.callOpenAI([text]);
		return response.data[0].embedding;
	}

	/**
	 * Generates embedding vectors for multiple texts in a single API call
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) {
			return [];
		}

		const response = await this.callOpenAI(texts);

		// Sort by index to maintain order
		const sorted = response.data.sort((a, b) => a.index - b.index);
		return sorted.map((item) => item.embedding);
	}

	/**
	 * Calls the OpenAI Embeddings API
	 */
	private async callOpenAI(input: string[]): Promise<OpenAIEmbeddingResponse> {
		const body: Record<string, any> = {
			model: this.model,
			input,
		};

		// Only include dimensions if it differs from the model default
		// and the model supports custom dimensions
		if (
			this._dimensions &&
			this.model.startsWith("text-embedding-3-") &&
			this._dimensions !== MODEL_DIMENSIONS[this.model]
		) {
			body.dimensions = this._dimensions;
		}

		const response = await fetch(OPENAI_EMBEDDINGS_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`OpenAI Embeddings API error (${response.status}): ${errorText}`,
			);
		}

		return response.json() as Promise<OpenAIEmbeddingResponse>;
	}
}
