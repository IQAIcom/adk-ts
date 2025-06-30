import type { Event } from "../events/event";
import type { Session } from "../sessions/session";
import { formatTimestamp } from "./_utils";
import type {
	BaseMemoryService,
	SearchMemoryResponse,
} from "./base-memory-service";
import type { MemoryEntry } from "./memory-entry";

/**
 * Creates a user key from app name and user ID
 */
function _userKey(appName: string, userId: string): string {
	return `${appName}/${userId}`;
}

/**
 * Extracts words from a string and converts them to lowercase
 */
function _extractWordsLower(text: string): Set<string> {
	const words = text.match(/[A-Za-z]+/g) || [];
	return new Set(words.map((word) => word.toLowerCase()));
}

/**
 * An in-memory memory service for prototyping purpose only.
 * Uses keyword matching instead of semantic search.
 */
export class InMemoryMemoryService implements BaseMemoryService {
	/**
	 * Keys are app_name/user_id, session_id. Values are session event lists.
	 */
	private _sessionEvents: Map<string, Map<string, Event[]>> = new Map();

	/**
	 * Constructor for InMemoryMemoryService
	 */
	constructor() {
		this._sessionEvents = new Map();
	}

	/**
	 * Adds a session to the memory service
	 * @param session The session to add
	 */
	async addSessionToMemory(session: Session): Promise<void> {
		const userKey = _userKey(session.appName, session.userId);

		if (!this._sessionEvents.has(userKey)) {
			this._sessionEvents.set(userKey, new Map());
		}

		const userSessions = this._sessionEvents.get(userKey)!;

		// Filter events that have content and parts
		const filteredEvents = session.events.filter(
			(event) => event.content?.parts,
		);

		userSessions.set(session.id, filteredEvents);
	}

	/**
	 * Searches memory for relevant information
	 * @param options Search options containing app_name, user_id, and query
	 * @returns Search results
	 */
	async searchMemory(options: {
		appName: string;
		userId: string;
		query: string;
	}): Promise<SearchMemoryResponse> {
		const { appName, userId, query } = options;
		const userKey = _userKey(appName, userId);

		if (!this._sessionEvents.has(userKey)) {
			return { memories: [] };
		}

		const wordsInQuery = new Set(query.toLowerCase().split(" "));
		const response: SearchMemoryResponse = { memories: [] };

		const userSessions = this._sessionEvents.get(userKey)!;

		for (const sessionEvents of userSessions.values()) {
			for (const event of sessionEvents) {
				if (!event.content || !event.content.parts) {
					continue;
				}

				// Extract text from all parts that have text
				const textParts = event.content.parts
					.filter((part) => part.text)
					.map((part) => part.text!)
					.join(" ");

				const wordsInEvent = _extractWordsLower(textParts);

				if (wordsInEvent.size === 0) {
					continue;
				}

				// Check if any query word is in the event words
				const hasMatch = Array.from(wordsInQuery).some((queryWord) =>
					wordsInEvent.has(queryWord),
				);

				if (hasMatch) {
					const memoryEntry: MemoryEntry = {
						content: event.content,
						author: event.author,
						timestamp: formatTimestamp(event.timestamp),
					};

					response.memories.push(memoryEntry);
				}
			}
		}

		return response;
	}

	/**
	 * Gets all sessions in the memory service (for backward compatibility)
	 * @returns All sessions - Note: This method may not be fully compatible with the new structure
	 */
	getAllSessions(): Session[] {
		// This method doesn't exist in Python version, keeping for backward compatibility
		// but it won't work properly with the new structure
		console.warn(
			"getAllSessions() is deprecated and may not work correctly with the new memory structure",
		);
		return [];
	}

	/**
	 * Gets a session by ID (for backward compatibility)
	 * @param sessionId The session ID
	 * @returns The session or undefined if not found
	 */
	getSession(sessionId: string): Session | undefined {
		// This method doesn't exist in Python version, keeping for backward compatibility
		console.warn(
			"getSession() is deprecated and may not work correctly with the new memory structure",
		);
		return undefined;
	}

	/**
	 * Clears all sessions from memory
	 */
	clear(): void {
		this._sessionEvents.clear();
	}
}
