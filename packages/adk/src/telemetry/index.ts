/**
 * Telemetry Module - Main Entry Point
 * Comprehensive OpenTelemetry integration for ADK
 *
 * This module provides:
 * - Distributed tracing for agents, tools, and LLM calls
 * - Metrics for performance monitoring
 * - Auto-instrumentation for HTTP, databases, etc.
 * - Privacy controls for sensitive content
 * - Resource auto-detection
 * - Standard OpenTelemetry GenAI semantic conventions
 *
 * @example Basic initialization
 * ```typescript
 * import { telemetryService } from '@iqai/adk';
 *
 * await telemetryService.initialize({
 *   appName: 'my-agent-app',
 *   appVersion: '1.0.0',
 *   otlpEndpoint: 'http://localhost:4318/v1/traces',
 *   enableMetrics: true,
 * });
 * ```
 *
 * @example With privacy controls
 * ```typescript
 * // Set environment variable to disable content capture
 * process.env.ADK_CAPTURE_MESSAGE_CONTENT = 'false';
 *
 * await telemetryService.initialize({
 *   appName: 'my-agent-app',
 *   otlpEndpoint: 'http://localhost:4318/v1/traces',
 *   captureMessageContent: false, // Or via config
 * });
 * ```
 */

import type { Span, Tracer } from "@opentelemetry/api";
import type { InvocationContext } from "../agents/invocation-context";
import type { Event } from "../events/event";
import type { LlmRequest } from "../models/llm-request";
import type { LlmResponse } from "../models/llm-response";
import type { BaseTool } from "../tools";
import { metricsService } from "./metrics";
// Import services
import { setupService } from "./setup";
import { tracingService } from "./tracing";

// Export constants for users who want to add custom attributes
export {
	ADK_ATTRS,
	ADK_SYSTEM_NAME,
	DEFAULTS,
	ENV_VARS,
	METRICS,
	OPERATIONS,
	SEMCONV,
} from "./constants";
// Export types
export type {
	AgentMetricDimensions,
	AgentSpanAttributes,
	LlmMetricDimensions,
	LlmSpanAttributes,
	TelemetryConfig,
	TelemetryStats,
	ToolMetricDimensions,
	ToolSpanAttributes,
	TraceAgentParams,
	TraceLlmParams,
	TraceToolParams,
} from "./types";

// Export utilities for advanced use cases
export {
	buildLlmRequestForTrace,
	buildLlmResponseForTrace,
	formatSpanAttributes,
	getEnvironment,
	safeJsonStringify,
	shouldCaptureContent,
} from "./utils";

/**
 * Main telemetry service
 * Unified interface for all telemetry operations
 */
export class TelemetryService {
	/**
	 * Initialize telemetry system
	 */
	async initialize(config: import("./types").TelemetryConfig): Promise<void> {
		await setupService.initialize(config);

		// Initialize tracing service
		const appVersion = config.appVersion || "0.0.0";
		tracingService.initialize("iqai-adk", appVersion);

		// Initialize metrics service if enabled
		if (config.enableMetrics !== false) {
			metricsService.initialize("iqai-adk", appVersion);
		}
	}

	/**
	 * Check if telemetry is initialized
	 */
	get initialized(): boolean {
		return setupService.initialized;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): import("./types").TelemetryConfig | null {
		return setupService.getConfig();
	}

	/**
	 * Get tracer instance
	 */
	getTracer(): Tracer {
		return tracingService.getTracer();
	}

	/**
	 * Get currently active span
	 */
	getActiveSpan(): Span | undefined {
		return tracingService.getActiveSpan();
	}

	// --- Tracing Methods ---

	/**
	 * Trace an agent invocation
	 */
	traceAgentInvocation(
		agent: { name: string; description?: string },
		invocationContext: InvocationContext,
	): void {
		tracingService.traceAgentInvocation(agent, invocationContext);
	}

	/**
	 * Trace a tool call
	 */
	traceToolCall(
		tool: BaseTool,
		args: Record<string, any>,
		functionResponseEvent: Event,
		llmRequest?: LlmRequest,
		invocationContext?: InvocationContext,
	): void {
		tracingService.traceToolCall(
			tool,
			args,
			functionResponseEvent,
			llmRequest,
			invocationContext,
		);
	}

	/**
	 * Trace an LLM call
	 */
	traceLlmCall(
		invocationContext: InvocationContext,
		eventId: string,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
	): void {
		tracingService.traceLlmCall(
			invocationContext,
			eventId,
			llmRequest,
			llmResponse,
		);
	}

	/**
	 * Wrap an async generator with tracing
	 */
	traceAsyncGenerator<T>(
		spanName: string,
		generator: AsyncGenerator<T, void, unknown>,
		attributes?: Record<string, any>,
	): AsyncGenerator<T, void, unknown> {
		return tracingService.traceAsyncGenerator(spanName, generator, attributes);
	}

	/**
	 * Execute a function within a traced span
	 */
	async withSpan<T>(
		spanName: string,
		fn: (span: Span) => Promise<T>,
		attributes?: Record<string, any>,
	): Promise<T> {
		return tracingService.withSpan(spanName, fn, attributes);
	}

	/**
	 * Set attributes on the active span
	 */
	setActiveSpanAttributes(attributes: Record<string, any>): void {
		tracingService.setActiveSpanAttributes(attributes);
	}

	/**
	 * Record an exception on the active span
	 */
	recordException(error: Error, attributes?: Record<string, any>): void {
		tracingService.recordException(error, attributes);
	}

	/**
	 * Add an event to the active span
	 */
	addEvent(name: string, attributes?: Record<string, any>): void {
		tracingService.addEvent(name, attributes);
	}

	// --- Metrics Methods ---

	/**
	 * Record an agent invocation
	 */
	recordAgentInvocation(
		dimensions: import("./types").AgentMetricDimensions,
	): void {
		metricsService.recordAgentInvocation(dimensions);
	}

	/**
	 * Record agent duration
	 */
	recordAgentDuration(
		durationMs: number,
		dimensions: import("./types").AgentMetricDimensions,
	): void {
		metricsService.recordAgentDuration(durationMs, dimensions);
	}

	/**
	 * Record a tool execution
	 */
	recordToolExecution(
		dimensions: import("./types").ToolMetricDimensions,
	): void {
		metricsService.recordToolExecution(dimensions);
	}

	/**
	 * Record tool duration
	 */
	recordToolDuration(
		durationMs: number,
		dimensions: import("./types").ToolMetricDimensions,
	): void {
		metricsService.recordToolDuration(durationMs, dimensions);
	}

	/**
	 * Record an LLM call
	 */
	recordLlmCall(dimensions: import("./types").LlmMetricDimensions): void {
		metricsService.recordLlmCall(dimensions);
	}

	/**
	 * Record LLM duration
	 */
	recordLlmDuration(
		durationMs: number,
		dimensions: import("./types").LlmMetricDimensions,
	): void {
		metricsService.recordLlmDuration(durationMs, dimensions);
	}

	/**
	 * Record LLM token usage
	 */
	recordLlmTokens(
		inputTokens: number,
		outputTokens: number,
		dimensions: import("./types").LlmMetricDimensions,
	): void {
		metricsService.recordLlmTokens(inputTokens, outputTokens, dimensions);
	}

	/**
	 * Record an error
	 */
	recordError(errorType: "agent" | "tool" | "llm", context: string): void {
		metricsService.recordError(errorType, context);
	}

	// --- Lifecycle Methods ---

	/**
	 * Flush all pending telemetry data
	 */
	async flush(timeoutMs = 5000): Promise<void> {
		await setupService.flush(timeoutMs);
	}

	/**
	 * Shutdown telemetry system
	 */
	async shutdown(timeoutMs?: number): Promise<void> {
		await setupService.shutdown(timeoutMs);
	}
}

// Global singleton instance
export const telemetryService = new TelemetryService();

// Backward compatibility exports
export const tracer = telemetryService.getTracer();

export const initializeTelemetry = (
	config: import("./types").TelemetryConfig,
) => telemetryService.initialize(config);

export const shutdownTelemetry = (timeoutMs?: number) =>
	telemetryService.shutdown(timeoutMs);

export const traceAgentInvocation = (
	agent: { name: string; description?: string },
	invocationContext: InvocationContext,
) => telemetryService.traceAgentInvocation(agent, invocationContext);

export const traceToolCall = (
	tool: BaseTool,
	args: Record<string, any>,
	functionResponseEvent: Event,
	llmRequest?: LlmRequest,
	invocationContext?: InvocationContext,
) =>
	telemetryService.traceToolCall(
		tool,
		args,
		functionResponseEvent,
		llmRequest,
		invocationContext,
	);

export const traceLlmCall = (
	invocationContext: InvocationContext,
	eventId: string,
	llmRequest: LlmRequest,
	llmResponse: LlmResponse,
) =>
	telemetryService.traceLlmCall(
		invocationContext,
		eventId,
		llmRequest,
		llmResponse,
	);

// Additional convenience exports
export const recordAgentInvocation = (
	dimensions: import("./types").AgentMetricDimensions,
) => telemetryService.recordAgentInvocation(dimensions);

export const recordToolExecution = (
	dimensions: import("./types").ToolMetricDimensions,
) => telemetryService.recordToolExecution(dimensions);

export const recordLlmCall = (
	dimensions: import("./types").LlmMetricDimensions,
) => telemetryService.recordLlmCall(dimensions);
