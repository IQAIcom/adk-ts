import { randomUUID } from "node:crypto";
import type { Event } from "@adk/events/event";
import {
	BaseSessionService,
	type GetSessionConfig,
	type ListSessionsResponse,
} from "./base-session-service";
import type { Session } from "./session";
import { State } from "./state";

/**
 * An in-memory implementation of the session service.
 */
export class InMemorySessionService extends BaseSessionService {
	/**
	 * A map from app name to a map from user ID to a map from session ID to session.
	 */
	private sessions: Map<string, Map<string, Map<string, Session>>> = new Map();

	/**
	 * A map from app name to a map from user ID to a map from key to the value.
	 */
	private userState: Map<string, Map<string, Map<string, any>>> = new Map();

	/**
	 * A map from app name to a map from key to the value.
	 */
	private appState: Map<string, Map<string, any>> = new Map();

	/**
	 * Creates a new session.
	 */
	async createSession(
		appName: string,
		userId: string,
		state?: Record<string, any>,
		sessionId?: string,
	): Promise<Session> {
		return this.createSessionImpl(appName, userId, state, sessionId);
	}

	/**
	 * @deprecated Please migrate to the async method.
	 */
	createSessionSync(
		appName: string,
		userId: string,
		state?: Record<string, any>,
		sessionId?: string,
	): Session {
		console.warn("Deprecated. Please migrate to the async method.");
		return this.createSessionImpl(appName, userId, state, sessionId);
	}

	private createSessionImpl(
		appName: string,
		userId: string,
		state?: Record<string, any>,
		sessionId?: string,
	): Session {
		const finalSessionId = sessionId?.trim() || randomUUID();

		const session: Session = {
			appName,
			userId,
			id: finalSessionId,
			state: state || {},
			events: [],
			lastUpdateTime: Date.now() / 1000,
		};

		if (!this.sessions.has(appName)) {
			this.sessions.set(appName, new Map());
		}
		if (!this.sessions.get(appName)!.has(userId)) {
			this.sessions.get(appName)!.set(userId, new Map());
		}
		this.sessions.get(appName)!.get(userId)!.set(finalSessionId, session);

		const copiedSession = structuredClone(session);
		return this.mergeState(appName, userId, copiedSession);
	}

	/**
	 * Gets a session.
	 */
	async getSession(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Promise<Session | undefined> {
		return this.getSessionImpl(appName, userId, sessionId, config);
	}

	/**
	 * @deprecated Please migrate to the async method.
	 */
	getSessionSync(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Session | undefined {
		console.warn("Deprecated. Please migrate to the async method.");
		return this.getSessionImpl(appName, userId, sessionId, config);
	}

	private getSessionImpl(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Session | undefined {
		if (!this.sessions.has(appName)) {
			return undefined;
		}
		if (!this.sessions.get(appName)!.has(userId)) {
			return undefined;
		}
		if (!this.sessions.get(appName)!.get(userId)!.has(sessionId)) {
			return undefined;
		}

		const session = this.sessions.get(appName)!.get(userId)!.get(sessionId);
		if (!session) {
			return undefined;
		}

		const copiedSession = structuredClone(session);

		if (config) {
			if (config.numRecentEvents) {
				copiedSession.events = copiedSession.events.slice(
					-config.numRecentEvents,
				);
			}
			if (config.afterTimestamp) {
				let i = copiedSession.events.length - 1;
				while (i >= 0) {
					if (copiedSession.events[i].timestamp < config.afterTimestamp) {
						break;
					}
					i--;
				}
				if (i >= 0) {
					copiedSession.events = copiedSession.events.slice(i + 1);
				}
			}
		}

		return this.mergeState(appName, userId, copiedSession);
	}

	private mergeState(
		appName: string,
		userId: string,
		copiedSession: Session,
	): Session {
		// Merge app state
		if (this.appState.has(appName)) {
			for (const [key, value] of this.appState.get(appName)!.entries()) {
				copiedSession.state[State.APP_PREFIX + key] = value;
			}
		}

		if (
			!this.userState.has(appName) ||
			!this.userState.get(appName)!.has(userId)
		) {
			return copiedSession;
		}

		// Merge session state with user state
		for (const [key, value] of this.userState
			.get(appName)!
			.get(userId)!
			.entries()) {
			copiedSession.state[State.USER_PREFIX + key] = value;
		}

		return copiedSession;
	}

	/**
	 * Lists all the sessions for a user.
	 */
	async listSessions(
		appName: string,
		userId: string,
	): Promise<ListSessionsResponse> {
		return this.listSessionsImpl(appName, userId);
	}

	/**
	 * @deprecated Please migrate to the async method.
	 */
	listSessionsSync(appName: string, userId: string): ListSessionsResponse {
		console.warn("Deprecated. Please migrate to the async method.");
		return this.listSessionsImpl(appName, userId);
	}

	private listSessionsImpl(
		appName: string,
		userId: string,
	): ListSessionsResponse {
		const emptyResponse: ListSessionsResponse = { sessions: [] };

		if (!this.sessions.has(appName)) {
			return emptyResponse;
		}
		if (!this.sessions.get(appName)!.has(userId)) {
			return emptyResponse;
		}

		const sessionsWithoutEvents: Session[] = [];
		for (const session of this.sessions.get(appName)!.get(userId)!.values()) {
			const copiedSession = structuredClone(session);
			copiedSession.events = [];
			copiedSession.state = {};
			sessionsWithoutEvents.push(copiedSession);
		}

		return { sessions: sessionsWithoutEvents };
	}

	/**
	 * Deletes a session.
	 */
	async deleteSession(
		appName: string,
		userId: string,
		sessionId: string,
	): Promise<void> {
		this.deleteSessionImpl(appName, userId, sessionId);
	}

	/**
	 * @deprecated Please migrate to the async method.
	 */
	deleteSessionSync(appName: string, userId: string, sessionId: string): void {
		console.warn("Deprecated. Please migrate to the async method.");
		this.deleteSessionImpl(appName, userId, sessionId);
	}

	private deleteSessionImpl(
		appName: string,
		userId: string,
		sessionId: string,
	): void {
		if (this.getSessionImpl(appName, userId, sessionId) === undefined) {
			return;
		}

		this.sessions.get(appName)!.get(userId)!.delete(sessionId);
	}

	/**
	 * Appends an event to a session object.
	 */
	async appendEvent(session: Session, event: Event): Promise<Event> {
		// Update the in-memory session
		await super.appendEvent(session, event);
		session.lastUpdateTime = event.timestamp;

		// Update the storage session
		const appName = session.appName;
		const userId = session.userId;
		const sessionId = session.id;

		const warning = (message: string): void => {
			console.warn(
				`Failed to append event to session ${sessionId}: ${message}`,
			);
		};

		if (!this.sessions.has(appName)) {
			warning(`appName ${appName} not in sessions`);
			return event;
		}
		if (!this.sessions.get(appName)!.has(userId)) {
			warning(`userId ${userId} not in sessions[appName]`);
			return event;
		}
		if (!this.sessions.get(appName)!.get(userId)!.has(sessionId)) {
			warning(`sessionId ${sessionId} not in sessions[appName][userId]`);
			return event;
		}

		if (event.actions?.stateDelta) {
			for (const key in event.actions.stateDelta) {
				const value = event.actions.stateDelta[key];
				if (key.startsWith(State.APP_PREFIX)) {
					if (!this.appState.has(appName)) {
						this.appState.set(appName, new Map());
					}
					this.appState
						.get(appName)!
						.set(key.substring(State.APP_PREFIX.length), value);
				}
				if (key.startsWith(State.USER_PREFIX)) {
					if (!this.userState.has(appName)) {
						this.userState.set(appName, new Map());
					}
					if (!this.userState.get(appName)!.has(userId)) {
						this.userState.get(appName)!.set(userId, new Map());
					}
					this.userState
						.get(appName)!
						.get(userId)!
						.set(key.substring(State.USER_PREFIX.length), value);
				}
			}
		}

		const storageSession = this.sessions
			.get(appName)!
			.get(userId)!
			.get(sessionId)!;
		await super.appendEvent(storageSession, event);
		storageSession.lastUpdateTime = event.timestamp;

		return event;
	}
}
