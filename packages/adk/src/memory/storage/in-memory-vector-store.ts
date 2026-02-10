import type { VectorStore } from "./vector-storage-provider";

/**
 * Simple in-memory vector store for development and testing.
 *
 * Uses cosine similarity for vector search. For production,
 * use dedicated vector databases like Pinecone, Qdrant, or Chroma.
 *
 * @example
 * ```typescript
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({
 *     vectorStore: new InMemoryVectorStore(),
 *   }),
 *   embeddingProvider: new OpenAIEmbeddingProvider(),
 * });
 * ```
 */
export class InMemoryVectorStore implements VectorStore {
	private vectors: Map<
		string,
		{ vector: number[]; metadata: Record<string, unknown> }
	> = new Map();

	/**
	 * Upsert a vector with metadata.
	 */
	async upsert(params: {
		id: string;
		vector: number[];
		metadata: Record<string, unknown>;
	}): Promise<void> {
		this.vectors.set(params.id, {
			vector: params.vector,
			metadata: params.metadata,
		});
	}

	/**
	 * Search for similar vectors using cosine similarity.
	 */
	async search(params: {
		vector: number[];
		topK: number;
		filter?: Record<string, unknown>;
	}): Promise<
		Array<{ id: string; score: number; metadata: Record<string, unknown> }>
	> {
		const results: Array<{
			id: string;
			score: number;
			metadata: Record<string, unknown>;
		}> = [];

		for (const [id, data] of this.vectors) {
			// Apply filters
			if (params.filter) {
				let matches = true;
				for (const [key, value] of Object.entries(params.filter)) {
					if (data.metadata[key] !== value) {
						matches = false;
						break;
					}
				}
				if (!matches) continue;
			}

			// Calculate cosine similarity
			const score = this.cosineSimilarity(params.vector, data.vector);
			results.push({ id, score, metadata: data.metadata });
		}

		// Sort by score descending and return top K
		return results.sort((a, b) => b.score - a.score).slice(0, params.topK);
	}

	/**
	 * Delete vectors by IDs or filter.
	 */
	async delete(params: {
		ids?: string[];
		filter?: Record<string, unknown>;
	}): Promise<number> {
		let deleted = 0;

		if (params.ids) {
			for (const id of params.ids) {
				if (this.vectors.delete(id)) deleted++;
			}
		} else if (params.filter) {
			for (const [id, data] of this.vectors) {
				let matches = true;
				for (const [key, value] of Object.entries(params.filter)) {
					if (data.metadata[key] !== value) {
						matches = false;
						break;
					}
				}
				if (matches) {
					this.vectors.delete(id);
					deleted++;
				}
			}
		}

		return deleted;
	}

	/**
	 * Count vectors matching filter.
	 */
	async count(filter?: Record<string, unknown>): Promise<number> {
		if (!filter) {
			return this.vectors.size;
		}

		let count = 0;
		for (const data of this.vectors.values()) {
			let matches = true;
			for (const [key, value] of Object.entries(filter)) {
				if (data.metadata[key] !== value) {
					matches = false;
					break;
				}
			}
			if (matches) count++;
		}

		return count;
	}

	/**
	 * Clear all vectors.
	 */
	clear(): void {
		this.vectors.clear();
	}

	/**
	 * Get the number of stored vectors.
	 */
	get size(): number {
		return this.vectors.size;
	}

	/**
	 * Calculate cosine similarity between two vectors.
	 */
	private cosineSimilarity(a: number[], b: number[]): number {
		if (a.length !== b.length) return 0;

		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}

		const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
		return magnitude === 0 ? 0 : dotProduct / magnitude;
	}
}
