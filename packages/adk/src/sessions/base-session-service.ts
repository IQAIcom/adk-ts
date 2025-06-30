import type { Event } from "@adk/events/event";
import type { Session } from "./session";

/**
 * Configuration for getting a session.
 */
export interface GetSessionConfig {
	/** Number of recent events to include. */
	numRecentEvents?: number;
	/** Only include events after this timestamp (seconds since epoch). */
	afterTimestamp?: number;
}

/**
 * Response for listing sessions.
 * The events and states are not set within each Session object.
 */
export interface ListSessionsResponse {
	/** The list of sessions. */
	sessions: Session[];
}

/**
 * Base class for session services.
 * The service provides a set of methods for managing sessions and events.
 */
export abstract class BaseSessionService {
	/**
	 * Creates a new session.
	 * @param appName The name of the app.
	 * @param userId The id of the user.
	 * @param state The initial state of the session.
	 * @param sessionId The client-provided id of the session. If not provided, a generated ID will be used.
	 * @returns The newly created session instance.
	 */
	abstract createSession(
		appName: string,
		userId: string,
		state?: Record<string, any>,
		sessionId?: string,
	): Promise<Session>;

	/**
	 * Gets a session.
	 * @param appName The name of the app.
	 * @param userId The id of the user.
	 * @param sessionId The id of the session.
	 * @param config Optional config for getting the session.
	 * @returns The session or undefined if not found.
	 */
	abstract getSession(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Promise<Session | undefined>;

	/**
	 * Lists all the sessions.
	 * @param appName The name of the app.
	 * @param userId The id of the user.
	 * @returns The response containing the list of sessions.
	 */
	abstract listSessions(
		appName: string,
		userId: string,
	): Promise<ListSessionsResponse>;

	/**
	 * Deletes a session.
	 * @param appName The name of the app.
	 * @param userId The id of the user.
	 * @param sessionId The id of the session.
	 */
	abstract deleteSession(
		appName: string,
		userId: string,
		sessionId: string,
	): Promise<void>;

	/**
	 * Appends an event to a session object.
	 * @param session The session to append the event to.
	 * @param event The event to append.
	 * @returns The appended event.
	 */
	async appendEvent(session: Session, event: Event): Promise<Event> {
		if (event.partial) {
			return event;
		}
		this.updateSessionState(session, event);
		session.events.push(event);
		return event;
	}

	/**
	 * Updates the session state based on the event.
	 * @param session The session to update.
	 * @param event The event containing state changes.
	 */
	protected updateSessionState(session: Session, event: Event): void {
		if (!event.actions || !event.actions.stateDelta) {
			return;
		}
		for (const key in event.actions.stateDelta) {
			if (Object.prototype.hasOwnProperty.call(event.actions.stateDelta, key)) {
				if (key.startsWith("temp_")) {
					continue;
				}
				session.state[key] = event.actions.stateDelta[key];
			}
		}
	}
}
