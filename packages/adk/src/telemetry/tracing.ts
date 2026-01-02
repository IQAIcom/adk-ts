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

		// Add input/output as events (preferred for observability platforms)
		if (captureContent) {
			// Tool input event
			span.addEvent("gen_ai.tool.input", {
				"gen_ai.tool.input": safeJsonStringify(args),
			});

			// Tool output event
			span.addEvent("gen_ai.tool.output", {
				"gen_ai.tool.output": safeJsonStringify(toolResponse),
			});

			// Also set as attributes for backward compatibility
			span.setAttribute(ADK_ATTRS.TOOL_ARGS, safeJsonStringify(args));
			span.setAttribute(
				ADK_ATTRS.TOOL_RESPONSE,
				safeJsonStringify(toolResponse),
			);
		}

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

	/**
	 * Trace a callback execution
	 * Wraps callback execution in a span with appropriate attributes
	 */
	traceCallback(
		callbackType: string,
		callbackName: string | undefined,
		callbackIndex: number,
		targetName?: string,
		invocationContext?: InvocationContext,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const attributes = formatSpanAttributes({
			[SEMCONV.GEN_AI_SYSTEM]: ADK_SYSTEM_NAME,
			[SEMCONV.GEN_AI_OPERATION_NAME]: OPERATIONS.EXECUTE_CALLBACK,
			[ADK_ATTRS.CALLBACK_TYPE]: callbackType,
			[ADK_ATTRS.CALLBACK_NAME]: callbackName || "<anonymous>",
			[ADK_ATTRS.CALLBACK_INDEX]: callbackIndex,
			...(invocationContext && {
				[ADK_ATTRS.SESSION_ID]: invocationContext.session.id,
				[ADK_ATTRS.USER_ID]: invocationContext.userId || "",
				[ADK_ATTRS.INVOCATION_ID]: invocationContext.invocationId,
			}),
			[ADK_ATTRS.ENVIRONMENT]: getEnvironment() || "",
		});

		span.setAttributes(attributes);
	}

	/**
	 * Trace an agent transfer
	 * Records transfer events and attributes for multi-agent workflows
	 */
	traceAgentTransfer(
		sourceAgent: string,
		targetAgent: string,
		transferChain: string[],
		transferDepth: number,
		reason?: string,
		invocationContext?: InvocationContext,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const attributes = formatSpanAttributes({
			[SEMCONV.GEN_AI_SYSTEM]: ADK_SYSTEM_NAME,
			[SEMCONV.GEN_AI_OPERATION_NAME]: OPERATIONS.TRANSFER_AGENT,
			[ADK_ATTRS.TRANSFER_SOURCE_AGENT]: sourceAgent,
			[ADK_ATTRS.TRANSFER_TARGET_AGENT]: targetAgent,
			[ADK_ATTRS.TRANSFER_CHAIN]: JSON.stringify(transferChain),
			[ADK_ATTRS.TRANSFER_DEPTH]: transferDepth,
			[ADK_ATTRS.TRANSFER_ROOT_AGENT]: transferChain[0] || sourceAgent,
			...(reason && { [ADK_ATTRS.TRANSFER_REASON]: reason }),
			...(invocationContext && {
				[ADK_ATTRS.SESSION_ID]: invocationContext.session.id,
				[ADK_ATTRS.USER_ID]: invocationContext.userId || "",
				[ADK_ATTRS.INVOCATION_ID]: invocationContext.invocationId,
			}),
			[ADK_ATTRS.ENVIRONMENT]: getEnvironment() || "",
		});

		span.setAttributes(attributes);

		// Add transfer event
		span.addEvent("agent_transfer_initiated", {
			target_agent: targetAgent,
			transfer_depth: transferDepth,
		});
	}

	/**
	 * Record enhanced tool execution attributes
	 * Extends the basic tool tracing with execution order and parallel tracking
	 */
	traceEnhancedTool(
		executionOrder?: number,
		parallelGroup?: string,
		retryCount?: number,
		isCallbackOverride?: boolean,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const attributes: Record<string, any> = {};

		if (executionOrder !== undefined) {
			attributes[ADK_ATTRS.TOOL_EXECUTION_ORDER] = executionOrder;
		}
		if (parallelGroup !== undefined) {
			attributes[ADK_ATTRS.TOOL_PARALLEL_GROUP] = parallelGroup;
		}
		if (retryCount !== undefined) {
			attributes[ADK_ATTRS.TOOL_RETRY_COUNT] = retryCount;
		}
		if (isCallbackOverride !== undefined) {
			attributes[ADK_ATTRS.TOOL_IS_CALLBACK_OVERRIDE] = isCallbackOverride;
		}

		if (Object.keys(attributes).length > 0) {
			span.setAttributes(formatSpanAttributes(attributes));
		}
	}

	/**
	 * Record enhanced LLM attributes
	 * Extends basic LLM tracing with streaming metrics
	 */
	traceEnhancedLlm(
		streaming?: boolean,
		timeToFirstTokenMs?: number,
		chunkCount?: number,
		cachedTokens?: number,
		contextWindowUsedPct?: number,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const attributes: Record<string, any> = {};

		if (streaming !== undefined) {
			attributes[ADK_ATTRS.LLM_STREAMING] = streaming;
		}
		if (timeToFirstTokenMs !== undefined) {
			attributes[ADK_ATTRS.LLM_TIME_TO_FIRST_TOKEN] = timeToFirstTokenMs;
		}
		if (chunkCount !== undefined) {
			attributes[ADK_ATTRS.LLM_CHUNK_COUNT] = chunkCount;
		}
		if (cachedTokens !== undefined) {
			attributes[ADK_ATTRS.LLM_CACHED_TOKENS] = cachedTokens;
		}
		if (contextWindowUsedPct !== undefined) {
			attributes[ADK_ATTRS.LLM_CONTEXT_WINDOW_USED_PCT] = contextWindowUsedPct;
		}

		if (Object.keys(attributes).length > 0) {
			span.setAttributes(formatSpanAttributes(attributes));
		}
	}

	/**
	 * Record standardized error information
	 * Provides consistent error handling across all operations
	 */
	traceError(
		error: Error,
		category:
			| "tool_error"
			| "model_error"
			| "transfer_error"
			| "callback_error"
			| "memory_error"
			| "session_error"
			| "plugin_error"
			| "unknown_error",
		recoverable = false,
		retryRecommended = false,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		span.recordException(error);
		span.setStatus({
			code: SPAN_STATUS.ERROR,
			message: error.message,
		});

		const attributes = formatSpanAttributes({
			[ADK_ATTRS.ERROR_CATEGORY]: category,
			[ADK_ATTRS.ERROR_RECOVERABLE]: recoverable,
			[ADK_ATTRS.ERROR_RETRY_RECOMMENDED]: retryRecommended,
			"error.type": error.constructor.name,
			"error.message": error.message,
			"error.stack": error.stack?.substring(0, 1000) || "",
		});

		span.setAttributes(attributes);
	}

	/**
	 * Trace memory operations
	 * Records memory search, insert, and delete operations
	 */
	traceMemoryOperation(
		operation: "search" | "insert" | "delete",
		sessionId: string,
		query?: string,
		resultsCount?: number,
		invocationContext?: InvocationContext,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const attributes = formatSpanAttributes({
			[SEMCONV.GEN_AI_SYSTEM]: ADK_SYSTEM_NAME,
			[SEMCONV.GEN_AI_OPERATION_NAME]:
				operation === "search"
					? OPERATIONS.SEARCH_MEMORY
					: OPERATIONS.INSERT_MEMORY,
			[ADK_ATTRS.SESSION_ID]: sessionId,
			...(query && { [ADK_ATTRS.MEMORY_QUERY]: query }),
			...(resultsCount !== undefined && {
				[ADK_ATTRS.MEMORY_RESULTS_COUNT]: resultsCount,
			}),
			...(invocationContext && {
				[ADK_ATTRS.USER_ID]: invocationContext.userId || "",
				[ADK_ATTRS.INVOCATION_ID]: invocationContext.invocationId,
			}),
			[ADK_ATTRS.ENVIRONMENT]: getEnvironment() || "",
		});

		span.setAttributes(attributes);
	}

	/**
	 * Trace plugin hook execution
	 * Records plugin lifecycle hooks
	 */
	tracePluginHook(
		pluginName: string,
		hook: string,
		agentName?: string,
		invocationContext?: InvocationContext,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const attributes = formatSpanAttributes({
			[SEMCONV.GEN_AI_SYSTEM]: ADK_SYSTEM_NAME,
			[SEMCONV.GEN_AI_OPERATION_NAME]: OPERATIONS.EXECUTE_PLUGIN,
			[ADK_ATTRS.PLUGIN_NAME]: pluginName,
			[ADK_ATTRS.PLUGIN_HOOK]: hook,
			...(agentName && { [ADK_ATTRS.AGENT_NAME]: agentName }),
			...(invocationContext && {
				[ADK_ATTRS.SESSION_ID]: invocationContext.session.id,
				[ADK_ATTRS.USER_ID]: invocationContext.userId || "",
				[ADK_ATTRS.INVOCATION_ID]: invocationContext.invocationId,
			}),
			[ADK_ATTRS.ENVIRONMENT]: getEnvironment() || "",
		});

		span.setAttributes(attributes);
	}
}

// Global singleton instance
export const tracingService = new TracingService();
