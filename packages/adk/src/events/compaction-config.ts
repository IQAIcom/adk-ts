import type { EventsSummarizer } from "./events-summarizer";

/**
 * Configuration for event compaction feature.
 * Controls how and when session histories are compacted via summarization.
 */
export interface EventsCompactionConfig {
	/**
	 * The summarizer to use for compacting events.
	 * If not provided, a default LLM-based summarizer will be used.
	 */
	summarizer?: EventsSummarizer;

	/**
	 * Number of new invocations required to trigger compaction.
	 * When this many new invocations have been completed since the last
	 * compaction, a new compaction will be triggered.
	 * Default: 10
	 */
	compactionInterval: number;

	/**
	 * Number of prior invocations to include from the previous compacted
	 * range for continuity when creating a new compaction.
	 * This ensures some overlap between successive summaries.
	 * Default: 2
	 */
	overlapSize: number;
}
