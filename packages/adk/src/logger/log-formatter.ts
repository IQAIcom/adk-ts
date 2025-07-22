import type { Content, Part, FunctionCall } from "@google/genai";
import type { LlmResponse } from "../models/llm-response";

/**
 * LogFormatter provides utility methods for formatting ADK objects for logging.
 * This class encapsulates all log formatting logic for consistent and type-safe
 * representation of LLM-related data structures.
 */
export class LogFormatter {
	/**
	 * Formats function calls for display in logs.
	 * Returns a comma-separated string of function names with argument previews.
	 *
	 * @param functionCalls Array of Parts containing function calls
	 * @returns Formatted string representation of function calls
	 */
	static formatFunctionCalls(functionCalls: Part[]): string {
		if (!functionCalls || functionCalls.length === 0) {
			return "none";
		}

		return functionCalls
			.filter((part: Part) => part.functionCall)
			.map((part: Part) => {
				const fc = part.functionCall as FunctionCall;
				const argsPreview = fc.args
					? JSON.stringify(fc.args).substring(0, 50) +
						(JSON.stringify(fc.args).length > 50 ? "..." : "")
					: "{}";
				return `${fc.name}(${argsPreview})`;
			})
			.join(", ");
	}

	/**
	 * Formats content preview for debug logging.
	 * Uses a consistent format for displaying content in logs.
	 *
	 * @param content Content object to format
	 * @returns Formatted string representation of content
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
	 * Formats response content preview for debug logging.
	 * Specifically handles LlmResponse content structure.
	 *
	 * @param llmResponse LlmResponse object to format
	 * @returns Formatted string representation of response content
	 */
	static formatResponsePreview(llmResponse: LlmResponse): string {
		if (!llmResponse.content) return "none";

		return LogFormatter.formatContentPreview(llmResponse.content);
	}

	/**
	 * Formats a single function call for detailed logging.
	 * Provides more detailed formatting than formatFunctionCalls for individual calls.
	 *
	 * @param functionCall FunctionCall object to format
	 * @returns Formatted string representation of the function call
	 */
	static formatSingleFunctionCall(functionCall: FunctionCall): string {
		const argsStr = functionCall.args
			? JSON.stringify(functionCall.args, null, 2)
			: "{}";
		return `${functionCall.name}(\n${argsStr}\n)`;
	}

	/**
	 * Formats function response for detailed logging.
	 * Provides detailed formatting for function response objects.
	 *
	 * @param part Part containing function response
	 * @returns Formatted string representation of the function response
	 */
	static formatFunctionResponse(part: Part): string {
		if (!part.functionResponse) return "none";

		const response = part.functionResponse;
		const responseStr = response.response
			? JSON.stringify(response.response, null, 2)
			: "{}";
		return `${response.name} -> ${responseStr}`;
	}

	/**
	 * Formats content parts for detailed inspection.
	 * Shows the structure and content of all parts in a Content object.
	 *
	 * @param content Content object with parts to format
	 * @returns Array of formatted strings, one per part
	 */
	static formatContentParts(content: Content): string[] {
		if (!content.parts) return ["no parts"];

		return content.parts.map((part: Part, index: number) => {
			const partType = LogFormatter.getPartType(part);
			const preview = LogFormatter.getPartPreview(part);
			return `[${index}] ${partType}: ${preview}`;
		});
	}

	/**
	 * Gets the type of a Part for logging purposes.
	 *
	 * @param part Part object to analyze
	 * @returns String describing the part type
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
	 *
	 * @param part Part object to preview
	 * @returns String preview of the part content
	 */
	private static getPartPreview(part: Part): string {
		if (part.text !== undefined) {
			return part.text.length > 50
				? `"${part.text.substring(0, 50)}..."`
				: `"${part.text}"`;
		}
		if (part.functionCall !== undefined) {
			return LogFormatter.formatSingleFunctionCall(part.functionCall);
		}
		if (part.functionResponse !== undefined) {
			return LogFormatter.formatFunctionResponse(part);
		}
		if (part.fileData !== undefined) {
			return `file: ${part.fileData.mimeType || "unknown type"}`;
		}
		if (part.executableCode !== undefined) {
			const code = part.executableCode.code || "";
			return code.length > 50 ? `"${code.substring(0, 50)}..."` : `"${code}"`;
		}
		if (part.codeExecutionResult !== undefined) {
			const outcome = part.codeExecutionResult.outcome || "unknown";
			return `execution result: ${outcome}`;
		}
		return "unknown content";
	}
}
