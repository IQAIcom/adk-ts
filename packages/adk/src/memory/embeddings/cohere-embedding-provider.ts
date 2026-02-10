import type { EmbeddingProvider } from "../types";

/**
 * Configuration for Cohere embedding provider
 */
export interface CohereEmbeddingProviderConfig {
	/**
	 * Cohere API key. If not provided, uses CO_API_KEY env var.
	 */
	apiKey?: string;

	/**
	 * Model to use for embeddings.
	 * Default: "embed-english-v3.0"
	 */
	model?:
		| "embed-english-v3.0"
		| "embed-multilingual-v3.0"
		| "embed-english-light-v3.0"
		| "embed-multilingual-light-v3.0";

	/**
	 * Input type for the embeddings.
	 * - "search_document": For documents to be searched
	 * - "search_query": For search queries
	 * - "classification": For classification tasks
	 * - "clustering": For clustering tasks
	 * Default: "search_document"
	 */
	inputType?:
		| "search_document"
		| "search_query"
		| "classification"
		| "clustering";

	/**
	 * Base URL for the API.
	 * Default: "https://api.cohere.ai/v1"
	 */
	baseUrl?: string;
}

/**
 * Embedding dimensions for each Cohere model
 */
const MODEL_DIMENSIONS: Record<string, number> = {
	"embed-english-v3.0": 1024,
	"embed-multilingual-v3.0": 1024,
	"embed-english-light-v3.0": 384,
	"embed-multilingual-light-v3.0": 384,
};

/**
 * Cohere embedding provider using the embed API.
 *
 * @example
 * ```typescript
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({ vectorStore }),
 *   embeddingProvider: new CohereEmbeddingProvider({
 *     model: 'embed-english-v3.0',
 *     inputType: 'search_document',
 *   }),
 * });
 * ```
 */
export class CohereEmbeddingProvider implements EmbeddingProvider {
	private readonly apiKey: string;
	private readonly model: string;
	private readonly inputType: string;
	private readonly baseUrl: string;
	readonly dimensions: number;

	constructor(config: CohereEmbeddingProviderConfig = {}) {
		const apiKey = config.apiKey ?? process.env.CO_API_KEY;
		if (!apiKey) {
			throw new Error(
				"Cohere API key not provided. Set CO_API_KEY or pass apiKey in config.",
			);
		}

		this.apiKey = apiKey;
		this.model = config.model ?? "embed-english-v3.0";
		this.inputType = config.inputType ?? "search_document";
		this.baseUrl = config.baseUrl ?? "https://api.cohere.ai/v1";
		this.dimensions = MODEL_DIMENSIONS[this.model] ?? 1024;
	}

	/**
	 * Generate embedding for a single text.
	 */
	async embed(text: string): Promise<number[]> {
		const embeddings = await this.embedBatch([text]);
		return embeddings[0] ?? [];
	}

	/**
	 * Generate embeddings for multiple texts in a batch.
	 * Cohere supports batch embeddings natively.
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) {
			return [];
		}

		const response = await fetch(`${this.baseUrl}/embed`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				model: this.model,
				texts: texts,
				input_type: this.inputType,
				embedding_types: ["float"],
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Cohere embedding error: ${response.status} - ${error}`);
		}

		const data = await response.json();

		// Cohere returns embeddings in the same order as input
		return data.embeddings?.float ?? data.embeddings ?? [];
	}

	/**
	 * Create a provider configured for search queries.
	 * Use this when embedding queries for search.
	 */
	static forQuery(
		config: Omit<CohereEmbeddingProviderConfig, "inputType"> = {},
	): CohereEmbeddingProvider {
		return new CohereEmbeddingProvider({
			...config,
			inputType: "search_query",
		});
	}

	/**
	 * Create a provider configured for documents.
	 * Use this when embedding documents for storage.
	 */
	static forDocument(
		config: Omit<CohereEmbeddingProviderConfig, "inputType"> = {},
	): CohereEmbeddingProvider {
		return new CohereEmbeddingProvider({
			...config,
			inputType: "search_document",
		});
	}
}
