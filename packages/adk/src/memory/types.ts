import type { Session } from "../sessions/session";

// =============================================================================
// Core Memory Types
// =============================================================================

/**
 * Main memory service configuration - orchestrates storage, summarization, and search.
 */
export interface MemoryServiceConfig {
	/**
	 * Where and how memories are stored.
	 * Default: InMemoryStorageProvider
	 */
	storage: MemoryStorageProvider;

	/**
	 * How sessions become memories.
	 * If not provided, stores session reference only (no summarization).
	 */
	summaryProvider?: MemorySummaryProvider;

	/**
	 * How to generate embeddings for semantic search.
	 * If not provided, storage provider uses its own search (likely keyword).
	 */
	embeddingProvider?: EmbeddingProvider;

	/**
	 * Number of results to return from search.
	 * Default: 5
	 */
	searchLimit?: number;
}

// =============================================================================
// Storage Provider
// =============================================================================

/**
 * Interface for memory storage backends.
 * Agent developers implement this or use provided defaults.
 *
 * Implementations decide:
 * - How data is persisted (files, database, vector store, etc.)
 * - How search works (keyword, vector, hybrid, full-text)
 * - What filters are supported
 */
export interface MemoryStorageProvider {
	/**
	 * Store a memory record.
	 */
	store(record: MemoryRecord): Promise<void>;

	/**
	 * Search memories. Implementation decides the search algorithm.
	 */
	search(query: MemorySearchQuery): Promise<MemorySearchResult[]>;

	/**
	 * Delete memories matching filter.
	 */
	delete(filter: MemoryDeleteFilter): Promise<number>;

	/**
	 * Count memories matching filter (for quota management).
	 */
	count?(filter: MemoryDeleteFilter): Promise<number>;
}

/**
 * A memory record stored in the storage provider.
 */
export interface MemoryRecord {
	/** Unique identifier for this memory */
	id: string;

	/** Session this memory was created from */
	sessionId: string;

	/** User who owns this memory */
	userId: string;

	/** Application name */
	appName: string;

	/** When this memory was created */
	timestamp: string;

	/**
	 * The memory content - structure depends on SummaryProvider.
	 * Could be: raw text, structured summary, custom schema.
	 */
	content: MemoryContent;

	/**
	 * Vector embedding (if EmbeddingProvider configured).
	 * Storage provider can use this for similarity search.
	 */
	embedding?: number[];
}

/**
 * Query parameters for searching memories.
 */
export interface MemorySearchQuery {
	/** The search query text */
	query: string;

	/** User ID to scope search */
	userId: string;

	/** Optional: limit to specific app */
	appName?: string;

	/** Maximum results to return */
	limit?: number;

	/**
	 * Optional: pre-computed query embedding.
	 * If provided, storage can use for vector search.
	 */
	queryEmbedding?: number[];

	/**
	 * Additional filters - storage provider decides what to support.
	 */
	filters?: {
		after?: string;
		before?: string;
		sessionId?: string;
		[key: string]: unknown;
	};
}

/**
 * A single search result with relevance score.
 */
export interface MemorySearchResult {
	/** The memory record */
	memory: MemoryRecord;

	/** Relevance score (0-1, higher is better) */
	score: number;
}

/**
 * Filter for deleting memories.
 */
export interface MemoryDeleteFilter {
	userId?: string;
	appName?: string;
	sessionId?: string;
	before?: string;
	after?: string;
	ids?: string[];
}

// =============================================================================
// Summary Provider
// =============================================================================

/**
 * Interface for transforming sessions into memory content.
 * If not provided, MemoryService stores session reference only.
 */
export interface MemorySummaryProvider {
	/**
	 * Transform a session into memory content.
	 * Implementation decides the output structure.
	 */
	summarize(session: Session): Promise<MemoryContent>;
}

/**
 * Flexible memory content - structure depends on use case.
 */
export type MemoryContent = {
	/** Human-readable summary */
	summary?: string;

	/**
	 * Topic segments for granular search.
	 * Each segment can be embedded separately for precision.
	 */
	segments?: TopicSegment[];

	/** Named entities mentioned */
	entities?: Entity[];

	/** Key facts to remember */
	keyFacts?: string[];

	/** Raw text (if no summarization) */
	rawText?: string;

	/** Custom fields - agent developer's schema */
	[key: string]: unknown;
};

/**
 * A topic segment within a memory for granular search.
 */
export interface TopicSegment {
	/** Short topic label */
	topic: string;

	/** Detailed summary of this topic */
	summary: string;

	/** How prominent was this topic */
	relevance?: "high" | "medium" | "low";
}

/**
 * A named entity extracted from a conversation.
 */
export interface Entity {
	/** Entity name */
	name: string;

	/** Entity type */
	type: "person" | "place" | "organization" | "thing" | "other";

	/** Relationship to user */
	relation?: string;
}

// =============================================================================
// Embedding Provider
// =============================================================================

/**
 * Interface for embedding providers.
 * If not provided, storage provider uses its own search method.
 */
export interface EmbeddingProvider {
	/**
	 * Generate embedding for text.
	 */
	embed(text: string): Promise<number[]>;

	/**
	 * Batch embedding for efficiency (optional).
	 */
	embedBatch?(texts: string[]): Promise<number[][]>;

	/**
	 * Embedding vector dimensions.
	 */
	readonly dimensions: number;
}
