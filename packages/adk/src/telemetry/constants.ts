/**
 * Semantic Conventions and Constants
 * OpenTelemetry semantic conventions for ADK telemetry
 */

/**
 * Standard OpenTelemetry GenAI semantic conventions
 * Reference: https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
export const SEMCONV = {
	// System identification
	GEN_AI_SYSTEM: "gen_ai.system",

	// Operation names
	GEN_AI_OPERATION_NAME: "gen_ai.operation.name",

	// Agent attributes
	GEN_AI_AGENT_NAME: "gen_ai.agent.name",
	GEN_AI_AGENT_DESCRIPTION: "gen_ai.agent.description",
	GEN_AI_CONVERSATION_ID: "gen_ai.conversation.id",

	// Tool attributes
	GEN_AI_TOOL_NAME: "gen_ai.tool.name",
	GEN_AI_TOOL_DESCRIPTION: "gen_ai.tool.description",
	GEN_AI_TOOL_TYPE: "gen_ai.tool.type",
	GEN_AI_TOOL_CALL_ID: "gen_ai.tool.call.id",

	// LLM request attributes
	GEN_AI_REQUEST_MODEL: "gen_ai.request.model",
	GEN_AI_REQUEST_MAX_TOKENS: "gen_ai.request.max_tokens",
	GEN_AI_REQUEST_TEMPERATURE: "gen_ai.request.temperature",
	GEN_AI_REQUEST_TOP_P: "gen_ai.request.top_p",

	// LLM response attributes
	GEN_AI_RESPONSE_FINISH_REASONS: "gen_ai.response.finish_reasons",

	// Token usage
	GEN_AI_USAGE_INPUT_TOKENS: "gen_ai.usage.input_tokens",
	GEN_AI_USAGE_OUTPUT_TOKENS: "gen_ai.usage.output_tokens",
	GEN_AI_USAGE_TOTAL_TOKENS: "gen_ai.usage.total_tokens",

	// Content events
	GEN_AI_CONTENT_PROMPT: "gen_ai.content.prompt",
	GEN_AI_CONTENT_COMPLETION: "gen_ai.content.completion",
} as const;

/**
 * ADK-specific attribute namespace
 * Custom attributes for IQAI ADK framework
 */
export const ADK_ATTRS = {
	// ============================================
	// TIER 1: Always Present (Core Identity)
	// ============================================
	// System identification
	SYSTEM_NAME: "adk.system.name",
	SYSTEM_VERSION: "adk.system.version",

	// Session and context
	SESSION_ID: "adk.session.id",
	USER_ID: "adk.user.id",
	INVOCATION_ID: "adk.invocation.id",
	EVENT_ID: "adk.event.id",

	// Environment
	ENVIRONMENT: "adk.environment",

	// ============================================
	// TIER 2: Operation-Specific (Standard)
	// ============================================

	// Agent attributes
	AGENT_NAME: "adk.agent.name",
	AGENT_DESCRIPTION: "adk.agent.description",

	// Transfer attributes (for multi-agent)
	TRANSFER_SOURCE_AGENT: "adk.transfer.source_agent",
	TRANSFER_TARGET_AGENT: "adk.transfer.target_agent",
	TRANSFER_CHAIN: "adk.transfer.chain",
	TRANSFER_DEPTH: "adk.transfer.depth",
	TRANSFER_ROOT_AGENT: "adk.transfer.root_agent",
	TRANSFER_REASON: "adk.transfer.reason",

	// Tool attributes
	TOOL_NAME: "adk.tool.name",
	TOOL_ARGS: "adk.tool.args",
	TOOL_RESPONSE: "adk.tool.response",
	TOOL_EXECUTION_ORDER: "adk.tool.execution_order",
	TOOL_PARALLEL_GROUP: "adk.tool.parallel_group",
	TOOL_RETRY_COUNT: "adk.tool.retry_count",
	TOOL_IS_CALLBACK_OVERRIDE: "adk.tool.is_callback_override",

	// LLM attributes
	LLM_MODEL: "adk.llm.model",
	LLM_REQUEST: "adk.llm.request",
	LLM_RESPONSE: "adk.llm.response",
	LLM_STREAMING: "adk.llm.streaming",
	LLM_TIME_TO_FIRST_TOKEN: "adk.llm.time_to_first_token_ms",
	LLM_CHUNK_COUNT: "adk.llm.chunk_count",
	LLM_CACHED_TOKENS: "adk.llm.cached_tokens",
	LLM_CONTEXT_WINDOW_USED_PCT: "adk.llm.context_window_used_pct",

	// Callback attributes
	CALLBACK_TYPE: "adk.callback.type",
	CALLBACK_NAME: "adk.callback.name",
	CALLBACK_INDEX: "adk.callback.index",

	// ============================================
	// Error Categorization
	// ============================================
	ERROR_CATEGORY: "adk.error.category",
	ERROR_RECOVERABLE: "adk.error.recoverable",
	ERROR_RETRY_RECOMMENDED: "adk.error.retry_recommended",

	// ============================================
	// Memory & Session
	// ============================================
	MEMORY_QUERY: "adk.memory.query",
	MEMORY_RESULTS_COUNT: "adk.memory.results_count",

	// Plugin
	PLUGIN_NAME: "adk.plugin.name",
	PLUGIN_HOOK: "adk.plugin.hook",
} as const;

/**
 * Operation names for different trace operations
 */
export const OPERATIONS = {
	// Existing operations
	INVOKE_AGENT: "invoke_agent",
	EXECUTE_TOOL: "execute_tool",
	CALL_LLM: "call_llm",

	// New - Core operations
	TRANSFER_AGENT: "transfer_agent",
	EXECUTE_CALLBACK: "execute_callback",

	// New - Service operations
	SEARCH_MEMORY: "search_memory",
	INSERT_MEMORY: "insert_memory",
	EXECUTE_PLUGIN: "execute_plugin",
} as const;

/**
 * System identifier for IQAI ADK
 */
export const ADK_SYSTEM_NAME = "iqai-adk";

/**
 * Environment variable names
 */
export const ENV_VARS = {
	// Privacy control
	CAPTURE_MESSAGE_CONTENT: "ADK_CAPTURE_MESSAGE_CONTENT",

	// OpenTelemetry standard env vars
	OTEL_SERVICE_NAME: "OTEL_SERVICE_NAME",
	OTEL_RESOURCE_ATTRIBUTES: "OTEL_RESOURCE_ATTRIBUTES",
	OTEL_EXPORTER_OTLP_ENDPOINT: "OTEL_EXPORTER_OTLP_ENDPOINT",
	OTEL_EXPORTER_OTLP_HEADERS: "OTEL_EXPORTER_OTLP_HEADERS",

	// Node environment
	NODE_ENV: "NODE_ENV",
} as const;

/**
 * Metric names
 */
export const METRICS = {
	// Counters
	AGENT_INVOCATIONS: "adk.agent.invocations",
	TOOL_EXECUTIONS: "adk.tool.executions",
	LLM_CALLS: "adk.llm.calls",
	ERRORS: "adk.errors",

	// Histograms
	AGENT_DURATION: "adk.agent.duration",
	TOOL_DURATION: "adk.tool.duration",
	LLM_DURATION: "adk.llm.duration",
	LLM_TOKENS: "adk.llm.tokens",
	LLM_INPUT_TOKENS: "adk.llm.tokens.input",
	LLM_OUTPUT_TOKENS: "adk.llm.tokens.output",
} as const;

/**
 * Span status codes
 */
export const SPAN_STATUS = {
	UNSET: 0,
	OK: 1,
	ERROR: 2,
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
	SAMPLING_RATIO: 1.0,
	METRIC_EXPORT_INTERVAL_MS: 60000, // 1 minute
	SHUTDOWN_TIMEOUT_MS: 5000,
	CAPTURE_MESSAGE_CONTENT: true,
	ENABLE_TRACING: true,
	ENABLE_METRICS: true,
	ENABLE_AUTO_INSTRUMENTATION: true,
} as const;
