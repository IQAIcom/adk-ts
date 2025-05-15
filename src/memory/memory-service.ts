import type { Session } from "../sessions/session";

/**
 * Represents a single memory retrieval result
 */
export interface MemoryResult {
	/**
	 * The session ID associated with the memory
	 */
	sessionId: string;

	/**
	 * Array of events/messages from the session
	 */
	events: any[];

	/**
	 * Score indicating relevance to query (0-1)
	 */
	relevanceScore?: number;
}

/**
 * Represents the response from a memory search
 */
export interface SearchMemoryResponse {
	/**
	 * List of memory results matching the search query
	 */
	memories: MemoryResult[];
}

/**
 * Options for memory search
 */
export interface SearchMemoryOptions {
	/**
	 * Session ID to search within (null for all sessions)
	 */
	sessionId?: string;

	/**
	 * Maximum number of results to return
	 */
	limit?: number;

	/**
	 * Minimum relevance score (0-1)
	 */
	threshold?: number;

	/**
	 * Additional filter criteria
	 */
	filter?: Record<string, any>;
}

/**
 * Base interface for memory services
 */
export interface BaseMemoryService {
	/**
	 * Adds a session to the memory service
	 * @param session The session to add
	 */
	addSessionToMemory(session: Session): Promise<void>;

	/**
	 * Searches memory for relevant information
	 * @param query The search query
	 * @param options Search options
	 * @returns Search results
	 */
	searchMemory(
		query: string,
		options?: SearchMemoryOptions,
	): Promise<SearchMemoryResponse>;
}
