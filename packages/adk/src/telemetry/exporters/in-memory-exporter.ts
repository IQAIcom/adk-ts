import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { ADK_ATTRS } from "../constants";

/**
 * In-memory span exporter for debugging and visualization
 * Captures spans and stores them in memory for retrieval via API
 */
export class InMemorySpanExporter implements SpanExporter {
	private traces: Map<string, ReadableSpan[]> = new Map();
	private allSpans: ReadableSpan[] = [];
	private readonly maxSpans: number;

	constructor(maxSpans = 10000) {
		this.maxSpans = maxSpans;
	}

	/**
	 * Export spans
	 */
	export(
		spans: ReadableSpan[],
		resultCallback: (result: ExportResult) => void,
	): void {
		for (const span of spans) {
			this.allSpans.push(span);

			// Extract session ID from attributes
			const sessionId = span.attributes[ADK_ATTRS.SESSION_ID] as string;

			if (sessionId) {
				const sessionSpans = this.traces.get(sessionId) || [];
				sessionSpans.push(span);
				this.traces.set(sessionId, sessionSpans);
			}
		}

		// Prune if we exceed maxSpans (simple FIFO for global list)
		if (this.allSpans.length > this.maxSpans) {
			const removeCount = this.allSpans.length - this.maxSpans;
			this.allSpans.splice(0, removeCount);
			// Note: We're not actively pruning the session maps here for simplicity,
			// but in a production environment we would want to.
		}

		resultCallback({ code: ExportResultCode.SUCCESS });
	}

	/**
	 * Shutdown the exporter
	 */
	shutdown(): Promise<void> {
		this.reset();
		return Promise.resolve();
	}

	/**
	 * Force flush (no-op for in-memory)
	 */
	forceFlush(): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Reset/Clear all traces
	 */
	reset(): void {
		this.traces.clear();
		this.allSpans = [];
	}

	/**
	 * Get traces for a specific session
	 */
	getTracesForSession(sessionId: string): ReadableSpan[] {
		return this.traces.get(sessionId) || [];
	}

	/**
	 * Get all captured spans
	 */
	getAllSpans(): ReadableSpan[] {
		return this.allSpans;
	}
}
