/**
 * Legacy Telemetry Module
 * This file is deprecated and kept for backward compatibility only.
 * Please use the new modular telemetry system from './telemetry/' instead.
 *
 * @deprecated Import from './telemetry/' instead
 */

// Re-export everything from the new telemetry module
export {
	ADK_ATTRS,
	ADK_SYSTEM_NAME,
	type AgentMetricDimensions,
	type AgentSpanAttributes,
	DEFAULTS,
	ENV_VARS,
	initializeTelemetry,
	type LlmMetricDimensions,
	type LlmSpanAttributes,
	METRICS,
	OPERATIONS,
	recordAgentInvocation,
	recordLlmCall,
	recordToolExecution,
	SEMCONV,
	shutdownTelemetry,
	type TelemetryConfig,
	TelemetryService,
	type ToolMetricDimensions,
	type ToolSpanAttributes,
	telemetryService,
	traceAgentInvocation,
	traceLlmCall,
	tracer,
	traceToolCall,
} from "./telemetry/index";
