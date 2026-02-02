import type {
	MemorySummary,
	VectorSearchResult,
	VectorStore,
	VectorStoreFilter,
} from "../types";

interface StoredEntry {
	embedding: number[];
	metadata: MemorySummary;
}

/**
 * Computes the dot product of two vectors
 */
function dotProduct(a: number[], b: number[]): number {
	let sum = 0;
	for (let i = 0; i < a.length; i++) {
		sum += a[i] * b[i];
	}
	return sum;
}

/**
 * Computes the magnitude (L2 norm) of a vector
 */
function magnitude(v: number[]): number {
	let sum = 0;
	for (const x of v) {
		sum += x * x;
	}
	return Math.sqrt(sum);
}

/**
 * Computes cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical direction
 */
function cosineSimilarity(a: number[], b: number[]): number {
	const magA = magnitude(a);
	const magB = magnitude(b);
	if (magA === 0 || magB === 0) {
		return 0;
	}
	return dotProduct(a, b) / (magA * magB);
}

/**
 * Checks if a memory matches the given filter criteria
 */
function matchesFilter(
	memory: MemorySummary,
	filter?: VectorStoreFilter,
): boolean {
	if (!filter) {
		return true;
	}

	if (filter.userId && memory.userId !== filter.userId) {
		return false;
	}

	if (filter.appName && memory.appName !== filter.appName) {
		return false;
	}

	if (filter.sessionId && memory.sessionId !== filter.sessionId) {
		return false;
	}

	if (filter.after !== undefined && memory.timestamp < filter.after) {
		return false;
	}

	if (filter.before !== undefined && memory.timestamp > filter.before) {
		return false;
	}

	return true;
}

/**
 * In-memory vector store for development and testing.
 * Uses cosine similarity for semantic search.
 */
export class InMemoryVectorStore implements VectorStore {
	private store: Map<string, StoredEntry> = new Map();

	/**
	 * Stores or updates an embedding with its metadata
	 */
	async upsert(
		id: string,
		embedding: number[],
		metadata: MemorySummary,
	): Promise<void> {
		this.store.set(id, { embedding, metadata });
	}

	/**
	 * Searches for similar embeddings using cosine similarity
	 */
	async search(
		embedding: number[],
		topK: number,
		filter?: VectorStoreFilter,
	): Promise<VectorSearchResult[]> {
		const results: VectorSearchResult[] = [];

		for (const [id, entry] of this.store.entries()) {
			if (!matchesFilter(entry.metadata, filter)) {
				continue;
			}

			const score = cosineSimilarity(embedding, entry.embedding);

			results.push({
				id,
				score,
				memory: entry.metadata,
			});
		}

		// Sort by score descending and take top K
		results.sort((a, b) => b.score - a.score);
		return results.slice(0, topK);
	}

	/**
	 * Deletes a single embedding by ID
	 */
	async delete(id: string): Promise<void> {
		this.store.delete(id);
	}

	/**
	 * Deletes multiple embeddings matching the filter
	 */
	async deleteMany(filter: VectorStoreFilter): Promise<number> {
		let deleted = 0;

		for (const [id, entry] of this.store.entries()) {
			if (matchesFilter(entry.metadata, filter)) {
				this.store.delete(id);
				deleted++;
			}
		}

		return deleted;
	}

	/**
	 * Returns the number of entries in the store
	 */
	get size(): number {
		return this.store.size;
	}

	/**
	 * Clears all entries from the store
	 */
	clear(): void {
		this.store.clear();
	}
}
