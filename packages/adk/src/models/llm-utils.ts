import type { Logger } from "@adk/logger";

/**
 * Safely parse tool call arguments JSON, falling back to empty args on failure.
 * Prevents malformed streaming JSON from crashing async generators.
 */
export function safeParseToolArgs(
	json: string | undefined,
	logger: Logger,
): Record<string, unknown> {
	try {
		return JSON.parse(json || "{}");
	} catch (error) {
		logger.warn("Failed to parse tool call arguments, using empty args", {
			rawArgs: json,
			error: String(error),
		});
		return {};
	}
}
