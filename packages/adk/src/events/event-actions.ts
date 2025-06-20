/**
 * Represents the actions attached to an event.
 */
export class EventActions {
	/**
	 * If true, it won't call model to summarize function response.
	 * Only used for function_response event.
	 */
	skipSummarization?: boolean;

	/**
	 * Indicates that the event is updating the state with the given delta.
	 */
	stateDelta: Record<string, any> = {};

	/**
	 * Indicates that the event is updating an artifact. key is the filename,
	 * value is the version.
	 */
	artifactDelta: Record<string, number> = {};

	/**
	 * If set, the event transfers to the specified agent.
	 */
	transferToAgent?: string;

	/**
	 * The agent is escalating to a higher level agent.
	 */
	escalate?: boolean;

	/**
	 * Requested authentication configurations.
	 */
	requestedAuthConfigs?: Record<string, any>;

	/**
	 * Constructor for EventActions
	 */
	constructor(
		options: {
			skipSummarization?: boolean;
			stateDelta?: Record<string, any>;
			artifactDelta?: Record<string, number>;
			transferToAgent?: string;
			escalate?: boolean;
			requestedAuthConfigs?: Record<string, any>;
		} = {},
	) {
		this.skipSummarization = options.skipSummarization;
		this.stateDelta = options.stateDelta || {};
		this.artifactDelta = options.artifactDelta || {};
		this.transferToAgent = options.transferToAgent;
		this.escalate = options.escalate;
		this.requestedAuthConfigs = options.requestedAuthConfigs;
	}
}
