import { Logger } from "../../logger";
import type { EmbeddingProvider } from "../types";

/**
 * Configuration for OpenAI embedding provider
 */
export interface OpenAIEmbeddingProviderConfig {
	/**
	 * OpenAI API key. If not provided, uses OPENAI_API_KEY env var.
	 */
	apiKey?: string;

	/**
	 * Model to use for embeddings.
	 * Default: "text-embedding-3-small"
	 */
	model?:
		| "text-embedding-3-small"
		| "text-embedding-3-large"
		| "text-embedding-ada-002";

	/**
	 * Base URL for the API.
	 * Default: "https://api.openai.com/v1"
	 */
	baseUrl?: string;
}

/**
 * Embedding dimensions for each model
 */
const MODEL_DIMENSIONS: Record<string, number> = {
	"text-embedding-3-small": 1536,
	"text-embedding-3-large": 3072,
	"text-embedding-ada-002": 1536,
};

/**
 * OpenAI embedding provider using the text-embedding models.
 *
 * @example
 * ```typescript
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({ vectorStore }),
 *   embeddingProvider: new OpenAIEmbeddingProvider({
 *     model: 'text-embedding-3-small',
 *   }),
 * });
 * ```
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
	private readonly apiKey: string;
	private readonly model: string;
	private readonly baseUrl: string;
	private readonly logger = new Logger({ name: "OpenAIEmbeddingProvider" });
	readonly dimensions: number;

	constructor(config: OpenAIEmbeddingProviderConfig = {}) {
		const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error(
				"OpenAI API key not provided. Set OPENAI_API_KEY or pass apiKey in config.",
			);
		}

		this.apiKey = apiKey;
		this.model = config.model ?? "text-embedding-3-small";
		this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
		this.dimensions = MODEL_DIMENSIONS[this.model] ?? 1536;

		this.logger.debug(`Initialized with model: ${this.model}`);
	}

	/**
	 * Generate embedding for a single text.
	 */
	async embed(text: string): Promise<number[]> {
		const response = await fetch(`${this.baseUrl}/embeddings`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				model: this.model,
				input: text,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI embedding error: ${response.status} - ${error}`);
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

		const response = await fetch(`${this.baseUrl}/embeddings`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				model: this.model,
				input: texts,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI embedding error: ${response.status} - ${error}`);
		}

		const data = await response.json();

		// Sort by index to maintain order
		const embeddings = data.data
			?.sort((a: { index: number }, b: { index: number }) => a.index - b.index)
			.map((item: { embedding: number[] }) => item.embedding);

		return embeddings ?? [];
	}
}
