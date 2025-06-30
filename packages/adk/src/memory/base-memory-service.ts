import type { Session } from "../models";
import type { MemoryEntry } from "./memory-entry";

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
