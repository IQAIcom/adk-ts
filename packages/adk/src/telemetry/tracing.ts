/**
 * Tracing Module
 * OpenTelemetry tracing utilities for ADK operations
 */

import { context, type Span, type Tracer, trace } from "@opentelemetry/api";
import type { InvocationContext } from "../agents/invocation-context";
import type { Event } from "../events/event";
import type { LlmRequest } from "../models/llm-request";
import type { LlmResponse } from "../models/llm-response";
import type { BaseTool } from "../tools";
import {
	ADK_ATTRS,
	ADK_SYSTEM_NAME,
	OPERATIONS,
	SEMCONV,
	SPAN_STATUS,
} from "./constants";
import {
	buildLlmRequestForTrace,
	buildLlmResponseForTrace,
	extractFinishReason,
	formatSpanAttributes,
	getEnvironment,
	safeJsonStringify,
	shouldCaptureContent,
} from "./utils";

/**
 * Tracing service for ADK operations
 */
export class TracingService {
	private tracer: Tracer | null = null;

	/**
	 * Initialize tracing with the provided tracer
	 */
	initialize(tracerName: string, version: string): void {
		this.tracer = trace.getTracer(tracerName, version);
	}

	/**
	 * Get the current tracer instance
	 */
	getTracer(): Tracer {
		if (!this.tracer) {
			// Return a default tracer if not initialized
			return trace.getTracer("iqai-adk", "0.0.0");
		}
		return this.tracer;
	}

	/**
	 * Check if tracing is initialized
	 */
	get initialized(): boolean {
		return this.tracer !== null;
	}

	/**
	 * Trace an agent invocation
	 * Sets standard OpenTelemetry GenAI attributes for agents
	 */
	traceAgentInvocation(
		agent: { name: string; description?: string },
		invocationContext: InvocationContext,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const attributes = formatSpanAttributes({
			// Standard GenAI attributes
			[SEMCONV.GEN_AI_SYSTEM]: ADK_SYSTEM_NAME,
			[SEMCONV.GEN_AI_OPERATION_NAME]: OPERATIONS.INVOKE_AGENT,
			[SEMCONV.GEN_AI_AGENT_NAME]: agent.name,
			[SEMCONV.GEN_AI_AGENT_DESCRIPTION]: agent.description || "",
			[SEMCONV.GEN_AI_CONVERSATION_ID]: invocationContext.session.id,

			// ADK-specific attributes
			[ADK_ATTRS.AGENT_NAME]: agent.name,
			[ADK_ATTRS.SESSION_ID]: invocationContext.session.id,
			[ADK_ATTRS.INVOCATION_ID]: invocationContext.invocationId,
			[ADK_ATTRS.USER_ID]: invocationContext.userId || "",
			[ADK_ATTRS.ENVIRONMENT]: getEnvironment() || "",
		});

		span.setAttributes(attributes);
	}

	/**
	 * Trace a tool call
	 * Sets standard OpenTelemetry GenAI attributes for tool execution
	 */
	traceToolCall(
		tool: BaseTool,
		args: Record<string, any>,
		functionResponseEvent: Event,
		llmRequest?: LlmRequest,
		invocationContext?: InvocationContext,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		let toolCallId = "<not_specified>";
		let toolResponse: any = "<not_specified>";

		// Extract tool call details from function response event
		if (
			functionResponseEvent.content?.parts &&
			functionResponseEvent.content.parts.length > 0
		) {
			const functionResponse =
				functionResponseEvent.content.parts[0].functionResponse;
			if (functionResponse) {
				toolCallId = functionResponse.id || "<not_specified>";
				toolResponse = functionResponse.response || "<not_specified>";
			}
		}

		const captureContent = shouldCaptureContent();

		const attributes = formatSpanAttributes({
			// Standard GenAI attributes
			[SEMCONV.GEN_AI_SYSTEM]: ADK_SYSTEM_NAME,
			[SEMCONV.GEN_AI_OPERATION_NAME]: OPERATIONS.EXECUTE_TOOL,
			[SEMCONV.GEN_AI_TOOL_NAME]: tool.name,
			[SEMCONV.GEN_AI_TOOL_DESCRIPTION]: tool.description || "",
			[SEMCONV.GEN_AI_TOOL_TYPE]: tool.constructor.name,
			[SEMCONV.GEN_AI_TOOL_CALL_ID]: toolCallId,

			// ADK-specific attributes
			[ADK_ATTRS.TOOL_NAME]: tool.name,
			[ADK_ATTRS.TOOL_ARGS]: captureContent ? safeJsonStringify(args) : "{}",
			[ADK_ATTRS.TOOL_RESPONSE]: captureContent
				? safeJsonStringify(toolResponse)
				: "{}",
			[ADK_ATTRS.EVENT_ID]: functionResponseEvent.invocationId,

			// Session context
			...(invocationContext && {
				[ADK_ATTRS.SESSION_ID]: invocationContext.session.id,
				[ADK_ATTRS.USER_ID]: invocationContext.userId || "",
				[ADK_ATTRS.INVOCATION_ID]: invocationContext.invocationId,
			}),

			[ADK_ATTRS.ENVIRONMENT]: getEnvironment() || "",
		});

		span.setAttributes(attributes);

		// Add LLM request if provided
		if (llmRequest && captureContent) {
			const llmRequestData = buildLlmRequestForTrace(
				llmRequest,
				captureContent,
			);
			span.setAttribute(
				ADK_ATTRS.LLM_REQUEST,
				safeJsonStringify(llmRequestData),
			);
		}
	}

	/**
	 * Trace an LLM call
	 * Sets standard OpenTelemetry GenAI attributes for LLM requests/responses
	 */
	traceLlmCall(
		invocationContext: InvocationContext,
		eventId: string,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const captureContent = shouldCaptureContent();
		const llmRequestData = buildLlmRequestForTrace(llmRequest, captureContent);
		const llmResponseData = buildLlmResponseForTrace(
			llmResponse,
			captureContent,
		);
		const finishReason = extractFinishReason(llmResponse);

		const attributes = formatSpanAttributes({
			// Standard GenAI attributes
			[SEMCONV.GEN_AI_SYSTEM]: ADK_SYSTEM_NAME,
			[SEMCONV.GEN_AI_OPERATION_NAME]: OPERATIONS.CALL_LLM,
			[SEMCONV.GEN_AI_REQUEST_MODEL]: llmRequest.model,

			// Model parameters
			[SEMCONV.GEN_AI_REQUEST_MAX_TOKENS]:
				llmRequest.config?.maxOutputTokens || 0,
			[SEMCONV.GEN_AI_REQUEST_TEMPERATURE]: llmRequest.config?.temperature || 0,
			[SEMCONV.GEN_AI_REQUEST_TOP_P]: llmRequest.config?.topP || 0,

			// Response metadata
			...(finishReason && {
				[SEMCONV.GEN_AI_RESPONSE_FINISH_REASONS]: [finishReason],
			}),

			// Token usage
			...(llmResponse.usageMetadata && {
				[SEMCONV.GEN_AI_USAGE_INPUT_TOKENS]:
					llmResponse.usageMetadata.promptTokenCount || 0,
				[SEMCONV.GEN_AI_USAGE_OUTPUT_TOKENS]:
					llmResponse.usageMetadata.candidatesTokenCount || 0,
				[SEMCONV.GEN_AI_USAGE_TOTAL_TOKENS]:
					(llmResponse.usageMetadata.promptTokenCount || 0) +
					(llmResponse.usageMetadata.candidatesTokenCount || 0),
			}),

			// ADK-specific attributes
			[ADK_ATTRS.LLM_MODEL]: llmRequest.model,
			[ADK_ATTRS.SESSION_ID]: invocationContext.session.id,
			[ADK_ATTRS.USER_ID]: invocationContext.userId || "",
			[ADK_ATTRS.INVOCATION_ID]: invocationContext.invocationId,
			[ADK_ATTRS.EVENT_ID]: eventId,
			[ADK_ATTRS.ENVIRONMENT]: getEnvironment() || "",

			// Content attributes (only if capture is enabled)
			[ADK_ATTRS.LLM_REQUEST]: captureContent
				? safeJsonStringify(llmRequestData)
				: "{}",
			[ADK_ATTRS.LLM_RESPONSE]: captureContent
				? safeJsonStringify(llmResponseData)
				: "{}",
		});

		span.setAttributes(attributes);

		// Add content as events (preferred for large payloads)
		if (captureContent) {
			span.addEvent(SEMCONV.GEN_AI_CONTENT_PROMPT, {
				"gen_ai.prompt": safeJsonStringify(llmRequestData.contents || []),
			});

			span.addEvent(SEMCONV.GEN_AI_CONTENT_COMPLETION, {
				"gen_ai.completion": safeJsonStringify(
					llmResponse.content || llmResponse.text || "",
				),
			});
		}
	}

	/**
	 * Wrap an async generator with tracing
	 * Automatically handles span lifecycle, context propagation, and exceptions
	 */
	async *traceAsyncGenerator<T>(
		spanName: string,
		generator: AsyncGenerator<T, void, unknown>,
		attributes?: Record<string, any>,
	): AsyncGenerator<T, void, unknown> {
		const tracer = this.getTracer();
		const span = tracer.startSpan(spanName);
		const spanContext = trace.setSpan(context.active(), span);

		// Set initial attributes if provided
		if (attributes) {
			span.setAttributes(formatSpanAttributes(attributes));
		}

		try {
			// Execute each iteration within the span context
			while (true) {
				const result = await context.with(spanContext, () => generator.next());

				if (result.done) {
					span.setStatus({ code: SPAN_STATUS.OK });
					break;
				}

				yield result.value as T;
			}
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({
				code: SPAN_STATUS.ERROR,
				message: (error as Error).message,
			});
			throw error;
		} finally {
			span.end();
		}
	}

	/**
	 * Create a new span and execute a function within it
	 */
	async withSpan<T>(
		spanName: string,
		fn: (span: Span) => Promise<T>,
		attributes?: Record<string, any>,
	): Promise<T> {
		const tracer = this.getTracer();

		return tracer.startActiveSpan(spanName, async (span) => {
			try {
				// Set initial attributes if provided
				if (attributes) {
					span.setAttributes(formatSpanAttributes(attributes));
				}

				const result = await fn(span);
				span.setStatus({ code: SPAN_STATUS.OK });
				return result;
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({
					code: SPAN_STATUS.ERROR,
					message: (error as Error).message,
				});
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Get the currently active span
	 */
	getActiveSpan(): Span | undefined {
		return trace.getActiveSpan();
	}

	/**
	 * Set attributes on the currently active span
	 */
	setActiveSpanAttributes(attributes: Record<string, any>): void {
		const span = trace.getActiveSpan();
		if (span) {
			span.setAttributes(formatSpanAttributes(attributes));
		}
	}

	/**
	 * Record an exception on the currently active span
	 */
	recordException(error: Error, attributes?: Record<string, any>): void {
		const span = trace.getActiveSpan();
		if (span) {
			span.recordException(error);
			if (attributes) {
				span.setAttributes(formatSpanAttributes(attributes));
			}
		}
	}

	/**
	 * Add an event to the currently active span
	 */
	addEvent(name: string, attributes?: Record<string, any>): void {
		const span = trace.getActiveSpan();
		if (span && attributes) {
			span.addEvent(name, formatSpanAttributes(attributes));
		}
	}
}

// Global singleton instance
export const tracingService = new TracingService();
