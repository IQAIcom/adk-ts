import type { AuthConfig } from "../auth/auth-config";

/**
 * Represents the actions attached to an event.
 * Ported from Python's EventActions.
 */
export interface EventActions {
	/**
	 * If true, it won't call model to summarize function response.
	 * Only used for function_response event.
	 */
	skipSummarization?: boolean;

	/**
	 * Indicates that the event is updating the state with the given delta.
	 */
	stateDelta?: Record<string, any>; // Python: dict[str, object]

	/**
	 * Indicates that the event is updating an artifact. Key is the filename, value is the version.
	 */
	artifactDelta?: Record<string, number>; // Python: dict[str, int]

	/**
	 * If set, the event transfers to the specified agent.
	 */
	transferToAgent?: string;

	/**
	 * The agent is escalating to a higher level agent.
	 */
	escalate?: boolean;

	/**
	 * Authentication configurations requested by tool responses.
	 * Keys: The function call id.
	 * Values: The requested auth config.
	 */
	requestedAuthConfigs?: Record<string, AuthConfig>;
}
