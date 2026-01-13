import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { ADK_ATTRS } from "./constants";

export class CustomInMemorySpanExporter implements SpanExporter {
	private spans: ReadableSpan[] = [];
	private traceDict: Map<string, string[]> = new Map();

	/**
	 * Export spans and build session-to-trace mapping
	 */
	export(
		spans: ReadableSpan[],
		resultCallback: (result: ExportResult) => void,
	): void {
		console.log("CustomInMemorySpanExporter spans ->", spans);
		for (const span of spans) {
			const traceId = span.spanContext().traceId;

			const sessionId = span.attributes[ADK_ATTRS.SESSION_ID] as
				| string
				| undefined;

			if (sessionId) {
				// Add trace ID to session's trace list
				const existingTraces = this.traceDict.get(sessionId);
				if (existingTraces) {
					if (!existingTraces.includes(traceId)) {
						existingTraces.push(traceId);
					}
				} else {
					this.traceDict.set(sessionId, [traceId]);
				}
			}
		}

		// Store all spans
		this.spans.push(...spans);

		// Return success
		resultCallback({ code: ExportResultCode.SUCCESS });
	}

	/**
	 * Get all finished spans
	 */
	getFinishedSpans(): ReadableSpan[] {
		return this.spans;
	}

	/**
	 * Get spans for a specific session (efficient lookup using trace dict)
	 */
	getFinishedSpansForSession(sessionId: string): ReadableSpan[] {
		const traceIds = this.traceDict.get(sessionId);

		if (!traceIds || traceIds.length === 0) {
			return [];
		}

		// Convert to Set for O(1) lookup
		const traceIdSet = new Set(traceIds);

		// Filter spans by trace IDs associated with this session
		return this.spans.filter((span) =>
			traceIdSet.has(span.spanContext().traceId),
		);
	}

	/**
	 * Get all session IDs that have been tracked
	 */
	getSessionIds(): string[] {
		return Array.from(this.traceDict.keys());
	}

	/**
	 * Get trace IDs for a specific session
	 */
	getTraceIdsForSession(sessionId: string): string[] {
		return this.traceDict.get(sessionId) || [];
	}

	/**
	 * Force flush (no-op for in-memory exporter)
	 */
	async forceFlush(): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Shutdown the exporter
	 */
	async shutdown(): Promise<void> {
		this.clear();
		return Promise.resolve();
	}

	/**
	 * Clear all stored spans and trace mappings
	 */
	clear(): void {
		this.spans = [];
		this.traceDict.clear();
	}

	/**
	 * Get statistics about stored data
	 */
	getStats(): {
		totalSpans: number;
		totalSessions: number;
		sessionStats: {
			sessionId: string;
			traceCount: number;
			spanCount: number;
		}[];
	} {
		const sessionStats = Array.from(this.traceDict.entries()).map(
			([sessionId, traceIds]) => {
				const traceIdSet = new Set(traceIds);
				const spanCount = this.spans.filter((span) =>
					traceIdSet.has(span.spanContext().traceId),
				).length;

				return {
					sessionId,
					traceCount: traceIds.length,
					spanCount,
				};
			},
		);

		return {
			totalSpans: this.spans.length,
			totalSessions: this.traceDict.size,
			sessionStats,
		};
	}
}
