import type { Content } from "@google/genai";

/**
 * Event compaction data structure containing the summarized content
 * and the timestamp range it covers.
 */
export interface EventCompaction {
	startTimestamp: number;
	endTimestamp: number;
	compactedContent: Content;
}

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
	 * Event compaction information. When set, this event represents
	 * a compaction of events within the specified timestamp range.
	 */
	compaction?: EventCompaction;

	/**
	 * The invocation id to rewind to. This is only set for rewind event.
	 */
	rewindBeforeInvocationId?: string;

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
			compaction?: EventCompaction;
			rewindBeforeInvocationId?: string;
		} = {},
	) {
		this.skipSummarization = options.skipSummarization;
		this.stateDelta = options.stateDelta || {};
		this.artifactDelta = options.artifactDelta || {};
		this.transferToAgent = options.transferToAgent;
		this.escalate = options.escalate;
		this.requestedAuthConfigs = options.requestedAuthConfigs;
		this.compaction = options.compaction;
		this.rewindBeforeInvocationId = options.rewindBeforeInvocationId;
	}
}
