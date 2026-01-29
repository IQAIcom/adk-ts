import { type ReadableSpan, telemetryService } from "@iqai/adk";
import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("debug")
@Controller("debug/trace")
export class TraceController {
	@Get("session/:sessionId")
	@ApiOperation({ summary: "Get traces for a session" })
	@ApiResponse({
		status: 200,
		description: "Return trace data for the session.",
	})
	@ApiResponse({
		status: 404,
		description: "Session not found or no traces available.",
	})
	getTraces(@Param("sessionId") sessionId: string) {
		// Check if telemetry service is initialized
		if (!telemetryService.initialized) {
			return [];
		}

		const traces = telemetryService.getTracesForSession(sessionId);

		// Return empty array if no traces found for the session
		// This prevents 404 errors when frontend polls for non-existent sessions
		return traces.map((span: ReadableSpan) => {
			const ctx = span.spanContext();
			return {
				trace_id: ctx.traceId,
				span_id: ctx.spanId,
				parent_span_id: span.parentSpanContext?.spanId,
				name: span.name,
				kind: span.kind,
				start_time: span.startTime,
				end_time: span.endTime,
				attributes: span.attributes,
				status: span.status,
				events: span.events,
			};
		});
	}
}
