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
	DEPLOYMENT_NAME: "adk.deployment.name",

	// ============================================
	// TIER 2: Operation-Specific (Standard)
	// ============================================

	// Agent attributes
	AGENT_NAME: "adk.agent.name",
	AGENT_DESCRIPTION: "adk.agent.description",
	AGENT_TYPE: "adk.agent.type",
	AGENT_DEPTH: "adk.agent.depth",
	AGENT_PARENT: "adk.agent.parent",

	// Transfer attributes (for multi-agent)
	TRANSFER_SOURCE_AGENT: "adk.transfer.source_agent",
	TRANSFER_TARGET_AGENT: "adk.transfer.target_agent",
	TRANSFER_CHAIN: "adk.transfer.chain",
	TRANSFER_DEPTH: "adk.transfer.depth",
	TRANSFER_ROOT_AGENT: "adk.transfer.root_agent",
	TRANSFER_REASON: "adk.transfer.reason",

	// Tool attributes
	TOOL_NAME: "adk.tool.name",
	TOOL_TYPE: "adk.tool.type",
	TOOL_STATUS: "adk.tool.status",
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
	CALLBACK_RESULT: "adk.callback.result",
	CALLBACK_OVERRIDE_RETURNED: "adk.callback.override_returned",

	// Flow attributes
	FLOW_TYPE: "adk.flow.type",
	FLOW_ITERATION: "adk.flow.iteration",

	// ============================================
	// TIER 2: Platform-Specific
	// ============================================

	// Platform (Discord, Telegram, etc.)
	PLATFORM: "adk.platform",
	PLATFORM_CHANNEL_ID: "adk.platform.channel_id",
	PLATFORM_MESSAGE_TYPE: "adk.platform.message_type",
	PLATFORM_GUILD_ID: "adk.platform.guild_id",

	// MCP attributes
	MCP_SERVER_NAME: "adk.mcp.server_name",
	MCP_TOOL_NAME: "adk.mcp.tool_name",
	MCP_TRANSPORT: "adk.mcp.transport",
	MCP_LATENCY_MS: "adk.mcp.latency_ms",

	// Batch processing
	BATCH_JOB_ID: "adk.batch.job_id",
	BATCH_ITEM_INDEX: "adk.batch.item_index",
	BATCH_TOTAL_ITEMS: "adk.batch.total_items",
	BATCH_TRIGGER: "adk.batch.trigger",

	// ============================================
	// Privacy & Compliance
	// ============================================
	PRIVACY_CONTENT_CAPTURED: "adk.privacy.content_captured",
	PRIVACY_REDACTION_APPLIED: "adk.privacy.redaction_applied",
	AUDIT_TIMESTAMP_ISO: "adk.audit.timestamp_iso",

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
	STREAM_LLM: "stream_llm",

	// New - Core operations
	TRANSFER_AGENT: "transfer_agent",
	EXECUTE_CALLBACK: "execute_callback",
	PROCESS_FLOW: "process_flow",

	// New - Service operations
	SEARCH_MEMORY: "search_memory",
	INSERT_MEMORY: "insert_memory",
	GET_SESSION: "get_session",
	SAVE_ARTIFACT: "save_artifact",
	LOAD_ARTIFACT: "load_artifact",
	EXECUTE_PLUGIN: "execute_plugin",

	// New - MCP operations
	MCP_REQUEST: "mcp_request",
	MCP_RESPONSE: "mcp_response",
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
 * Attribute tiers for documentation and filtering
 */
export const ATTRIBUTE_TIERS = {
	CORE: [
		ADK_ATTRS.SESSION_ID,
		ADK_ATTRS.INVOCATION_ID,
		ADK_ATTRS.USER_ID,
		ADK_ATTRS.ENVIRONMENT,
	],
	STANDARD: [
		ADK_ATTRS.AGENT_NAME,
		ADK_ATTRS.AGENT_TYPE,
		ADK_ATTRS.TOOL_NAME,
		ADK_ATTRS.TOOL_TYPE,
		ADK_ATTRS.TOOL_STATUS,
		ADK_ATTRS.LLM_MODEL,
		ADK_ATTRS.LLM_STREAMING,
		ADK_ATTRS.CALLBACK_TYPE,
		ADK_ATTRS.TRANSFER_CHAIN,
	],
	VERBOSE: [
		ADK_ATTRS.LLM_REQUEST,
		ADK_ATTRS.LLM_RESPONSE,
		ADK_ATTRS.TOOL_ARGS,
		ADK_ATTRS.TOOL_RESPONSE,
	],
} as const;

/**
 * Span naming patterns for consistent naming
 */
export const SPAN_PATTERNS = {
	AGENT_RUN: (agentName: string) => `agent_run [${agentName}]`,
	AGENT_RUN_LIVE: (agentName: string) => `agent_run_live [${agentName}]`,
	EXECUTE_TOOL: (toolName: string) => `execute_tool [${toolName}]`,
	LLM_GENERATE: (modelName: string) => `llm_generate [${modelName}]`,
	LLM_STREAM: (modelName: string) => `llm_stream [${modelName}]`,
	CALLBACK: (type: string, target?: string) =>
		target ? `callback [${type}] ${target}` : `callback [${type}]`,
	TRANSFER_TO_AGENT: (targetAgent: string) =>
		`transfer_to_agent [${targetAgent}]`,
	LLM_FLOW: (flowType: string) => `llm_flow [${flowType}]`,
	MCP_CALL: (serverName: string, tool: string) =>
		`mcp_call [${serverName}/${tool}]`,
	SESSION_OPERATION: (operation: string) => `session [${operation}]`,
	MEMORY_OPERATION: (operation: string) => `memory [${operation}]`,
	ARTIFACT_OPERATION: (operation: string) => `artifact [${operation}]`,
	PLUGIN_HOOK: (pluginName: string, hook: string) =>
		`plugin [${pluginName}] ${hook}`,
} as const;

/**
 * Callback types for tracing
 */
export const CALLBACK_TYPES = {
	BEFORE_AGENT: "before_agent",
	AFTER_AGENT: "after_agent",
	BEFORE_TOOL: "before_tool",
	AFTER_TOOL: "after_tool",
	BEFORE_MODEL: "before_model",
	AFTER_MODEL: "after_model",
} as const;

/**
 * Error categories for better error classification
 */
export const ERROR_CATEGORIES = {
	TOOL_ERROR: "tool_error",
	MODEL_ERROR: "model_error",
	TRANSFER_ERROR: "transfer_error",
	CALLBACK_ERROR: "callback_error",
	MEMORY_ERROR: "memory_error",
	SESSION_ERROR: "session_error",
	PLUGIN_ERROR: "plugin_error",
	UNKNOWN_ERROR: "unknown_error",
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
