import type { Event } from "../events/event";
import type { SessionState } from "./state";

/**
 * Represents a conversation session
 */
export interface Session {
	/**
	 * Unique session identifier
	 */
	id: string;

	/**
	 * User identifier associated with the session
	 */
	userId: string;

	/**
	 * Chronological list of events in the conversation.
	 * Replaces the previous `messages: Message[]`.
	 */
	events: Event[];

	/**
	 * Additional session metadata
	 */
	metadata: Record<string, any>;

	/**
	 * Session creation timestamp
	 */
	createdAt: Date;

	/**
	 * Last update timestamp
	 */
	updatedAt: Date;

	/**
	 * Session state for storing arbitrary data
	 */
	state: SessionState;
}

/**
 * Options for listing sessions
 */
export interface ListSessionOptions {
	/**
	 * Maximum number of sessions to return
	 */
	limit?: number;

	/**
	 * Only include sessions created after this time
	 */
	createdAfter?: Date;

	/**
	 * Only include sessions updated after this time
	 */
	updatedAfter?: Date;

	/**
	 * Filter sessions by metadata
	 */
	metadataFilter?: Record<string, any>;
}
