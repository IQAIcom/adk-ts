import type { Content, FunctionCall, Part } from "@google/genai";
import type { LlmResponse } from "../../models/llm-response";

/**
 * LogFormatter provides utility methods for formatting ADK objects for structured logging.
 * This class encapsulates all log formatting logic for consistent and type-safe
 * representation of LLM-related data structures compatible with Pino.
 */
export class LogFormatter {
	/**
	 * Formats function calls for structured logging.
	 * Returns an array of structured function call objects.
	 */
	static formatFunctionCalls(
		functionCalls: Part[],
	): { name: string; args: string }[] {
		if (!functionCalls || functionCalls.length === 0) {
			return [];
		}

		return functionCalls
			.filter((part: Part) => part.functionCall)
			.map((part: Part) => {
				const fc = part.functionCall as FunctionCall;
				const argsPreview = fc.args
					? JSON.stringify(fc.args).substring(0, 100) +
						(JSON.stringify(fc.args).length > 100 ? "..." : "")
					: "{}";
				return {
					name: fc.name,
					args: argsPreview,
				};
			});
	}

	/**
	 * Formats function calls as a simple string for display.
	 */
	static formatFunctionCallsString(functionCalls: Part[]): string {
		const formatted = LogFormatter.formatFunctionCalls(functionCalls);
		if (formatted.length === 0) return "none";

		return formatted.map((fc) => `${fc.name}(${fc.args})`).join(", ");
	}

	/**
	 * Formats content preview for structured logging.
	 */
	static formatContentPreview(content: Content): string {
		if (!content) return "none";

		// Handle Content type with parts
		if (content.parts && Array.isArray(content.parts)) {
			const textParts = content.parts
				.filter((part: Part) => part.text)
				.map((part: Part) => part.text)
				.join(" ");

			return textParts.length > 80
				? `${textParts.substring(0, 80)}...`
				: textParts || "no text content";
		}

		// Handle other types (fallback for compatibility)
		const stringified = JSON.stringify(content);
		return stringified.length > 80
			? `${stringified.substring(0, 80)}...`
			: stringified;
	}

	/**
	 * Formats response content preview for structured logging.
	 */
	static formatResponsePreview(llmResponse: LlmResponse): string {
		if (!llmResponse.content) return "none";
		return LogFormatter.formatContentPreview(llmResponse.content);
	}

	/**
	 * Formats content parts for structured logging.
	 * Returns structured data instead of string array.
	 */
	static formatContentParts(
		content: Content,
	): Array<{ type: string; preview: string; index: number }> {
		if (!content.parts)
			return [{ type: "none", preview: "no parts", index: 0 }];

		return content.parts.map((part: Part, index: number) => ({
			type: LogFormatter.getPartType(part),
			preview: LogFormatter.getPartPreview(part),
			index,
		}));
	}

	/**
	 * Gets the type of a Part for logging purposes.
	 */
	private static getPartType(part: Part): string {
		if (part.text !== undefined) return "text";
		if (part.functionCall !== undefined) return "function_call";
		if (part.functionResponse !== undefined) return "function_response";
		if (part.fileData !== undefined) return "file_data";
		if (part.executableCode !== undefined) return "executable_code";
		if (part.codeExecutionResult !== undefined) return "code_execution_result";
		return "unknown";
	}

	/**
	 * Gets a preview of Part content for logging purposes.
	 */
	private static getPartPreview(part: Part): string {
		if (part.text !== undefined) {
			return part.text.length > 50
				? `${part.text.substring(0, 50)}...`
				: part.text;
		}
		if (part.functionCall !== undefined) {
			const fc = part.functionCall;
			const argsPreview = fc.args
				? `${JSON.stringify(fc.args).substring(0, 50)}...`
				: "{}";
			return `${fc.name}(${argsPreview})`;
		}
		if (part.functionResponse !== undefined) {
			const response = part.functionResponse;
			return `${response.name} -> result`;
		}
		if (part.fileData !== undefined) {
			return `file: ${part.fileData.mimeType || "unknown type"}`;
		}
		if (part.executableCode !== undefined) {
			const code = part.executableCode.code || "";
			return code.length > 50 ? `${code.substring(0, 50)}...` : code;
		}
		if (part.codeExecutionResult !== undefined) {
			const outcome = part.codeExecutionResult.outcome || "unknown";
			return `execution result: ${outcome}`;
		}
		return "unknown content";
	}

	/**
	 * Formats a single function call as a pretty-printed string for display.
	 * This is useful for detailed logging and debugging purposes.
	 */
	static formatSingleFunctionCall(functionCall: FunctionCall): string {
		const name = functionCall.name;
		const args = functionCall.args || {};
		const prettyArgs = JSON.stringify(args, null, 2);
		return `${name}(\n${prettyArgs}\n)`;
	}
}
