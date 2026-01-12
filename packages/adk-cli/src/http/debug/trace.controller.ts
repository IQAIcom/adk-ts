import { type ReadableSpan, telemetryService } from "@iqai/adk";
import { Controller, Get, Param } from "@nestjs/common";
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
	getTraces(@Param("sessionId") sessionId: string) {
		console.log("sessionId", sessionId);
		const traces = telemetryService.getTracesForSession(sessionId);
		console.log("traces", traces);
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
