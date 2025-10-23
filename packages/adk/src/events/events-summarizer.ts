import type { Event } from "./event";

/**
 * Base interface for event summarizers.
 * Implementations convert a list of events into a single compaction event.
 */
export interface EventsSummarizer {
	/**
	 * Attempts to summarize a list of events into a single compaction event.
	 * @param events - The events to summarize
	 * @returns A compaction carrier event with actions.compaction set, or undefined if no summarization is needed
	 */
	maybeSummarizeEvents(events: Event[]): Promise<Event | undefined>;
}
