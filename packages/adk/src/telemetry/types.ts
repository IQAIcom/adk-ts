/**
 * Telemetry Types and Interfaces
 * Comprehensive type definitions for the ADK telemetry system
 */

import type { InvocationContext } from "../agents/invocation-context";
import type { Event } from "../events/event";
import type { LlmRequest } from "../models/llm-request";
import type { LlmResponse } from "../models/llm-response";
import type { BaseTool } from "../tools";

/**
 * Configuration for the telemetry system
 */
export interface TelemetryConfig {
	/** Application name (used as service name) */
	appName: string;

	/** Application version (optional) */
	appVersion?: string;

	/** OTLP endpoint for traces (e.g., http://localhost:4318/v1/traces) */
	otlpEndpoint?: string;

	/** Custom headers for OTLP exporter */
	otlpHeaders?: Record<string, string>;

	/** Deployment environment (e.g., development, staging, production) */
	environment?: string;

	/** Enable tracing (default: true) */
	enableTracing?: boolean;

	/** Enable metrics (default: true) */
	enableMetrics?: boolean;

	/** Enable auto-instrumentation for HTTP, databases, etc. (default: true) */
	enableAutoInstrumentation?: boolean;

	/** Enable debug mode (default: false). When enabled, in-memory exporter is active. */
	debug?: boolean;

	/** Capture message content in traces (default: true, set false for privacy) */
	captureMessageContent?: boolean;

	/** Sampling ratio for traces (0.0 to 1.0, default: 1.0 = 100%) */
	samplingRatio?: number;

	/** Metric export interval in milliseconds (default: 60000 = 1 minute) */
	metricExportIntervalMs?: number;

	/** Additional resource attributes */
	resourceAttributes?: Record<string, string | number | boolean>;
}

/**
 * Span attribute data for agent invocations
 */
export interface AgentSpanAttributes {
	agentName: string;
	agentDescription?: string;
	sessionId: string;
	userId?: string;
	invocationId: string;
	environment?: string;
	input?: string | Record<string, any>;
	output?: string | Record<string, any>;
}

/**
 * Span attribute data for tool executions
 */
export interface ToolSpanAttributes {
	toolName: string;
	toolDescription?: string;
	toolType: string;
	toolCallId: string;
	args: Record<string, any>;
	response: any;
	sessionId: string;
	userId?: string;
	eventId: string;
}

/**
 * Span attribute data for LLM calls
 */
export interface LlmSpanAttributes {
	model: string;
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	finishReason?: string;
	sessionId: string;
	userId?: string;
	invocationId: string;
	eventId: string;
}

/**
 * Metric dimensions for agent metrics
 */
export interface AgentMetricDimensions {
	agentName: string;
	environment?: string;
	status: "success" | "error";
}

/**
 * Metric dimensions for tool metrics
 */
export interface ToolMetricDimensions {
	toolName: string;
	agentName?: string;
	environment?: string;
	status: "success" | "error";
}

/**
 * Metric dimensions for LLM metrics
 */
export interface LlmMetricDimensions {
	model: string;
	agentName?: string;
	environment?: string;
	status: "success" | "error";
}

/**
 * Parameters for tracing an agent invocation
 */
export interface TraceAgentParams {
	agent: {
		name: string;
		description?: string;
	};
	invocationContext: InvocationContext;
}

/**
 * Parameters for tracing a tool call
 */
export interface TraceToolParams {
	tool: BaseTool;
	args: Record<string, any>;
	functionResponseEvent: Event;
	llmRequest?: LlmRequest;
	invocationContext?: InvocationContext;
}

/**
 * Parameters for tracing an LLM call
 */
export interface TraceLlmParams {
	invocationContext: InvocationContext;
	eventId: string;
	llmRequest: LlmRequest;
	llmResponse: LlmResponse;
}

/**
 * Telemetry statistics
 */
export interface TelemetryStats {
	agentInvocations: number;
	toolExecutions: number;
	llmCalls: number;
	totalTokens: number;
	errors: number;
}

/**
 * Parameters for tracing a callback execution
 */
export interface TraceCallbackParams {
	callbackType:
		| "before_agent"
		| "after_agent"
		| "before_tool"
		| "after_tool"
		| "before_model"
		| "after_model";
	callbackName?: string;
	callbackIndex: number;
	invocationContext?: InvocationContext;
}

/**
 * Enhanced tool span attributes with execution tracking
 */
export interface EnhancedToolSpanAttributes extends ToolSpanAttributes {
	executionOrder?: number;
	parallelGroup?: string;
	retryCount?: number;
	isCallbackOverride?: boolean;
}

/**
 * Enhanced LLM span attributes with streaming metrics
 */
export interface EnhancedLlmSpanAttributes extends LlmSpanAttributes {
	streaming?: boolean;
	timeToFirstTokenMs?: number;
	chunkCount?: number;
	cachedTokens?: number;
	contextWindowUsedPct?: number;
}

/**
 * Parameters for tracing an agent transfer
 */
export interface TraceAgentTransferParams {
	sourceAgent: string;
	targetAgent: string;
	reason?: string;
	transferContext: import("../agents/invocation-context").TransferContext;
	invocationContext?: InvocationContext;
}

/**
 * Error span attributes
 */
export interface ErrorSpanAttributes {
	errorCategory:
		| "tool_error"
		| "model_error"
		| "transfer_error"
		| "callback_error"
		| "memory_error"
		| "session_error"
		| "plugin_error"
		| "unknown_error";
	errorRecoverable: boolean;
	errorRetryRecommended: boolean;
	errorMessage: string;
	errorStack?: string;
}

/**
 * Parameters for tracing memory operations
 */
export interface TraceMemoryParams {
	operation: "search" | "insert" | "delete";
	query?: string;
	resultsCount?: number;
	sessionId: string;
	invocationContext?: InvocationContext;
}

/**
 * Parameters for tracing session operations
 */
export interface TraceSessionParams {
	operation: "create" | "get" | "update" | "delete";
	sessionId: string;
	userId?: string;
	found?: boolean;
}

/**
 * Parameters for tracing plugin hooks
 */
export interface TracePluginParams {
	pluginName: string;
	hook:
		| "before_agent"
		| "after_agent"
		| "before_model"
		| "after_model"
		| "on_event";
	agentName?: string;
	invocationContext?: InvocationContext;
}
