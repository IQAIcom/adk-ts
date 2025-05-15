import type {
	BaseMemoryService,
	SearchMemoryOptions,
	SearchMemoryResponse,
} from "../memory-service";
import type { Session } from "../../sessions/session";
import type { Content } from "../../models/llm-request";

/**
 * An in-memory memory service for development and testing
 * Stores sessions and conversations in memory without persistence
 */
export class InMemoryMemoryService implements BaseMemoryService {
	/**
	 * Map of sessions by ID
	 */
	private sessions: Map<string, Session>;

	/**
	 * Constructor for InMemoryMemoryService
	 */
	constructor() {
		this.sessions = new Map<string, Session>();
	}

	/**
	 * Adds a session to the memory service
	 * @param session The session to add
	 */
	async addSessionToMemory(session: Session): Promise<void> {
		this.sessions.set(session.id, { ...session });
	}

	/**
	 * Searches memory for relevant information
	 * @param query The search query
	 * @param options Search options
	 * @returns Search results
	 */
	async searchMemory(
		query: string,
		options?: SearchMemoryOptions,
	): Promise<SearchMemoryResponse> {
		const response: SearchMemoryResponse = {
			memories: [],
		};

		// Normalize query for search
		const normalizedQuery = query.toLowerCase().trim();
		const queryTerms = normalizedQuery.split(/\s+/);

		// Filter by session ID if provided
		const sessionsToSearch = options?.sessionId
			? this.sessions.has(options.sessionId)
				? [this.sessions.get(options.sessionId)!]
				: []
			: Array.from(this.sessions.values());

		// Search each session
		for (const session of sessionsToSearch) {
			const matchedEvents: Content[] = [];
			const scores: number[] = [];

			// Iterate over contents in the session
			for (const content of session.contents || []) {
				// For simplicity, concatenate text from all parts of a content item
				const contentText = content.parts
					.filter((part) => "text" in part)
					.map((part) => (part as any).text)
					.join(" ")
					.toLowerCase();

				// Basic keyword matching (case-insensitive)
				if (contentText.includes(query.toLowerCase())) {
					matchedEvents.push(content);
					// Simple scoring: 1 for match, 0 otherwise. Could be more sophisticated.
					scores.push(1);
				}
			}

			if (matchedEvents.length > 0) {
				// Calculate average score for the session based on matched events
				const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

				if (!options?.threshold || averageScore >= options.threshold) {
					response.memories.push({
						sessionId: session.id,
						events: matchedEvents,
						relevanceScore: averageScore,
					});
				}
			}
		}

		// Sort by relevance score (highest first)
		response.memories.sort(
			(a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
		);

		// Apply limit if provided
		if (options?.limit !== undefined && options.limit > 0) {
			response.memories = response.memories.slice(0, options.limit);
		}

		return response;
	}

	/**
	 * Gets all sessions in the memory service
	 * @returns All sessions
	 */
	getAllSessions(): Session[] {
		return Array.from(this.sessions.values());
	}

	/**
	 * Gets a session by ID
	 * @param sessionId The session ID
	 * @returns The session or undefined if not found
	 */
	getSession(sessionId: string): Session | undefined {
		return this.sessions.get(sessionId);
	}

	/**
	 * Clears all sessions from memory
	 */
	clear(): void {
		this.sessions.clear();
	}
}
