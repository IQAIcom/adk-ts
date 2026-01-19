import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { ADK_ATTRS } from "./constants";

export class CustomInMemorySpanExporter implements SpanExporter {
	private spansByTraceId: Map<string, ReadableSpan[]> = new Map();
	private traceDict: Map<string, string[]> = new Map();

	export(
		spans: ReadableSpan[],
		resultCallback: (result: ExportResult) => void,
	): void {
		for (const span of spans) {
			const traceId = span.spanContext().traceId;
			const existingSpans = this.spansByTraceId.get(traceId);
			if (existingSpans) {
				existingSpans.push(span);
			} else {
				this.spansByTraceId.set(traceId, [span]);
			}

			const sessionId = span.attributes[ADK_ATTRS.SESSION_ID] as
				| string
				| undefined;

			if (sessionId) {
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

		resultCallback({ code: ExportResultCode.SUCCESS });
	}

	/**
	 * Get all finished spans
	 */
	getFinishedSpans(): ReadableSpan[] {
		const allSpans: ReadableSpan[] = [];
		for (const spans of this.spansByTraceId.values()) {
			allSpans.push(...spans);
		}
		return allSpans;
	}

	/**
	 * Get spans for a specific session (efficient)
	 */
	getFinishedSpansForSession(sessionId: string): ReadableSpan[] {
		const traceIds = this.traceDict.get(sessionId);
		if (!traceIds || traceIds.length === 0) {
			return [];
		}

		const result: ReadableSpan[] = [];
		for (const traceId of traceIds) {
			const spans = this.spansByTraceId.get(traceId);
			if (spans) {
				result.push(...spans);
			}
		}

		return result;
	}

	/**
	 * Get all session IDs
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
	 * Force flush (no-op)
	 */
	async forceFlush(): Promise<void> {
		return;
	}

	/**
	 * Shutdown exporter
	 */
	async shutdown(): Promise<void> {
		this.clear();
	}

	/**
	 * Clear all stored data
	 */
	clear(): void {
		this.spansByTraceId.clear();
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
		let totalSpans = 0;
		for (const spans of this.spansByTraceId.values()) {
			totalSpans += spans.length;
		}

		const sessionStats = Array.from(this.traceDict.entries()).map(
			([sessionId, traceIds]) => {
				let spanCount = 0;
				for (const traceId of traceIds) {
					const spans = this.spansByTraceId.get(traceId);
					if (spans) {
						spanCount += spans.length;
					}
				}

				return {
					sessionId,
					traceCount: traceIds.length,
					spanCount,
				};
			},
		);

		return {
			totalSpans,
			totalSessions: this.traceDict.size,
			sessionStats,
		};
	}
}
