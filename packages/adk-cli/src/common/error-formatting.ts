import type { FormattedError } from "../http/filters/pretty-error.filter";

export interface ConsoleErrorOptions {
	showStack?: boolean;
	colorize?: boolean;
}

/**
 * Utility class for formatting errors in a user-friendly way for console output
 */
export class ErrorFormattingUtils {
	/**
	 * Format an error for user-friendly console display with categorization,
	 * clean messages, and actionable suggestions
	 */
	static formatUserError(
		error: Error | FormattedError | string,
		options: ConsoleErrorOptions = {},
	): string {
		const { showStack = false, colorize = true } = options;

		// Parse the error into structured format
		const structured = this.parseError(error);

		// Build the formatted output
		const lines: string[] = [];

		// Title with emoji/icon
		const icon = this.getIconForErrorType(structured.errorType);
		lines.push("");
		lines.push(this.formatHeader(`${icon} ${structured.errorType}`, colorize));
		lines.push(this.formatDivider(colorize));

		// Main error message
		lines.push(this.formatMessage(structured.message, colorize));
		lines.push("");

		// Suggestions section
		if (structured.suggestions && structured.suggestions.length > 0) {
			lines.push(this.formatSectionHeader("💡 Suggestions", colorize));
			for (const suggestion of structured.suggestions) {
				lines.push(this.formatSuggestion(suggestion, colorize));
			}
			lines.push("");
		}

		// Additional context if available
		if (structured.path) {
			lines.push(this.formatContextLine("Path", structured.path, colorize));
		}

		if (structured.timestamp) {
			lines.push(
				this.formatContextLine("Time", structured.timestamp, colorize),
			);
		}

		// Stack trace (only in debug mode)
		if (showStack && structured.stack) {
			lines.push("");
			lines.push(this.formatSectionHeader("🐞 Stack Trace", colorize));
			lines.push(this.formatStack(structured.stack, colorize));
		}

		lines.push("");
		return lines.join("\n");
	}

	/**
	 * Parse various error formats into a structured format
	 */
	private static parseError(
		error: Error | FormattedError | string,
	): FormattedError {
		// Already formatted
		if (this.isFormattedError(error)) {
			return error;
		}

		// Error object
		if (error instanceof Error) {
			return {
				errorType: this.categorizeErrorMessage(error.message),
				message: this.cleanErrorMessage(error.message),
				suggestions: this.generateSuggestionsForMessage(error.message),
				statusCode: 500,
				timestamp: new Date().toISOString(),
				stack: error.stack,
			};
		}

		// String error
		const errorStr = String(error);
		return {
			errorType: this.categorizeErrorMessage(errorStr),
			message: this.cleanErrorMessage(errorStr),
			suggestions: this.generateSuggestionsForMessage(errorStr),
			statusCode: 500,
			timestamp: new Date().toISOString(),
		};
	}

	private static isFormattedError(obj: any): obj is FormattedError {
		return (
			obj &&
			typeof obj === "object" &&
			"errorType" in obj &&
			"message" in obj &&
			"suggestions" in obj
		);
	}

	/**
	 * Categorize error message to determine error type
	 */
	private static categorizeErrorMessage(message: string): string {
		const lowerMsg = message.toLowerCase();

		if (
			lowerMsg.includes("enoent") ||
			lowerMsg.includes("file not found") ||
			lowerMsg.includes("no such file or directory")
		) {
			return "File Not Found";
		}
		if (
			lowerMsg.includes("eacces") ||
			lowerMsg.includes("permission denied") ||
			lowerMsg.includes("eperm")
		) {
			return "Permission Error";
		}
		if (
			lowerMsg.includes("econnrefused") ||
			lowerMsg.includes("connection refused") ||
			lowerMsg.includes("etimedout") ||
			lowerMsg.includes("enotfound") ||
			lowerMsg.includes("network error") ||
			lowerMsg.includes("fetch failed")
		) {
			return "Network Error";
		}
		if (
			lowerMsg.includes("cannot find module") ||
			lowerMsg.includes("module not found")
		) {
			return "Module Not Found";
		}
		if (
			lowerMsg.includes("environment variable") ||
			lowerMsg.includes(".env")
		) {
			return "Environment Configuration Error";
		}
		if (
			lowerMsg.includes("failed to import") ||
			lowerMsg.includes("failed to load agent")
		) {
			return "Agent Loading Error";
		}
		if (lowerMsg.includes("agent not found")) {
			return "Agent Not Found";
		}
		if (lowerMsg.includes("validation") || lowerMsg.includes("invalid")) {
			return "Validation Error";
		}
		if (lowerMsg.includes("syntaxerror")) {
			return "Syntax Error";
		}
		if (lowerMsg.includes("typeerror")) {
			return "Type Error";
		}

		return "Runtime Error";
	}

	/**
	 * Clean error message by removing redundant prefixes
	 */
	private static cleanErrorMessage(message: string): string {
		let cleanedMessage = message.replace(/^Error:\s*/i, "");
		cleanedMessage = cleanedMessage.replace(/^Failed to\s+/i, "");
		cleanedMessage = cleanedMessage.trim();
		if (cleanedMessage.length > 0) {
			cleanedMessage =
				cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
		}
		return cleanedMessage;
	}

	/**
	 * Generate helpful suggestions based on error message
	 */
	private static generateSuggestionsForMessage(message: string): string[] {
		const suggestions: string[] = [];
		const lowerMsg = message.toLowerCase();

		if (lowerMsg.includes("enoent") || lowerMsg.includes("file not found")) {
			suggestions.push("Check that the file path is correct");
			suggestions.push("Verify the file exists in your project directory");
		}

		if (lowerMsg.includes("eacces") || lowerMsg.includes("permission denied")) {
			suggestions.push("Check file permissions with 'ls -la'");
			suggestions.push("You may need to run with appropriate permissions");
		}

		if (
			lowerMsg.includes("econnrefused") ||
			lowerMsg.includes("connection refused") ||
			lowerMsg.includes("network error")
		) {
			suggestions.push("Ensure the server is running");
			suggestions.push("Check if the correct port is being used");
			suggestions.push("Verify your network connection");
		}

		if (lowerMsg.includes("cannot find module")) {
			const moduleName = this.extractModuleName(message);
			if (moduleName) {
				suggestions.push(`Install the missing package: pnpm add ${moduleName}`);
				suggestions.push(
					"Run 'pnpm install' to ensure all dependencies are installed",
				);
			}
		}

		if (lowerMsg.includes("environment variable")) {
			const varName = this.extractEnvVarName(message);
			if (varName) {
				suggestions.push(`Add ${varName} to your .env file`);
				suggestions.push(
					"Create a .env file in your project root if it doesn't exist",
				);
			}
		}

		if (lowerMsg.includes("agent not found")) {
			suggestions.push("Check the agent path and ensure it exists");
			suggestions.push("Verify the agent has an agent.ts or agent.js file");
		}

		if (suggestions.length === 0) {
			suggestions.push(
				"Enable debug mode with ADK_DEBUG_NEST=1 for more information",
			);
		}

		return suggestions;
	}

	private static extractModuleName(message: string): string | null {
		const match = message.match(/Cannot find module ['"]([^'"]+)['"]/);
		if (match?.[1]) {
			const modulePath = match[1];
			if (modulePath.startsWith("@")) {
				const parts = modulePath.split("/");
				return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : modulePath;
			}
			return modulePath.split("/")[0];
		}
		return null;
	}

	private static extractEnvVarName(message: string): string | null {
		const match = message.match(
			/environment variable[:\s]+([A-Z_][A-Z0-9_]*)/i,
		);
		return match?.[1] ? match[1] : null;
	}

	private static getIconForErrorType(errorType: string): string {
		const iconMap: Record<string, string> = {
			"File Not Found": "📄",
			"Permission Error": "🔒",
			"Network Error": "🌐",
			"Module Not Found": "📦",
			"Environment Configuration Error": "🌱",
			"Agent Loading Error": "🧠",
			"Agent Not Found": "🤖",
			"Validation Error": "🧩",
			"Syntax Error": "🧾",
			"Type Error": "🔢",
			"Runtime Error": "⚙️",
		};
		return iconMap[errorType] || "❌";
	}

	// Formatting helpers
	private static formatHeader(text: string, colorize: boolean): string {
		return colorize ? `\x1b[1m\x1b[31m${text}\x1b[0m` : text;
	}

	private static formatDivider(colorize: boolean): string {
		const divider = "━".repeat(50);
		return colorize ? `\x1b[90m${divider}\x1b[0m` : divider;
	}

	private static formatMessage(text: string, colorize: boolean): string {
		return colorize ? `\x1b[97m${text}\x1b[0m` : text;
	}

	private static formatSectionHeader(text: string, colorize: boolean): string {
		return colorize ? `\x1b[1m${text}\x1b[0m` : text;
	}

	private static formatSuggestion(text: string, colorize: boolean): string {
		const bullet = "  • ";
		return colorize ? `\x1b[36m${bullet}\x1b[0m${text}` : `${bullet}${text}`;
	}

	private static formatContextLine(
		label: string,
		value: string,
		colorize: boolean,
	): string {
		return colorize
			? `\x1b[90m${label}:\x1b[0m ${value}`
			: `${label}: ${value}`;
	}

	private static formatStack(stack: string, colorize: boolean): string {
		return colorize ? `\x1b[90m${stack}\x1b[0m` : stack;
	}

	/**
	 * Parse JSON error response from API
	 */
	static parseApiError(responseText: string): FormattedError | null {
		try {
			const parsed = JSON.parse(responseText);
			if (this.isFormattedError(parsed)) {
				return parsed;
			}
		} catch {
			// Not JSON
		}
		return null;
	}
}
