import type { ListSessionOptions, Session } from "./session";
import { SessionState } from "./state";
import type { Event } from "../events/event";
import { generateEventId } from "../events/event";

/**
 * Service for managing sessions
 */
export interface SessionService {
	/**
	 * Creates a new session
	 * @param userId User identifier
	 * @param metadata Optional session metadata
	 * @returns The created session
	 */
	createSession(
		userId: string,
		metadata?: Record<string, any>,
	): Promise<Session>;

	/**
	 * Gets a session by ID
	 * @param sessionId Session identifier
	 * @returns The session or undefined if not found
	 */
	getSession(sessionId: string): Promise<Session | undefined>;

	/**
	 * Updates an existing session
	 * @param session The session to update
	 */
	updateSession(session: Session): Promise<void>;

	/**
	 * Appends an event to a session's history.
	 * @param sessionId The ID of the session to append to.
	 * @param event The event to append.
	 */
	appendEvent(sessionId: string, event: Event): Promise<void>;

	/**
	 * Lists sessions for a user
	 * @param userId User identifier
	 * @param options Optional filtering options
	 * @returns Array of matching sessions
	 */
	listSessions(
		userId: string,
		options?: ListSessionOptions,
	): Promise<Session[]>;

	/**
	 * Deletes a session
	 * @param sessionId Session identifier
	 */
	deleteSession(sessionId: string): Promise<void>;
}

/**
 * In-memory implementation of SessionService
 */
export class InMemorySessionService implements SessionService {
	private sessions: Map<string, Session>;

	constructor() {
		this.sessions = new Map<string, Session>();
	}

	async createSession(
		userId: string,
		metadata: Record<string, any> = {},
	): Promise<Session> {
		const sessionId = this.generateInternalSessionId();
		const now = new Date();

		const session: Session = {
			id: sessionId,
			userId,
			events: [],
			metadata,
			createdAt: now,
			updatedAt: now,
			state: new SessionState(),
		};

		this.sessions.set(sessionId, session);
		return session;
	}

	async getSession(sessionId: string): Promise<Session | undefined> {
		return this.sessions.get(sessionId);
	}

	async updateSession(session: Session): Promise<void> {
		const existingSession = this.sessions.get(session.id);
		if (!existingSession) {
			throw new Error(`Session with id ${session.id} not found for update.`);
		}
		const updatedSession: Session = {
			...existingSession,
			...session,
			updatedAt: new Date(),
		};
		this.sessions.set(session.id, updatedSession);
	}

	async appendEvent(sessionId: string, event: Event): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const eventToAppend = { ...event };
		if (!eventToAppend.id) {
			eventToAppend.id = generateEventId();
		}
		if (
			eventToAppend.timestamp === undefined ||
			eventToAppend.timestamp === null
		) {
			eventToAppend.timestamp = Date.now() / 1000;
		}

		session.events.push(eventToAppend);
		session.updatedAt = new Date();
		this.sessions.set(sessionId, { ...session });
	}

	async listSessions(
		userId: string,
		options?: ListSessionOptions,
	): Promise<Session[]> {
		let userSessions = Array.from(this.sessions.values()).filter(
			(session) => session.userId === userId,
		);

		if (options?.createdAfter) {
			userSessions = userSessions.filter(
				(session) => session.createdAt >= options.createdAfter!,
			);
		}
		if (options?.updatedAfter) {
			userSessions = userSessions.filter(
				(session) => session.updatedAt >= options.updatedAfter!,
			);
		}
		if (options?.metadataFilter) {
			userSessions = userSessions.filter((session) => {
				for (const [key, value] of Object.entries(options.metadataFilter!)) {
					if (session.metadata[key] !== value) return false;
				}
				return true;
			});
		}
		userSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
		if (options?.limit !== undefined && options.limit > 0) {
			userSessions = userSessions.slice(0, options.limit);
		}
		return userSessions;
	}

	async deleteSession(sessionId: string): Promise<void> {
		this.sessions.delete(sessionId);
	}

	clear(): void {
		this.sessions.clear();
	}

	private generateInternalSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}
}
