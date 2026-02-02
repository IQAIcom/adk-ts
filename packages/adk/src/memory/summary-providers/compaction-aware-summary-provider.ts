import type { Event } from "../../events/event";
import type { Session } from "../../sessions/session";
import type { SessionSummary, SummaryProvider } from "../types";
import { LlmSummaryProvider } from "./llm-summary-provider";

interface CompactionAwareSummaryProviderConfig {
	/**
	 * Model ID for LLM-based summarization of non-compacted events
	 */
	model: string;

	/**
	 * Custom prompt template for summarization
	 */
	prompt?: string;
}

/**
 * Summary provider that extracts summaries from compaction events
 * and uses LLM only for events after the last compaction.
 *
 * This is more efficient when event compaction is enabled, as it
 * reuses existing summaries instead of regenerating them.
 */
export class CompactionAwareSummaryProvider implements SummaryProvider {
	private fallbackProvider: SummaryProvider;

	/**
	 * Creates a new compaction-aware summary provider
	 * @param provider A SummaryProvider to use for non-compacted events, or config for creating an LlmSummaryProvider
	 */
	constructor(
		provider: SummaryProvider | CompactionAwareSummaryProviderConfig,
	) {
		if ("getSummaries" in provider) {
			this.fallbackProvider = provider;
		} else {
			this.fallbackProvider = new LlmSummaryProvider(provider);
		}
	}

	/**
	 * Generates summaries from a session, extracting from compaction events
	 * when available and using LLM for the remainder
	 */
	async getSummaries(session: Session): Promise<SessionSummary[]> {
		const summaries: SessionSummary[] = [];

		// Find all compaction events and extract their summaries
		const compactionEvents = session.events.filter(
			(event) => event.actions?.compaction?.compactedContent,
		);

		// Track the latest compaction end timestamp
		let lastCompactionEndTimestamp = 0;

		for (const event of compactionEvents) {
			const compaction = event.actions!.compaction!;
			const summaryText = this.extractTextFromCompaction(
				compaction.compactedContent,
			);

			if (summaryText) {
				summaries.push({
					summary: summaryText,
					startTimestamp: compaction.startTimestamp,
					endTimestamp: compaction.endTimestamp,
				});

				if (compaction.endTimestamp > lastCompactionEndTimestamp) {
					lastCompactionEndTimestamp = compaction.endTimestamp;
				}
			}
		}

		// Find events after the last compaction that need summarization
		const eventsAfterCompaction = session.events.filter(
			(event) =>
				event.timestamp > lastCompactionEndTimestamp &&
				event.content?.parts?.length &&
				!event.actions?.compaction, // Exclude compaction events themselves
		);

		// If there are significant events after compaction, summarize them
		if (eventsAfterCompaction.length > 0) {
			// Create a temporary session with just the non-compacted events
			const tempSession: Session = {
				...session,
				events: eventsAfterCompaction,
			};

			const additionalSummaries =
				await this.fallbackProvider.getSummaries(tempSession);
			summaries.push(...additionalSummaries);
		}

		return summaries;
	}

	/**
	 * Extracts text content from compacted content
	 */
	private extractTextFromCompaction(content: {
		role?: string;
		parts?: Array<{ text?: string }>;
	}): string | undefined {
		if (!content.parts) {
			return undefined;
		}

		const texts = content.parts
			.filter((part) => part.text)
			.map((part) => part.text!);

		return texts.length > 0 ? texts.join(" ") : undefined;
	}
}
