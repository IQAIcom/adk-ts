import type { EmbeddingProvider } from "../types";

/**
 * Configuration for Ollama embedding provider
 */
export interface OllamaEmbeddingProviderConfig {
	/**
	 * The embedding model to use.
	 * Popular options: "nomic-embed-text", "mxbai-embed-large", "all-minilm"
	 */
	model: string;

	/**
	 * Base URL for Ollama API.
	 * Default: "http://localhost:11434"
	 */
	baseUrl?: string;

	/**
	 * Embedding dimensions for the model.
	 * If not provided, will be detected from first embedding call.
	 */
	dimensions?: number;
}

/**
 * Common Ollama embedding model dimensions
 */
const KNOWN_DIMENSIONS: Record<string, number> = {
	"nomic-embed-text": 768,
	"mxbai-embed-large": 1024,
	"all-minilm": 384,
	"snowflake-arctic-embed": 1024,
};

/**
 * Ollama embedding provider for local embedding generation.
 *
 * Requires Ollama to be running locally with an embedding model pulled.
 *
 * @example
 * ```typescript
 * // First, pull an embedding model:
 * // ollama pull nomic-embed-text
 *
 * const memoryService = new MemoryService({
 *   storage: new InMemoryStorageProvider(),
 *   embeddingProvider: new OllamaEmbeddingProvider({
 *     model: 'nomic-embed-text',
 *   }),
 * });
 * ```
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
	private readonly model: string;
	private readonly baseUrl: string;
	private _dimensions: number;

	constructor(config: OllamaEmbeddingProviderConfig) {
		this.model = config.model;
		this.baseUrl = config.baseUrl ?? "http://localhost:11434";
		this._dimensions = config.dimensions ?? KNOWN_DIMENSIONS[config.model] ?? 0;
	}

	/**
	 * Get embedding dimensions.
	 * If not known, returns 0 until first embedding is generated.
	 */
	get dimensions(): number {
		return this._dimensions;
	}

	/**
	 * Generate embedding for a single text.
	 */
	async embed(text: string): Promise<number[]> {
		const response = await fetch(`${this.baseUrl}/api/embeddings`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: this.model,
				prompt: text,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Ollama embedding error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		const embedding = data.embedding ?? [];

		// Update dimensions if we didn't know them
		if (this._dimensions === 0 && embedding.length > 0) {
			this._dimensions = embedding.length;
		}

		return embedding;
	}

	/**
	 * Generate embeddings for multiple texts.
	 * Note: Ollama doesn't have native batch support, so this calls embed() for each text.
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		// Ollama doesn't support batch embeddings natively
		// Process sequentially to avoid overwhelming the server
		const embeddings: number[][] = [];

		for (const text of texts) {
			const embedding = await this.embed(text);
			embeddings.push(embedding);
		}

		return embeddings;
	}
}
