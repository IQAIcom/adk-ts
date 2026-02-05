import type {
	MemoryDeleteFilter,
	MemoryRecord,
	MemorySearchQuery,
	MemorySearchResult,
	MemoryStorageProvider,
} from "../types";

/**
 * Abstract interface for vector store adapters.
 * Implement this to integrate with Pinecone, Qdrant, Chroma, etc.
 */
export interface VectorStore {
	/**
	 * Upsert a vector with metadata.
	 */
	upsert(params: {
		id: string;
		vector: number[];
		metadata: Record<string, unknown>;
	}): Promise<void>;

	/**
	 * Search for similar vectors.
	 */
	search(params: {
		vector: number[];
		topK: number;
		filter?: Record<string, unknown>;
	}): Promise<
		Array<{ id: string; score: number; metadata: Record<string, unknown> }>
	>;

	/**
	 * Delete vectors by IDs or filter.
	 */
	delete(params: {
		ids?: string[];
		filter?: Record<string, unknown>;
	}): Promise<number>;

	/**
	 * Count vectors matching filter (optional).
	 */
	count?(filter?: Record<string, unknown>): Promise<number>;
}

/**
 * Search mode for hybrid search
 */
export type SearchMode = "vector" | "keyword" | "hybrid";

/**
 * Configuration for VectorStorageProvider
 */
export interface VectorStorageProviderConfig {
	/**
	 * The vector store adapter (Pinecone, Qdrant, Chroma, etc.)
	 */
	vectorStore: VectorStore;

	/**
	 * Search mode.
	 * - "vector": Pure vector similarity search
	 * - "keyword": Fall back to keyword matching in metadata
	 * - "hybrid": Combine vector and keyword scores
	 * Default: "vector"
	 */
	searchMode?: SearchMode;

	/**
	 * Weights for hybrid search.
	 * Default: { vector: 0.7, keyword: 0.3 }
	 */
	hybridWeights?: {
		vector: number;
		keyword: number;
	};

	/**
	 * Namespace/collection name for isolation.
	 */
	namespace?: string;
}

/**
 * Vector storage provider that wraps external vector databases.
 *
 * Supports vector similarity search, keyword matching, or hybrid search.
 *
 * @example
 * ```typescript
 * // With Pinecone adapter
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({
 *     vectorStore: new PineconeAdapter({ index: 'memories' }),
 *     searchMode: 'hybrid',
 *     hybridWeights: { vector: 0.7, keyword: 0.3 },
 *   }),
 *   embeddingProvider: new OpenAIEmbeddingProvider(),
 * });
 * ```
 */
export class VectorStorageProvider implements MemoryStorageProvider {
	private readonly vectorStore: VectorStore;
	private readonly searchMode: SearchMode;
	private readonly hybridWeights: { vector: number; keyword: number };
	private readonly namespace?: string;

	// In-memory cache for keyword search fallback
	private readonly memoryCache: Map<string, MemoryRecord> = new Map();

	constructor(config: VectorStorageProviderConfig) {
		this.vectorStore = config.vectorStore;
		this.searchMode = config.searchMode ?? "vector";
		this.hybridWeights = config.hybridWeights ?? { vector: 0.7, keyword: 0.3 };
		this.namespace = config.namespace;
	}

	/**
	 * Store a memory record in the vector store.
	 */
	async store(record: MemoryRecord): Promise<void> {
		if (!record.embedding || record.embedding.length === 0) {
			throw new Error(
				"VectorStorageProvider requires embeddings. Configure an EmbeddingProvider.",
			);
		}

		// Store in vector database
		await this.vectorStore.upsert({
			id: record.id,
			vector: record.embedding,
			metadata: this.recordToMetadata(record),
		});

		// Cache for keyword search
		this.memoryCache.set(record.id, record);
	}

	/**
	 * Search memories using vector similarity, keywords, or hybrid.
	 */
	async search(query: MemorySearchQuery): Promise<MemorySearchResult[]> {
		const limit = query.limit ?? 5;

		// Build filter for vector store
		const filter = this.buildFilter(query);

		let results: MemorySearchResult[] = [];

		if (this.searchMode === "keyword") {
			// Pure keyword search
			results = this.keywordSearch(query, limit);
		} else if (this.searchMode === "vector" && query.queryEmbedding) {
			// Pure vector search
			results = await this.vectorSearch(query.queryEmbedding, filter, limit);
		} else if (this.searchMode === "hybrid" && query.queryEmbedding) {
			// Hybrid search
			results = await this.hybridSearch(query, filter, limit);
		} else if (query.queryEmbedding) {
			// Default to vector if embedding available
			results = await this.vectorSearch(query.queryEmbedding, filter, limit);
		} else {
			// Fall back to keyword if no embedding
			results = this.keywordSearch(query, limit);
		}

		return results;
	}

	/**
	 * Delete memories from the vector store.
	 */
	async delete(filter: MemoryDeleteFilter): Promise<number> {
		let deleted = 0;

		if (filter.ids && filter.ids.length > 0) {
			// Delete by IDs
			deleted = await this.vectorStore.delete({ ids: filter.ids });

			// Remove from cache
			for (const id of filter.ids) {
				this.memoryCache.delete(id);
			}
		} else {
			// Delete by filter - need to find matching IDs first
			const idsToDelete: string[] = [];

			for (const [id, record] of this.memoryCache.entries()) {
				if (this.matchesFilter(record, filter)) {
					idsToDelete.push(id);
				}
			}

			if (idsToDelete.length > 0) {
				deleted = await this.vectorStore.delete({ ids: idsToDelete });

				for (const id of idsToDelete) {
					this.memoryCache.delete(id);
				}
			}
		}

		return deleted;
	}

	/**
	 * Count memories matching filter.
	 */
	async count(filter: MemoryDeleteFilter): Promise<number> {
		// Use cache for counting since not all vector stores support count
		let count = 0;

		for (const record of this.memoryCache.values()) {
			if (this.matchesFilter(record, filter)) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Vector similarity search.
	 */
	private async vectorSearch(
		queryEmbedding: number[],
		filter: Record<string, unknown>,
		limit: number,
	): Promise<MemorySearchResult[]> {
		const results = await this.vectorStore.search({
			vector: queryEmbedding,
			topK: limit,
			filter,
		});

		return results
			.map((result) => {
				const record = this.metadataToRecord(result.id, result.metadata);
				if (!record) return null;

				return {
					memory: record,
					score: result.score,
				};
			})
			.filter((r): r is MemorySearchResult => r !== null);
	}

	/**
	 * Keyword-based search using cached records.
	 */
	private keywordSearch(
		query: MemorySearchQuery,
		limit: number,
	): MemorySearchResult[] {
		const searchTerms = query.query.toLowerCase().split(/\s+/);
		const results: MemorySearchResult[] = [];

		for (const record of this.memoryCache.values()) {
			// Apply filters
			if (record.userId !== query.userId) continue;
			if (query.appName && record.appName !== query.appName) continue;

			// Calculate keyword score
			const score = this.calculateKeywordScore(record, searchTerms);
			if (score > 0) {
				results.push({ memory: record, score });
			}
		}

		// Sort by score and limit
		return results.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Hybrid search combining vector and keyword scores.
	 */
	private async hybridSearch(
		query: MemorySearchQuery,
		filter: Record<string, unknown>,
		limit: number,
	): Promise<MemorySearchResult[]> {
		// Get more results than needed for re-ranking
		const fetchLimit = Math.min(limit * 3, 50);

		// Vector search
		const vectorResults = query.queryEmbedding
			? await this.vectorSearch(query.queryEmbedding, filter, fetchLimit)
			: [];

		// Keyword search
		const keywordResults = this.keywordSearch(query, fetchLimit);

		// Merge and re-rank
		const scoreMap = new Map<string, { vector: number; keyword: number }>();

		for (const result of vectorResults) {
			scoreMap.set(result.memory.id, {
				vector: result.score,
				keyword: 0,
			});
		}

		for (const result of keywordResults) {
			const existing = scoreMap.get(result.memory.id);
			if (existing) {
				existing.keyword = result.score;
			} else {
				scoreMap.set(result.memory.id, {
					vector: 0,
					keyword: result.score,
				});
			}
		}

		// Calculate hybrid scores
		const hybridResults: MemorySearchResult[] = [];

		for (const [id, scores] of scoreMap.entries()) {
			const record = this.memoryCache.get(id);
			if (!record) continue;

			const hybridScore =
				scores.vector * this.hybridWeights.vector +
				scores.keyword * this.hybridWeights.keyword;

			hybridResults.push({
				memory: record,
				score: hybridScore,
			});
		}

		return hybridResults.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Convert a memory record to vector store metadata.
	 */
	private recordToMetadata(record: MemoryRecord): Record<string, unknown> {
		return {
			userId: record.userId,
			appName: record.appName,
			sessionId: record.sessionId,
			timestamp: record.timestamp,
			content: JSON.stringify(record.content),
			namespace: this.namespace,
		};
	}

	/**
	 * Convert vector store metadata back to a memory record.
	 */
	private metadataToRecord(
		id: string,
		metadata: Record<string, unknown>,
	): MemoryRecord | null {
		// Try to get from cache first
		const cached = this.memoryCache.get(id);
		if (cached) return cached;

		try {
			const record: MemoryRecord = {
				id,
				userId: metadata.userId as string,
				appName: metadata.appName as string,
				sessionId: metadata.sessionId as string,
				timestamp: metadata.timestamp as string,
				content: JSON.parse(metadata.content as string),
			};

			// Cache for future use
			this.memoryCache.set(id, record);

			return record;
		} catch {
			return null;
		}
	}

	/**
	 * Build filter object for vector store query.
	 */
	private buildFilter(query: MemorySearchQuery): Record<string, unknown> {
		const filter: Record<string, unknown> = {
			userId: query.userId,
		};

		if (query.appName) {
			filter.appName = query.appName;
		}

		if (this.namespace) {
			filter.namespace = this.namespace;
		}

		if (query.filters?.sessionId) {
			filter.sessionId = query.filters.sessionId;
		}

		return filter;
	}

	/**
	 * Check if a record matches the given filter.
	 */
	private matchesFilter(
		record: MemoryRecord,
		filter: MemoryDeleteFilter,
	): boolean {
		if (filter.userId && record.userId !== filter.userId) return false;
		if (filter.appName && record.appName !== filter.appName) return false;
		if (filter.sessionId && record.sessionId !== filter.sessionId) return false;
		if (filter.before && record.timestamp > filter.before) return false;
		if (filter.after && record.timestamp < filter.after) return false;

		return true;
	}

	/**
	 * Calculate keyword match score.
	 */
	private calculateKeywordScore(
		record: MemoryRecord,
		searchTerms: string[],
	): number {
		const content = record.content;
		const searchableTexts: string[] = [];

		if (content.summary) searchableTexts.push(content.summary);
		if (content.rawText) searchableTexts.push(content.rawText);
		if (content.keyFacts) searchableTexts.push(...content.keyFacts);
		if (content.segments) {
			for (const seg of content.segments) {
				searchableTexts.push(seg.topic, seg.summary);
			}
		}

		const fullText = searchableTexts.join(" ").toLowerCase();
		let matches = 0;

		for (const term of searchTerms) {
			if (fullText.includes(term)) matches++;
		}

		return searchTerms.length > 0 ? matches / searchTerms.length : 0;
	}
}
