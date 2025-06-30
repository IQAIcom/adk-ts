import type { Event } from "@adk/events/event";

/**
 * Represents a series of interactions between a user and agents.
 */
export interface Session {
	/**
	 * The unique identifier of the session.
	 */
	id: string;

	/**
	 * The name of the app.
	 */
	appName: string;

	/**
	 * The id of the user.
	 */
	userId: string;

	/**
	 * The state of the session.
	 */
	state: Record<string, any>;

	/**
	 * The events of the session, e.g. user input, model response, function
	 * call/response, etc.
	 */
	events: Event[];

	/**
	 * The last update time of the session.
	 */
	lastUpdateTime: number;
}
