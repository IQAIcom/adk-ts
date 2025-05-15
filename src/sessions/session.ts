import type { Content } from "../models/llm-request";
import {
	SessionLifecycleState,
	SessionState as SessionStateClass,
} from "./state";

/**
 * Represents a conversation session
 */
export interface Session {
	/**
	 * Unique session identifier
	 */
	id: string;

	/**
	 * Session creation timestamp
	 */
	created_at: Date;

	/**
	 * Last update timestamp
	 */
	updated_at: Date;

	/**
	 * Session state for storing arbitrary data
	 */
	state: SessionLifecycleState;

	/**
	 * Conversation history using Content/Part model
	 */
	contents?: Content[];

	/**
	 * For general session context
	 */
	context?: Record<string, any>;

	/**
	 * The following fields were from an older model or Python version and are likely replaced or managed differently
	 */
	// current_turn?: number;
	// max_turns?: number;
	// llm_name?: string;
	// user_id?: string;
	// user_profile?: Record<string, any>;
	// summary?: string;
	// tags?: string[];
	// version?: string;
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
	 * Offset for pagination
	 */
	offset?: number;

	/**
	 * Only include sessions with the specified state
	 */
	state?: SessionLifecycleState;

	/**
	 * Only include sessions with the specified user ID
	 */
	user_id?: string;

	/**
	 * Only include sessions with the specified tags
	 */
	tags?: string[];

	/**
	 * Only include sessions created after this time
	 */
	created_after?: Date;

	/**
	 * Only include sessions created before this time
	 */
	created_before?: Date;

	/**
	 * Filter sessions by metadata
	 */
	// metadataFilter?: Record<string, any>;
}

// Re-export the enum if needed by consumers of this module
export { SessionLifecycleState };
