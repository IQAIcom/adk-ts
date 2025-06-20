import type { Content } from "@google/genai";
import type { Session } from "../models";

/**
 * Represent one memory entry
 */
export interface MemoryEntry {
	/**
	 * The main content of the memory
	 */
	content: Content;

	/**
	 * The author of the memory
	 */
	author?: string;

	/**
	 * The timestamp when the original content of this memory happened.
	 *
	 * This string will be forwarded to LLM. Preferred format is ISO 8601 format.
	 */
	timestamp?: string;
}

/**
 * Represents the response from a memory search
 */
export interface SearchMemoryResponse {
	/**
	 * A list of memory entries that relate to the search query
	 */
	memories: MemoryEntry[];
}

/**
 * Base interface for memory services
 *
 * The service provides functionalities to ingest sessions into memory so that
 * the memory can be used for user queries.
 */
export interface BaseMemoryService {
	/**
	 * Adds a session to the memory service
	 *
	 * A session may be added multiple times during its lifetime.
	 *
	 * @param session The session to add
	 */
	addSessionToMemory(session: Session): Promise<void>;

	/**
	 * Searches for sessions that match the query
	 *
	 * @param params Search parameters
	 * @param params.appName The name of the application
	 * @param params.userId The id of the user
	 * @param params.query The query to search for
	 * @returns A SearchMemoryResponse containing the matching memories
	 */
	searchMemory(params: {
		appName: string;
		userId: string;
		query: string;
	}): Promise<SearchMemoryResponse>;
}
