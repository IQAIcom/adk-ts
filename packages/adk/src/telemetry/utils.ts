/**
 * Telemetry Utilities
 * Helper functions for telemetry operations
 */

import { DEFAULTS, ENV_VARS } from "./constants";

/**
 * Check if message content should be captured in traces
 * Based on ADK_CAPTURE_MESSAGE_CONTENT environment variable
 */
export function shouldCaptureContent(): boolean {
	const value = process.env[ENV_VARS.CAPTURE_MESSAGE_CONTENT];

	// If not set, default to true
	if (value === undefined) {
		return DEFAULTS.CAPTURE_MESSAGE_CONTENT;
	}

	// Parse boolean-like values
	return value === "true" || value === "1" || value === "yes";
}

/**
 * Safely stringify an object to JSON
 * Returns a placeholder string if serialization fails
 */
export function safeJsonStringify(obj: any): string {
	try {
		return JSON.stringify(obj);
	} catch {
		return "<serialization_failed>";
	}
}

/**
 * Parse OpenTelemetry resource attributes from environment variable
 * Format: key1=value1,key2=value2
 */
export function parseResourceAttributes(
	envValue: string | undefined,
): Record<string, string> {
	if (!envValue) {
		return {};
	}

	const attributes: Record<string, string> = {};

	try {
		const pairs = envValue.split(",");
		for (const pair of pairs) {
			const [key, value] = pair.split("=");
			if (key && value) {
				attributes[key.trim()] = value.trim();
			}
		}
	} catch (error) {
		console.warn("Failed to parse OTEL_RESOURCE_ATTRIBUTES:", error);
	}

	return attributes;
}

/**
 * Get environment name from NODE_ENV or custom environment variable
 */
export function getEnvironment(): string | undefined {
	return process.env[ENV_VARS.NODE_ENV];
}

/**
 * Extract finish reason from LLM response
 */
export function extractFinishReason(llmResponse: any): string | undefined {
	// Handle different response formats
	if (llmResponse.finishReason) {
		return String(llmResponse.finishReason);
	}

	if (llmResponse.candidates?.[0]?.finishReason) {
		return String(llmResponse.candidates[0].finishReason);
	}

	return undefined;
}

/**
 * Build a sanitized LLM request object for tracing
 * Excludes non-serializable fields and optionally excludes content
 */
export function buildLlmRequestForTrace(
	llmRequest: any,
	includeContent = true,
): Record<string, any> {
	const result: Record<string, any> = {
		model: llmRequest.model,
		config: excludeNonSerializableFromConfig(llmRequest.config || {}),
	};

	if (includeContent && llmRequest.contents) {
		// Filter out inline data (bytes) from contents
		result.contents = llmRequest.contents.map((content: any) => ({
			role: content.role,
			parts: content.parts?.filter((part: any) => !part.inlineData) || [],
		}));
	}

	return result;
}

/**
 * Exclude non-serializable fields from config
 */
function excludeNonSerializableFromConfig(config: any): Record<string, any> {
	const result: Record<string, any> = {};

	for (const [key, value] of Object.entries(config)) {
		// Exclude response_schema and other non-serializable fields
		if (key === "response_schema" || key === "responseSchema") {
			continue;
		}

		// Exclude undefined/null values
		if (value === undefined || value === null) {
			continue;
		}

		// Handle functions array specially
		if (key === "functions" && Array.isArray(value)) {
			result[key] = value.map((func: any) => ({
				name: func.name,
				description: func.description,
				parameters: func.parameters,
			}));
		} else if (typeof value !== "function") {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Build a sanitized LLM response object for tracing
 */
export function buildLlmResponseForTrace(
	llmResponse: any,
	includeContent = true,
): Record<string, any> {
	const result: Record<string, any> = {};

	// Add usage metadata if available
	if (llmResponse.usageMetadata) {
		result.usageMetadata = llmResponse.usageMetadata;
	}

	// Add finish reason if available
	const finishReason = extractFinishReason(llmResponse);
	if (finishReason) {
		result.finishReason = finishReason;
	}

	// Add content if requested
	if (includeContent && llmResponse.content) {
		result.content = llmResponse.content;
	}

	return result;
}

/**
 * Calculate duration in milliseconds from start time
 */
export function calculateDuration(startTime: number): number {
	return Date.now() - startTime;
}

/**
 * Format attributes for OpenTelemetry span
 * Ensures all values are compatible with OTel attribute types
 */
export function formatSpanAttributes(
	attributes: Record<string, any>,
): Record<string, string | number | boolean | string[]> {
	const formatted: Record<string, string | number | boolean | string[]> = {};

	for (const [key, value] of Object.entries(attributes)) {
		if (value === undefined || value === null) {
			continue;
		}

		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			formatted[key] = value;
		} else if (Array.isArray(value)) {
			// Convert array to string array
			formatted[key] = value.map((v) => String(v));
		} else if (typeof value === "object") {
			// Convert object to JSON string
			formatted[key] = safeJsonStringify(value);
		}
	}

	return formatted;
}

/**
 * Get service name from environment or config
 */
export function getServiceName(configName?: string): string {
	return (
		process.env[ENV_VARS.OTEL_SERVICE_NAME] || configName || "iqai-adk-app"
	);
}

/**
 * Validate telemetry configuration
 */
export function validateConfig(config: any): string[] {
	const errors: string[] = [];

	if (!config.appName) {
		errors.push("appName is required");
	}

	if (!config.otlpEndpoint) {
		errors.push("otlpEndpoint is required");
	}

	if (
		config.samplingRatio !== undefined &&
		(config.samplingRatio < 0 || config.samplingRatio > 1)
	) {
		errors.push("samplingRatio must be between 0.0 and 1.0");
	}

	if (
		config.metricExportIntervalMs !== undefined &&
		config.metricExportIntervalMs < 1000
	) {
		errors.push("metricExportIntervalMs must be at least 1000ms");
	}

	return errors;
}
