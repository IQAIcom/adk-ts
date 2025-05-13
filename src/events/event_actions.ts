// Event actions module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the event actions functionality from the Python SDK

/**
 * Represents actions associated with an event.
 *
 * Event actions can include state changes, agent transfers, and other
 * operational requests that are associated with an event.
 */
export class EventActions {
	/**
	 * Dictionary containing authentication configurations requested during an event
	 */
	requestedAuthConfigs: Record<string, unknown> = {};

	/**
	 * Name of the agent to transfer control to
	 */
	transferToAgent?: string;

	/**
	 * Changes to make to the state
	 */
	stateDelta?: Record<string, unknown>;

	/**
	 * Whether to skip summarization of agent output
	 */
	skipSummarization?: boolean;

	/**
	 * Whether to escalate to parent agent
	 */
	escalate?: boolean;

	/**
	 * Whether the turn is complete
	 */
	turnComplete?: boolean;

	/**
	 * Creates a new EventActions instance
	 *
	 * @param options Initial values for the event actions
	 */
	constructor(
		options: {
			requestedAuthConfigs?: Record<string, unknown>;
			transferToAgent?: string;
			stateDelta?: Record<string, unknown>;
			skipSummarization?: boolean;
			escalate?: boolean;
			turnComplete?: boolean;
		} = {},
	) {
		this.requestedAuthConfigs = options.requestedAuthConfigs || {};
		this.transferToAgent = options.transferToAgent;
		this.stateDelta = options.stateDelta;
		this.skipSummarization = options.skipSummarization;
		this.escalate = options.escalate;
		this.turnComplete = options.turnComplete;
	}

	/**
	 * Set a state value
	 *
	 * @param key The state key to set
	 * @param value The value to set
	 */
	setState(key: string, value: unknown): void {
		if (!this.stateDelta) {
			this.stateDelta = {};
		}
		this.stateDelta[key] = value;
	}

	/**
	 * Get a state value
	 *
	 * @param key The state key to get
	 * @returns The value or undefined if not found
	 */
	getState(key: string): unknown | undefined {
		return this.stateDelta ? this.stateDelta[key] : undefined;
	}

	/**
	 * Check if there are any state changes
	 *
	 * @returns True if there are state changes
	 */
	hasStateChanges(): boolean {
		return !!this.stateDelta && Object.keys(this.stateDelta).length > 0;
	}

	/**
	 * Merge this event actions with another one
	 *
	 * @param other The other event actions to merge with
	 * @returns A new merged event actions instance
	 */
	merge(other: EventActions): EventActions {
		const merged = new EventActions();

		// Merge requested auth configs
		merged.requestedAuthConfigs = {
			...this.requestedAuthConfigs,
			...other.requestedAuthConfigs,
		};

		// Use the last transfer agent
		merged.transferToAgent = other.transferToAgent || this.transferToAgent;

		// Merge state deltas
		if (this.stateDelta || other.stateDelta) {
			merged.stateDelta = {
				...(this.stateDelta || {}),
				...(other.stateDelta || {}),
			};
		}

		// Use the most restrictive summarization option
		merged.skipSummarization =
			this.skipSummarization || other.skipSummarization;

		// Merge escalate and turnComplete flags
		merged.escalate = this.escalate || other.escalate;
		merged.turnComplete = this.turnComplete || other.turnComplete;

		return merged;
	}
}
