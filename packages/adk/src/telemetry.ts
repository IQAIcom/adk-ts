import {
	DiagConsoleLogger,
	DiagLogLevel,
	type Tracer,
	context,
	diag,
	trace,
} from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { InvocationContext } from "./agents/invocation-context";
import type { Event } from "./events/event";
import type { LlmRequest } from "./models/llm-request";
import type { LlmResponse } from "./models/llm-response";
import type { BaseTool } from "./tools";
import type { ToolContext } from "./tools/tool-context";

export interface TelemetryConfig {
	appName: string;
	appVersion?: string;
	otlpEndpoint: string;
	otlpHeaders?: Record<string, string>;
	environment?: string;
}

/**
 * Telemetry service for the ADK
 * Handles OpenTelemetry initialization, tracing, and cleanup
 */
export class TelemetryService {
	private sdk: NodeSDK | null = null;
	private isInitialized = false;
	private tracer: Tracer;
	private config: TelemetryConfig | null = null;

	constructor() {
		// Initialize tracer with default values - will be updated when initialize() is called
		this.tracer = trace.getTracer("iqai-adk", "0.1.0");
	}

	/**
	 * Initialize telemetry with the provided configuration
	 */
	initialize(config: TelemetryConfig): void {
		if (this.isInitialized) {
			diag.warn("Telemetry is already initialized. Skipping.");
			return;
		}

		this.config = config;
		diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

		const resource = resourceFromAttributes({
			[ATTR_SERVICE_NAME]: config.appName,
			[ATTR_SERVICE_VERSION]: config.appVersion,
		});

		const traceExporter = new OTLPTraceExporter({
			url: config.otlpEndpoint,
			headers: config.otlpHeaders,
		});

		this.sdk = new NodeSDK({
			resource,
			traceExporter,
			instrumentations: [
				getNodeAutoInstrumentations({
					// Follow Python ADK approach: let all HTTP instrumentation through.
					// This provides transparency and aligns with standard OpenTelemetry behavior.
					// High-level LLM tracing is provided through dedicated ADK spans.
					"@opentelemetry/instrumentation-http": {
						ignoreIncomingRequestHook: (req) => {
							// Ignore incoming requests (we're usually making outgoing calls)
							return true;
						},
					},
				}),
			],
		});

		try {
			this.sdk.start();
			this.isInitialized = true;
			// Update tracer with actual config
			this.tracer = trace.getTracer("iqai-adk", config.appVersion || "0.1.0");
			diag.debug("OpenTelemetry SDK started successfully.");
		} catch (error) {
			diag.error("Error starting OpenTelemetry SDK:", error);
			throw error;
		}
	}

	/**
	 * Get the tracer instance
	 */
	getTracer(): Tracer {
		return this.tracer;
	}

	/**
	 * Check if telemetry is initialized
	 */
	get initialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): TelemetryConfig | null {
		return this.config;
	}

	/**
	 * Shutdown telemetry with optional timeout
	 */
	async shutdown(timeoutMs = 5000): Promise<void> {
		if (!this.sdk || !this.isInitialized) {
			diag.warn("Telemetry is not initialized or already shut down.");
			return;
		}

		try {
			// Create a timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() =>
						reject(
							new Error(`Telemetry shutdown timeout after ${timeoutMs}ms`),
						),
					timeoutMs,
				);
			});

			// Race between shutdown and timeout
			await Promise.race([this.sdk.shutdown(), timeoutPromise]);

			this.isInitialized = false;
			diag.debug("Telemetry terminated successfully.");
		} catch (error) {
			if (error instanceof Error && error.message.includes("timeout")) {
				diag.warn("Telemetry shutdown timed out, some traces may be lost");
			} else {
				diag.error("Error terminating telemetry:", error);
			}
			throw error;
		} finally {
			this.sdk = null;
		}
	}

	/**
	 * Traces a tool call by adding detailed attributes to the current span.
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

		let toolCallId = "<not specified>";
		let toolResponse = "<not specified>";

		// Follow Python logic: check if content.parts exists and has function_response
		if (
			functionResponseEvent.content?.parts &&
			functionResponseEvent.content.parts.length > 0
		) {
			const functionResponse =
				functionResponseEvent.content.parts[0].functionResponse;
			if (functionResponse) {
				toolCallId = functionResponse.id || "<not specified>";
				toolResponse =
					JSON.stringify(functionResponse.response) || "<not specified>";
			}
		}

		span.setAttributes({
			"gen_ai.system": "iqai-adk",
			"gen_ai.operation.name": "execute_tool",
			"gen_ai.tool.name": tool.name,
			"gen_ai.tool.description": tool.description,
			"gen_ai.tool.call.id": toolCallId,

			// Session and user tracking
			...(invocationContext && {
				"session.id": invocationContext.session.id,
				"user.id": invocationContext.userId,
			}),

			// Environment
			...(process.env.NODE_ENV && {
				"deployment.environment.name": process.env.NODE_ENV,
			}),

			// ADK-specific attributes (matching Python namespace pattern)
			"adk.tool_call_args": this._safeJsonStringify(args),
			"adk.event_id": functionResponseEvent.invocationId,
			"adk.tool_response": this._safeJsonStringify(toolResponse),
			"adk.llm_request": llmRequest
				? this._safeJsonStringify(this._buildLlmRequestForTrace(llmRequest))
				: "{}",
			"adk.llm_response": "{}",
		});
	}

	/**
	 * Traces a call to the LLM by adding detailed attributes to the current span.
	 */
	traceLlmCall(
		invocationContext: InvocationContext,
		eventId: string,
		llmRequest: LlmRequest,
		llmResponse: LlmResponse,
	): void {
		const span = trace.getActiveSpan();
		if (!span) return;

		const requestData = this._buildLlmRequestForTrace(llmRequest);

		span.setAttributes({
			// Standard OpenTelemetry attributes (following Python pattern)
			"gen_ai.system": "iqai-adk",
			"gen_ai.request.model": llmRequest.model,

			// Session and user tracking (maps to Langfuse sessionId, userId)
			"session.id": invocationContext.session.id,
			"user.id": invocationContext.userId,

			// Environment (maps to Langfuse environment)
			...(process.env.NODE_ENV && {
				"deployment.environment.name": process.env.NODE_ENV,
			}),

			// Model parameters (maps to Langfuse modelParameters)
			"gen_ai.request.max_tokens": llmRequest.config.maxOutputTokens || 0,
			"gen_ai.request.temperature": llmRequest.config.temperature || 0,
			"gen_ai.request.top_p": llmRequest.config.topP || 0,

			"adk.system_name": "iqai-adk",
			"adk.request_model": llmRequest.model,

			// ADK-specific attributes (matching Python namespace pattern)
			"adk.invocation_id": invocationContext.invocationId,
			"adk.session_id": invocationContext.session.id,
			"adk.event_id": eventId,
			"adk.llm_request": this._safeJsonStringify(requestData),
			"adk.llm_response": this._safeJsonStringify(llmResponse),
		});

		// Add token usage information (matching Python implementation)
		if (llmResponse.usageMetadata) {
			span.setAttributes({
				"gen_ai.usage.input_tokens":
					llmResponse.usageMetadata.promptTokenCount || 0,
				"gen_ai.usage.output_tokens":
					llmResponse.usageMetadata.candidatesTokenCount || 0,
			});
		}

		// Add input/output as events (preferred over deprecated attributes)
		span.addEvent("gen_ai.content.prompt", {
			"gen_ai.prompt": this._safeJsonStringify(requestData.messages),
		});

		span.addEvent("gen_ai.content.completion", {
			"gen_ai.completion": this._safeJsonStringify(llmResponse.content || ""),
		});
	}

	/**
	 * Wraps an async generator with tracing
	 */
	async *traceAsyncGenerator<T>(
		spanName: string,
		generator: AsyncGenerator<T, void, unknown>,
	): AsyncGenerator<T, void, unknown> {
		const span = this.tracer.startSpan(spanName);
		const spanContext = trace.setSpan(context.active(), span);

		try {
			// Execute each iteration within the span context
			while (true) {
				const result = await context.with(spanContext, () => generator.next());

				if (result.done) {
					break;
				}

				yield result.value as T;
			}
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: 2, message: (error as Error).message });
			throw error;
		} finally {
			span.end();
		}
	}

	// --- Private Helper Methods ---

	private _safeJsonStringify(obj: any): string {
		try {
			return JSON.stringify(obj);
		} catch (e) {
			return "<not serializable>";
		}
	}

	/**
	 * Builds a dictionary representation of the LLM request for tracing.
	 *
	 * This function prepares a dictionary representation of the LlmRequest
	 * object, suitable for inclusion in a trace. It excludes fields that cannot
	 * be serialized (e.g., function pointers) and avoids sending bytes data.
	 */
	private _buildLlmRequestForTrace(
		llmRequest: LlmRequest,
	): Record<string, any> {
		// Some fields in LlmRequest are function pointers and can not be serialized.
		const result: Record<string, any> = {
			model: llmRequest.model,
			config: this._excludeNonSerializableFromConfig(llmRequest.config),
			contents: [],
		};

		// We do not want to send bytes data to the trace.
		for (const content of llmRequest.contents || []) {
			// Filter out parts with inline_data (bytes data)
			const parts = content.parts?.filter((part) => !part.inlineData) || [];
			result.contents.push({
				role: content.role,
				parts,
			});
		}

		return result;
	}

	/**
	 * Excludes non-serializable fields from config, similar to Python's exclude logic
	 */
	private _excludeNonSerializableFromConfig(config: any): Record<string, any> {
		const result: Record<string, any> = {};

		for (const [key, value] of Object.entries(config)) {
			// Exclude response_schema and other non-serializable fields
			if (key === "response_schema") {
				continue;
			}

			// Exclude undefined/null values (similar to exclude_none=True)
			if (value === undefined || value === null) {
				continue;
			}

			// Handle functions array specially
			if (key === "functions" && Array.isArray(value)) {
				result[key] = value.map((func) => ({
					name: func.name,
					description: func.description,
					parameters: func.parameters,
					// Exclude actual function pointers
				}));
			} else {
				result[key] = value;
			}
		}

		return result;
	}
}

// Global singleton instance for backward compatibility
export const telemetryService = new TelemetryService();

// Backward compatibility exports
export const tracer = telemetryService.getTracer();
export const initializeTelemetry = (config: TelemetryConfig) =>
	telemetryService.initialize(config);
export const shutdownTelemetry = (timeoutMs?: number) =>
	telemetryService.shutdown(timeoutMs);
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
