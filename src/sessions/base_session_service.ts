// Base session service module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the base session service functionality from the Python SDK

import { Event } from "../events/event";
import { Session } from "./session";
import { State } from "./state";

/**
 * The configuration of getting a session.
 */
export class GetSessionConfig {
	/**
	 * Number of recent events to include.
	 */
	numRecentEvents?: number;

	/**
	 * Only include events after this timestamp.
	 */
	afterTimestamp?: number;

	/**
	 * Creates a new GetSessionConfig.
	 */
	constructor(
		data: {
			numRecentEvents?: number;
			afterTimestamp?: number;
		} = {},
	) {
		this.numRecentEvents = data.numRecentEvents;
		this.afterTimestamp = data.afterTimestamp;
	}
}

/**
 * The response of listing sessions.
 *
 * The events and states are not set within each Session object.
 */
export class ListSessionsResponse {
	/**
	 * The sessions in the response.
	 */
	sessions: Session[];

	/**
	 * Creates a new ListSessionsResponse.
	 */
	constructor(
		data: {
			sessions?: Session[];
		} = {},
	) {
		this.sessions = data.sessions || [];
	}
}

/**
 * The response of listing events in a session.
 */
export class ListEventsResponse {
	/**
	 * The events in the response.
	 */
	events: Event[];

	/**
	 * Token for the next page of results.
	 */
	nextPageToken?: string;

	/**
	 * Creates a new ListEventsResponse.
	 */
	constructor(
		data: {
			events?: Event[];
			nextPageToken?: string;
		} = {},
	) {
		this.events = data.events || [];
		this.nextPageToken = data.nextPageToken;
	}
}

/**
 * Base class for session services.
 *
 * The service provides a set of methods for managing sessions and events.
 */
export abstract class BaseSessionService {
	/**
	 * Creates a new session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param state The initial state of the session
	 * @param sessionId The client-provided id of the session (if not provided, a generated ID will be used)
	 * @returns The newly created session instance
	 */
	abstract createSession(
		appName: string,
		userId: string,
		state?: Record<string, any>,
		sessionId?: string,
	): Session;

	/**
	 * Gets a session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param sessionId The id of the session
	 * @param config The configuration for getting the session
	 * @returns The session, or null if not found
	 */
	abstract getSession(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Session | null;

	/**
	 * Lists all the sessions.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @returns The response containing sessions
	 */
	abstract listSessions(appName: string, userId: string): ListSessionsResponse;

	/**
	 * Deletes a session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param sessionId The id of the session
	 */
	abstract deleteSession(
		appName: string,
		userId: string,
		sessionId: string,
	): void;

	/**
	 * Lists events in a session.
	 *
	 * @param appName The name of the app
	 * @param userId The id of the user
	 * @param sessionId The id of the session
	 * @returns The response containing events
	 */
	abstract listEvents(
		appName: string,
		userId: string,
		sessionId: string,
	): ListEventsResponse;

	/**
	 * Closes a session.
	 *
	 * @param session The session to close
	 */
	closeSession(session: Session): void {
		// TODO: determine whether we want to finalize the session here.
	}

	/**
	 * Appends an event to a session object.
	 *
	 * @param session The session to append to
	 * @param event The event to append
	 * @returns The event that was appended
	 */
	appendEvent(session: Session, event: Event): Event {
		if (event.isPartial()) {
			return event;
		}

		this.updateSessionState(session, event);
		session.events.push(event);

		return event;
	}

	/**
	 * Updates the session state based on the event.
	 *
	 * @param session The session to update
	 * @param event The event with state delta
	 */
	private updateSessionState(session: Session, event: Event): void {
		const actions = event.getActions();
		if (!actions || !actions.stateDelta) {
			return;
		}

		for (const [key, value] of Object.entries(actions.stateDelta)) {
			if (key.startsWith(State.TEMP_PREFIX)) {
				continue;
			}

			session.state[key] = value;
		}
	}
}
