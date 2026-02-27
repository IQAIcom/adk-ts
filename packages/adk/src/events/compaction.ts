import { Logger } from "../logger";
import type { BaseSessionService } from "../sessions/base-session-service";
import type { Session } from "../sessions/session";
import type { EventsCompactionConfig } from "./compaction-config";
import type { Event } from "./event";
import type { EventsSummarizer } from "./events-summarizer";

const logger = new Logger({ name: "EventCompaction" });

/**
 * Runs compaction for a sliding window of invocations.
 * This function implements the core sliding window logic from ADK Python.
 */
export async function runCompactionForSlidingWindow(
	config: EventsCompactionConfig,
	session: Session,
	sessionService: BaseSessionService,
	summarizer: EventsSummarizer,
): Promise<void> {
	if (!session.events || session.events.length === 0) {
		return;
	}

	const lastCompactedEndTimestamp = findLastCompactedEndTimestamp(
		session.events,
	);

	const latestTimestampByInvocation = buildLatestTimestampByInvocation(
		session.events,
	);

	const uniqueInvocationIds = Array.from(latestTimestampByInvocation.keys());

	const newInvocationIds = uniqueInvocationIds.filter(
		(invId) =>
			(latestTimestampByInvocation.get(invId) || 0) > lastCompactedEndTimestamp,
	);

	if (newInvocationIds.length < config.compactionInterval) {
		logger.debug(
			`Not enough new invocations for compaction. Need ${config.compactionInterval}, have ${newInvocationIds.length}`,
		);
		return;
	}

	const endInvId = newInvocationIds[newInvocationIds.length - 1];
	const firstNewInvId = newInvocationIds[0];
	const firstNewInvIdx = uniqueInvocationIds.indexOf(firstNewInvId);
	const startIdx = Math.max(0, firstNewInvIdx - config.overlapSize);
	const startInvId = uniqueInvocationIds[startIdx];

	logger.debug(
		`Compacting invocations from ${startInvId} to ${endInvId} (${newInvocationIds.length} new invocations, overlap: ${config.overlapSize})`,
	);

	const eventsToCompact = sliceEventsByInvocationRange(
		session.events,
		startInvId,
		endInvId,
	);

	if (eventsToCompact.length === 0) {
		logger.debug("No events to compact after filtering");
		return;
	}

	logger.debug(`Summarizing ${eventsToCompact.length} events`);
	const compactionEvent =
		await summarizer.maybeSummarizeEvents(eventsToCompact);

	if (compactionEvent) {
		logger.debug(
			`Compaction created covering timestamps ${compactionEvent.actions.compaction?.startTimestamp} to ${compactionEvent.actions.compaction?.endTimestamp}`,
		);
		await sessionService.appendEvent(session, compactionEvent);
	}
}

/**
 * Finds the end timestamp of the last compaction event.
 * Returns 0 if no compaction events are found.
 */
function findLastCompactedEndTimestamp(events: Event[]): number {
	for (let i = events.length - 1; i >= 0; i--) {
		const event = events[i];
		if (event.actions?.compaction) {
			return event.actions.compaction.endTimestamp;
		}
	}
	return 0;
}

/**
 * Builds a map of invocation ID to the latest timestamp within that invocation.
 * Excludes compaction events from this mapping.
 */
function buildLatestTimestampByInvocation(
	events: Event[],
): Map<string, number> {
	const latestByInvocation = new Map<string, number>();

	for (const event of events) {
		if (event.actions?.compaction) {
			continue;
		}

		const invId = event.invocationId;
		if (!invId) {
			continue;
		}

		const current = latestByInvocation.get(invId) || 0;
		if (event.timestamp > current) {
			latestByInvocation.set(invId, event.timestamp);
		}
	}

	return latestByInvocation;
}

/**
 * Slices events between the first occurrence of startInvId and the last
 * occurrence of endInvId, excluding any compaction events.
 */
function sliceEventsByInvocationRange(
	events: Event[],
	startInvId: string,
	endInvId: string,
): Event[] {
	let firstIndex = -1;
	let lastIndex = -1;

	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		if (event.invocationId === startInvId && firstIndex === -1) {
			firstIndex = i;
		}
		if (event.invocationId === endInvId) {
			lastIndex = i;
		}
	}

	if (firstIndex === -1 || lastIndex === -1 || firstIndex > lastIndex) {
		return [];
	}

	const slicedEvents = events.slice(firstIndex, lastIndex + 1);

	return slicedEvents.filter((event) => !event.actions?.compaction);
}
