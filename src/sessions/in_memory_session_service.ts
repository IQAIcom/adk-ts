// In-memory session service module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the in-memory session service functionality from the Python SDK

import type { Event } from "../events/event";
import {
	BaseSessionService,
	type GetSessionConfig,
	ListEventsResponse,
	ListSessionsResponse,
} from "./base_session_service";
import { Session } from "./session";
import { State } from "./state";

/**
 * An in-memory implementation of the session service.
 */
export class InMemorySessionService extends BaseSessionService {
	/**
	 * A map from app name to a map from user ID to a map from session ID to session.
	 */
	private sessions: Record<string, Record<string, Record<string, Session>>> =
		{};

	/**
	 * A map from app name to a map from user ID to a map from key to the value.
	 */
	private userState: Record<string, Record<string, Record<string, unknown>>> =
		{};

	/**
	 * A map from app name to a map from key to the value.
	 */
	private appState: Record<string, Record<string, unknown>> = {};

	/**
	 * Creates a new session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param state The initial state of the session
	 * @param sessionId The client-provided id of the session
	 * @returns The newly created session instance
	 */
	createSession(
		appName: string,
		userId: string,
		state?: Record<string, unknown>,
		sessionId?: string,
	): Session {
		const finalSessionId = sessionId?.trim() || this.generateSessionId();

		const session = new Session({
			id: finalSessionId,
			appName,
			userId,
			state: state || {},
			lastUpdateTime: Date.now(),
		});

		// Create nested maps if they don't exist
		if (!this.sessions[appName]) {
			this.sessions[appName] = {};
		}

		if (!this.sessions[appName][userId]) {
			this.sessions[appName][userId] = {};
		}

		// Store the session
		this.sessions[appName][userId][finalSessionId] = session;

		// Create a deep copy and merge state
		const copiedSession = this.deepCopySession(session);
		return this.mergeState(appName, userId, copiedSession);
	}

	/**
	 * Gets a session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param sessionId The id of the session
	 * @param config The configuration for getting the session
	 * @returns The session, or null if not found
	 */
	getSession(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Session | null {
		// Check if session exists
		if (!this.sessions[appName]?.[userId]?.[sessionId]) {
			return null;
		}

		const session = this.sessions[appName][userId][sessionId];
		const copiedSession = this.deepCopySession(session);

		// Apply config if provided
		if (config) {
			if (config.numRecentEvents) {
				const startIndex = Math.max(
					0,
					copiedSession.events.length - config.numRecentEvents,
				);
				copiedSession.events = copiedSession.events.slice(startIndex);
			} else if (config.afterTimestamp) {
				let i = copiedSession.events.length - 1;
				while (i >= 0) {
					if (copiedSession.events[i].getTimestamp() < config.afterTimestamp) {
						break;
					}
					i -= 1;
				}

				if (i >= 0) {
					copiedSession.events = copiedSession.events.slice(i);
				}
			}
		}

		return this.mergeState(appName, userId, copiedSession);
	}

	/**
	 * Lists all the sessions.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @returns The response containing sessions
	 */
	listSessions(appName: string, userId: string): ListSessionsResponse {
		// Check if sessions exist for the app and user
		if (!this.sessions[appName]?.[userId]) {
			return new ListSessionsResponse();
		}

		// Create copies of sessions without events or state
		const sessionsWithoutEvents: Session[] = [];

		for (const session of Object.values(this.sessions[appName][userId])) {
			const copiedSession = new Session({
				id: session.id,
				appName: session.appName,
				userId: session.userId,
				lastUpdateTime: session.lastUpdateTime,
			});

			sessionsWithoutEvents.push(copiedSession);
		}

		return new ListSessionsResponse({ sessions: sessionsWithoutEvents });
	}

	/**
	 * Deletes a session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param sessionId The id of the session
	 */
	deleteSession(appName: string, userId: string, sessionId: string): void {
		// Check if session exists before deleting
		if (this.getSession(appName, userId, sessionId)) {
			delete this.sessions[appName][userId][sessionId];
		}
	}

	/**
	 * Lists events in a session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param sessionId The id of the session
	 * @returns The response containing events
	 */
	listEvents(
		appName: string,
		userId: string,
		sessionId: string,
	): ListEventsResponse {
		// Check if session exists
		if (!this.sessions[appName]?.[userId]?.[sessionId]) {
			return new ListEventsResponse();
		}

		const session = this.sessions[appName][userId][sessionId];
		return new ListEventsResponse({
			events: session.events.slice(), // Return a copy of the events array
		});
	}

	/**
	 * Appends an event to a session.
	 *
	 * @param session The session to append to
	 * @param event The event to append
	 * @returns The event that was appended
	 */
	override appendEvent(session: Session, event: Event): Event {
		// Update the in-memory session
		super.appendEvent(session, event);
		session.lastUpdateTime = event.getTimestamp();

		// Update the storage session
		const appName = session.appName;
		const userId = session.userId;
		const sessionId = session.id;

		if (!this.sessions[appName]?.[userId]?.[sessionId]) {
			return event;
		}

		// Update app and user state if needed
		if (event.getActions()?.stateDelta) {
			const stateDelta = event.getActions()?.stateDelta;
			if (stateDelta) {
				for (const [key, value] of Object.entries(stateDelta)) {
					if (key.startsWith(State.APP_PREFIX)) {
						if (!this.appState[appName]) {
							this.appState[appName] = {};
						}

						const realKey = key.substring(State.APP_PREFIX.length);
						this.appState[appName][realKey] = value;
					}

					if (key.startsWith(State.USER_PREFIX)) {
						if (!this.userState[appName]) {
							this.userState[appName] = {};
						}

						if (!this.userState[appName][userId]) {
							this.userState[appName][userId] = {};
						}

						const realKey = key.substring(State.USER_PREFIX.length);
						this.userState[appName][userId][realKey] = value;
					}
				}
			}
		}

		// Update the storage session
		const storageSession = this.sessions[appName][userId][sessionId];
		super.appendEvent(storageSession, event);
		storageSession.lastUpdateTime = event.getTimestamp();

		return event;
	}

	/**
	 * Creates a deep copy of a session.
	 *
	 * @param session The session to copy
	 * @returns A deep copy of the session
	 */
	private deepCopySession(session: Session): Session {
		return new Session({
			id: session.id,
			appName: session.appName,
			userId: session.userId,
			state: JSON.parse(JSON.stringify(session.state)),
			events: session.events.map((event) => event), // Events are already immutable
			lastUpdateTime: session.lastUpdateTime,
		});
	}

	/**
	 * Merges app and user state into the session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param copiedSession The session to merge state into
	 * @returns The session with merged state
	 */
	private mergeState(
		appName: string,
		userId: string,
		copiedSession: Session,
	): Session {
		// Merge app state
		if (this.appState[appName]) {
			for (const [key, value] of Object.entries(this.appState[appName])) {
				copiedSession.state[State.APP_PREFIX + key] = value;
			}
		}

		// Merge user state
		if (this.userState[appName]?.[userId]) {
			for (const [key, value] of Object.entries(
				this.userState[appName][userId],
			)) {
				copiedSession.state[State.USER_PREFIX + key] = value;
			}
		}

		return copiedSession;
	}

	/**
	 * Generates a random session ID.
	 *
	 * @returns A new random session ID
	 */
	private generateSessionId(): string {
		return (
			Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15)
		);
	}
}
