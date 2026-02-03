import type { Session } from "../sessions/session";

/**
 * Summary of a session for memory storage
 */
export interface SessionSummary {
	/**
	 * The summarized content of the session
	 */
	summary: string;

	/**
	 * Topics discussed in the session
	 */
	topics?: string[];

	/**
	 * Key facts extracted from the session
	 */
	keyFacts?: string[];

	/**
	 * Start timestamp of the summarized period (seconds since epoch)
	 */
	startTimestamp?: number;

	/**
	 * End timestamp of the summarized period (seconds since epoch)
	 */
	endTimestamp?: number;

	/**
	 * Number of events covered by this summary
	 */
	eventCount?: number;
}

/**
 * Provider interface for generating session summaries
 */
export interface SummaryProvider {
	/**
	 * Generates summaries from a session
	 * @param session The session to summarize
	 * @returns Array of session summaries
	 */
	getSummaries(session: Session): Promise<SessionSummary[]>;
}

/**
 * Provider interface for generating text embeddings
 */
export interface EmbeddingProvider {
	/**
	 * Generates an embedding vector for the given text
	 * @param text The text to embed
	 * @returns The embedding vector
	 */
	embed(text: string): Promise<number[]>;

	/**
	 * Generates embedding vectors for multiple texts
	 * @param texts The texts to embed
	 * @returns Array of embedding vectors
	 */
	embedBatch?(texts: string[]): Promise<number[][]>;

	/**
	 * The dimension of the embedding vectors
	 */
	readonly dimensions: number;
}

/**
 * Filter options for vector store queries
 */
export interface VectorStoreFilter {
	/**
	 * Filter by user ID
	 */
	userId?: string;

	/**
	 * Filter by application name
	 */
	appName?: string;

	/**
	 * Filter by session ID
	 */
	sessionId?: string;

	/**
	 * Include only memories after this timestamp (seconds since epoch)
	 */
	after?: number;

	/**
	 * Include only memories before this timestamp (seconds since epoch)
	 */
	before?: number;
}

/**
 * Result of a vector similarity search
 */
export interface VectorSearchResult {
	/**
	 * Unique identifier of the memory
	 */
	id: string;

	/**
	 * Similarity score (higher is more similar)
	 */
	score: number;

	/**
	 * The memory summary data
	 */
	memory: MemorySummary;
}

/**
 * A stored memory summary with metadata
 */
export interface MemorySummary {
	/**
	 * Unique identifier for this memory
	 */
	id: string;

	/**
	 * Session ID this memory was derived from
	 */
	sessionId: string;

	/**
	 * User ID associated with this memory
	 */
	userId: string;

	/**
	 * Application name associated with this memory
	 */
	appName: string;

	/**
	 * The summarized content
	 */
	summary: string;

	/**
	 * Topics discussed
	 */
	topics?: string[];

	/**
	 * Key facts extracted
	 */
	keyFacts?: string[];

	/**
	 * Timestamp when this memory was created (seconds since epoch)
	 */
	timestamp: number;

	/**
	 * Number of events this memory covers
	 */
	eventCount?: number;
}

/**
 * Interface for vector storage backends
 */
export interface VectorStore {
	/**
	 * Stores or updates an embedding with its metadata
	 * @param id Unique identifier for the embedding
	 * @param embedding The embedding vector
	 * @param metadata The memory metadata
	 */
	upsert(
		id: string,
		embedding: number[],
		metadata: MemorySummary,
	): Promise<void>;

	/**
	 * Searches for similar embeddings
	 * @param embedding The query embedding vector
	 * @param topK Number of results to return
	 * @param filter Optional filter criteria
	 * @returns Array of search results sorted by similarity (descending)
	 */
	search(
		embedding: number[],
		topK: number,
		filter?: VectorStoreFilter,
	): Promise<VectorSearchResult[]>;

	/**
	 * Deletes a single embedding by ID
	 * @param id The ID to delete
	 */
	delete?(id: string): Promise<void>;

	/**
	 * Deletes multiple embeddings matching the filter
	 * @param filter Filter criteria for deletion
	 * @returns Number of deleted entries
	 */
	deleteMany?(filter: VectorStoreFilter): Promise<number>;
}

/**
 * Configuration for the MemoryService
 */
export interface MemoryServiceConfig {
	/**
	 * Summarization provider configuration
	 */
	summarization?: {
		provider: SummaryProvider;
	};

	/**
	 * Embedding provider configuration
	 */
	embedding?: {
		provider: EmbeddingProvider;
	};

	/**
	 * Vector store for semantic search
	 */
	vectorStore?: VectorStore;

	/**
	 * Number of results to return from semantic search (default: 5)
	 */
	searchTopK?: number;
}
