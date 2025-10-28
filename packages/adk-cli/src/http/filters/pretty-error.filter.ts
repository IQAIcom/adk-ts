import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";

export interface ErrorCategory {
	type: string;
	httpStatus: number;
	icon: string;
}

export interface FormattedError {
	errorType: string;
	message: string;
	suggestions: string[];
	statusCode: number;
	timestamp: string;
	path?: string;
	stack?: string;
}

/**
 * Global exception filter that transforms all errors into clean, user-friendly formats
 * with actionable suggestions and intelligent categorization.
 */
@Catch()
export class PrettyErrorFilter implements ExceptionFilter {
	private readonly logger = new Logger(PrettyErrorFilter.name);

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();

		const formatted = this.formatError(exception);

		// Only show stack traces in debug mode or development
		if (
			process.env.ADK_DEBUG_NEST !== "1" &&
			process.env.NODE_ENV !== "development"
		) {
			delete formatted.stack;
		}

		// Add request context
		formatted.path = request.url;

		response.status(formatted.statusCode).json(formatted);
	}

	private formatError(exception: unknown): FormattedError {
		// Extract base error properties
		let message = "An unexpected error occurred";
		let stack: string | undefined;
		let _httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

		if (exception instanceof HttpException) {
			_httpStatus = exception.getStatus();
			const exceptionResponse = exception.getResponse();
			if (typeof exceptionResponse === "string") {
				message = exceptionResponse;
			} else if (
				typeof exceptionResponse === "object" &&
				exceptionResponse !== null
			) {
				message = (exceptionResponse as any).message || message;
			}
			stack = exception.stack;
		} else if (exception instanceof Error) {
			message = exception.message;
			stack = exception.stack;
		} else if (typeof exception === "string") {
			message = exception;
		}

		// Categorize error and extract suggestions
		const category = this.categorizeError(message);
		const suggestions = this.generateSuggestions(message, category);

		// Clean up message
		message = this.cleanMessage(message);

		return {
			errorType: category.type,
			message,
			suggestions,
			statusCode: category.httpStatus,
			timestamp: new Date().toISOString(),
			stack,
		};
	}

	private categorizeError(message: string): ErrorCategory {
		const lowerMsg = message.toLowerCase();

		// File system errors
		if (
			lowerMsg.includes("enoent") ||
			lowerMsg.includes("file not found") ||
			lowerMsg.includes("no such file or directory")
		) {
			return {
				type: "File Not Found",
				httpStatus: HttpStatus.NOT_FOUND,
				icon: "📄",
			};
		}

		// Permission errors
		if (
			lowerMsg.includes("eacces") ||
			lowerMsg.includes("permission denied") ||
			lowerMsg.includes("eperm")
		) {
			return {
				type: "Permission Error",
				httpStatus: HttpStatus.FORBIDDEN,
				icon: "🔒",
			};
		}

		// Network/connection errors
		if (
			lowerMsg.includes("econnrefused") ||
			lowerMsg.includes("connection refused") ||
			lowerMsg.includes("etimedout") ||
			lowerMsg.includes("enotfound") ||
			lowerMsg.includes("network error") ||
			lowerMsg.includes("fetch failed")
		) {
			return {
				type: "Network Error",
				httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
				icon: "🌐",
			};
		}

		// Agent loading errors
		if (
			lowerMsg.includes("failed to import") ||
			lowerMsg.includes("failed to load agent") ||
			lowerMsg.includes("agent export") ||
			lowerMsg.includes("compilation failed") ||
			lowerMsg.includes("no agent.js or agent.ts file") ||
			lowerMsg.includes("invalid agent export") ||
			lowerMsg.includes("both require() and import() failed")
		) {
			return {
				type: "Agent Loading Error",
				httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
				icon: "🧠",
			};
		}

		// Module not found
		if (
			lowerMsg.includes("cannot find module") ||
			lowerMsg.includes("module not found") ||
			lowerMsg.includes("module resolution failed")
		) {
			return {
				type: "Module Not Found",
				httpStatus: HttpStatus.NOT_FOUND,
				icon: "📦",
			};
		}

		// Validation errors
		if (
			lowerMsg.includes("validation") ||
			lowerMsg.includes("invalid") ||
			lowerMsg.includes("required")
		) {
			return {
				type: "Validation Error",
				httpStatus: HttpStatus.BAD_REQUEST,
				icon: "🧩",
			};
		}

		// Environment configuration
		if (
			lowerMsg.includes("environment variable") ||
			lowerMsg.includes("missing required") ||
			lowerMsg.includes(".env")
		) {
			return {
				type: "Environment Configuration Error",
				httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
				icon: "🌱",
			};
		}

		// Agent not found
		if (lowerMsg.includes("agent not found")) {
			return {
				type: "Agent Not Found",
				httpStatus: HttpStatus.NOT_FOUND,
				icon: "🤖",
			};
		}

		// Syntax errors
		if (
			lowerMsg.includes("syntaxerror") ||
			lowerMsg.includes("unexpected token")
		) {
			return {
				type: "Syntax Error",
				httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
				icon: "🧾",
			};
		}

		// Type errors
		if (lowerMsg.includes("typeerror")) {
			return {
				type: "Type Error",
				httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
				icon: "🔢",
			};
		}

		// Default runtime error
		return {
			type: "Runtime Error",
			httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
			icon: "⚙️",
		};
	}

	private generateSuggestions(
		message: string,
		category: ErrorCategory,
	): string[] {
		const suggestions: string[] = [];
		const lowerMsg = message.toLowerCase();

		// File not found suggestions
		if (category.type === "File Not Found") {
			suggestions.push(
				"Check that the file path is correct",
				"Verify the file exists in your project directory",
				"Ensure you're running the command from the correct directory",
			);
			const filePathMatch = message.match(
				/['"]([^'"]+\.(?:ts|js|json|env))['"]/,
			);
			if (filePathMatch?.[1]) {
				suggestions.push(`Create the missing file: ${filePathMatch[1]}`);
			}
		}

		// Permission error suggestions
		if (category.type === "Permission Error") {
			suggestions.push(
				"Check file permissions with 'ls -la'",
				"You may need to run with appropriate permissions",
				"Ensure the file or directory is not locked by another process",
			);
		}

		// Network error suggestions
		if (category.type === "Network Error") {
			if (
				lowerMsg.includes("econnrefused") ||
				lowerMsg.includes("connection refused")
			) {
				suggestions.push(
					"Ensure the server is running",
					"Check if the correct port is being used (default: 8042)",
					"Verify firewall settings are not blocking the connection",
				);
			} else if (lowerMsg.includes("etimedout")) {
				suggestions.push(
					"Check your internet connection",
					"The server may be experiencing high load",
					"Try increasing the timeout value",
				);
			} else if (lowerMsg.includes("enotfound")) {
				suggestions.push(
					"Verify the hostname or URL is correct",
					"Check your DNS settings",
					"Ensure you have internet connectivity",
				);
			} else {
				suggestions.push(
					"Check your network connection",
					"Verify the API endpoint is accessible",
					"Check for any proxy or VPN issues",
				);
			}
		}

		// Module not found suggestions
		if (category.type === "Module Not Found") {
			const moduleName = this.extractModuleName(message);
			if (moduleName) {
				suggestions.push(
					`Install the missing package: pnpm add ${moduleName}`,
					`Check if ${moduleName} is in your package.json dependencies`,
					"Run 'pnpm install' to ensure all dependencies are installed",
				);
			} else {
				suggestions.push(
					"Run 'pnpm install' to install missing dependencies",
					"Check your import statements for typos",
					"Ensure the module path is correct",
				);
			}
		}

		// Environment variable suggestions
		if (category.type === "Environment Configuration Error") {
			if (lowerMsg.includes("google_api_key")) {
				suggestions.push(
					"Add GOOGLE_API_KEY to your .env file",
					"Get an API key from https://console.cloud.google.com/apis/credentials",
				);
			} else if (lowerMsg.includes("anthropic")) {
				suggestions.push(
					"Add ANTHROPIC_API_KEY to your .env file",
					"Get an API key from https://console.anthropic.com/",
				);
			} else if (lowerMsg.includes("openai")) {
				suggestions.push(
					"Add OPENAI_API_KEY to your .env file",
					"Get an API key from https://platform.openai.com/api-keys",
				);
			} else {
				const varName = this.extractEnvVarName(message);
				if (varName) {
					suggestions.push(
						`Add ${varName} to your .env file`,
						"Create a .env file in your project root if it doesn't exist",
						"Check .env.example for required variables",
					);
				}
			}
		}

		// Agent loading suggestions
		if (category.type === "Agent Loading Error") {
			suggestions.push(
				"Check your agent.ts file for syntax errors",
				"Ensure all imports are correct and installed",
				"Verify your agent exports a valid agent instance",
				"Try running 'pnpm add @iqai/adk' to update the SDK",
			);
		}

		// Agent not found suggestions
		if (category.type === "Agent Not Found") {
			suggestions.push(
				"Verify the agent path exists in your agents directory",
				"Check the agent name spelling",
				"Ensure the agent has an agent.ts or agent.js file",
			);
		}

		// Validation suggestions
		if (category.type === "Validation Error") {
			suggestions.push(
				"Check the request payload format",
				"Ensure all required fields are provided",
				"Verify data types match the expected schema",
			);
		}

		// Syntax error suggestions
		if (category.type === "Syntax Error") {
			suggestions.push(
				"Check your code for syntax errors",
				"Look for unclosed brackets, parentheses, or quotes",
				"Ensure your TypeScript/JavaScript syntax is valid",
			);
		}

		// Type error suggestions
		if (category.type === "Type Error") {
			suggestions.push(
				"Check variable types and assignments",
				"Ensure you're calling methods on the correct object types",
				"Verify function arguments match expected types",
			);
		}

		// Generic fallback
		if (suggestions.length === 0) {
			suggestions.push(
				"Check the error message for specific details",
				"Enable debug mode with ADK_DEBUG_NEST=1 for more information",
				"Review your recent code changes",
			);
		}

		return suggestions;
	}

	private extractModuleName(message: string): string | null {
		// Try to extract module name from common error patterns
		const patterns = [
			/Cannot find module ['"]([^'"]+)['"]/,
			/Module not found: Error: Can't resolve ['"]([^'"]+)['"]/,
			/Cannot resolve module ['"]([^'"]+)['"]/,
		];

		for (const pattern of patterns) {
			const match = message.match(pattern);
			if (match?.[1]) {
				// Clean up the module name (remove paths, keep just the package)
				const modulePath = match[1];
				if (modulePath.startsWith("@")) {
					// Scoped package
					const parts = modulePath.split("/");
					return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : modulePath;
				}
				// Regular package
				return modulePath.split("/")[0];
			}
		}

		return null;
	}

	private extractEnvVarName(message: string): string | null {
		const patterns = [
			/environment variable[:\s]+([A-Z_][A-Z0-9_]*)/i,
			/Missing required[:\s]+([A-Z_][A-Z0-9_]*)/i,
			/variable[:\s]+([A-Z_][A-Z0-9_]*)/i,
		];

		for (const pattern of patterns) {
			const match = message.match(pattern);
			if (match?.[1]) {
				return match[1];
			}
		}

		return null;
	}

	private cleanMessage(message: string): string {
		// Remove redundant prefixes
		let cleanedMessage = message.replace(/^Error:\s*/i, "");
		cleanedMessage = cleanedMessage.replace(/^Failed to\s+/i, "");

		// Trim and capitalize first letter
		cleanedMessage = cleanedMessage.trim();
		if (cleanedMessage.length > 0) {
			cleanedMessage =
				cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
		}

		return cleanedMessage;
	}
}
