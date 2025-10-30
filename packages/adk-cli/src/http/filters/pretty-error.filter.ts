import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";

// HTTP Status Code Constants
const HTTP_STATUS = {
	OK: HttpStatus.OK,
	BAD_REQUEST: HttpStatus.BAD_REQUEST,
	FORBIDDEN: HttpStatus.FORBIDDEN,
	NOT_FOUND: HttpStatus.NOT_FOUND,
	UNPROCESSABLE_ENTITY: HttpStatus.UNPROCESSABLE_ENTITY,
	INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
	SERVICE_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
} as const;

// CLI Exit Code Constants
const CLI_EXIT_CODE = {
	SUCCESS: 0,
	GENERAL_ERROR: 1,
	FILE_NOT_FOUND: 2,
	PERMISSION_ERROR: 3,
	NETWORK_ERROR: 4,
	MODULE_NOT_FOUND: 5,
	VALIDATION_ERROR: 6,
	CONFIG_ERROR: 7,
	SYNTAX_ERROR: 8,
} as const;

export interface ErrorCategory {
	type: string;
	httpStatus: number;
	cliExitCode: number;
	icon: string;
}

export interface FormattedError {
	errorType: string;
	message: string;
	suggestions: string[];
	statusCode: number;
	cliExitCode?: number;
	timestamp: string;
	path?: string;
	stack?: string;
}

interface ExceptionResponse {
	message?: string;
	statusCode?: number;
	error?: string;
}

export interface ErrorFormatterConfig {
	showStackTrace?: boolean;
	includeCLIExitCodes?: boolean;
	customCategories?: Map<string, ErrorCategory>;
}

/**
 * Global exception filter that transforms all errors into clean, user-friendly formats
 * with actionable suggestions and intelligent categorization.
 */
@Catch()
export class PrettyErrorFilter implements ExceptionFilter {
	private readonly logger = new Logger(PrettyErrorFilter.name);
	private readonly config: ErrorFormatterConfig;
	private readonly packageManager: string;

	constructor(config: ErrorFormatterConfig = {}) {
		this.config = {
			showStackTrace: false,
			includeCLIExitCodes: false,
			...config,
		};
		this.packageManager = this.detectPackageManager();
	}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();

		const formatted = this.formatError(exception);

		// Only show stack traces in debug mode or development
		const shouldShowStack =
			this.config.showStackTrace ||
			process.env.ADK_DEBUG_NEST === "1" ||
			process.env.NODE_ENV === "development";

		if (!shouldShowStack) {
			delete formatted.stack;
		}

		// Add request context
		formatted.path = request.url;

		// Include CLI exit code if configured
		if (!this.config.includeCLIExitCodes) {
			delete formatted.cliExitCode;
		}

		// Log the error for monitoring
		this.logger.error(
			`${formatted.errorType}: ${formatted.message}`,
			formatted.stack,
		);

		response.status(formatted.statusCode).json(formatted);
	}

	private formatError(exception: unknown): FormattedError {
		// Extract base error properties
		let message = "An unexpected error occurred";
		let stack: string | undefined;
		let _httpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR;

		try {
			if (exception instanceof HttpException) {
				_httpStatus = exception.getStatus();
				const exceptionResponse = exception.getResponse();

				if (typeof exceptionResponse === "string") {
					message = exceptionResponse;
				} else if (this.isExceptionResponse(exceptionResponse)) {
					message = exceptionResponse.message || message;
				}
				stack = exception.stack;
			} else if (exception instanceof Error) {
				message = exception.message;
				stack = exception.stack;
			} else if (typeof exception === "string") {
				message = exception;
			} else {
				// Handle unknown exception types
				message = "An unknown error occurred";
				this.logger.warn("Unknown exception type:", exception);
			}
		} catch (error) {
			this.logger.error("Error while extracting exception details:", error);
			message = "Failed to process error details";
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
			cliExitCode: category.cliExitCode,
			timestamp: new Date().toISOString(),
			stack,
		};
	}

	private isExceptionResponse(obj: unknown): obj is ExceptionResponse {
		return (
			typeof obj === "object" &&
			obj !== null &&
			("message" in obj || "statusCode" in obj || "error" in obj)
		);
	}

	private detectPackageManager(): string {
		const cwd = process.cwd();

		// Check for lock files in order of preference
		if (existsSync(join(cwd, "pnpm-lock.yaml"))) {
			return "pnpm";
		}
		if (existsSync(join(cwd, "yarn.lock"))) {
			return "yarn";
		}
		if (existsSync(join(cwd, "package-lock.json"))) {
			return "npm";
		}
		if (existsSync(join(cwd, "bun.lockb"))) {
			return "bun";
		}

		// Default to npm if no lock file found
		return "npm";
	}

	private categorizeError(message: string): ErrorCategory {
		const lowerMsg = message.toLowerCase();

		// Check custom categories first if configured
		if (this.config.customCategories) {
			for (const [pattern, category] of this.config.customCategories) {
				if (lowerMsg.includes(pattern.toLowerCase())) {
					return category;
				}
			}
		}

		// File system errors
		if (
			lowerMsg.includes("enoent") ||
			lowerMsg.includes("file not found") ||
			lowerMsg.includes("no such file or directory")
		) {
			return {
				type: "File Not Found",
				httpStatus: HTTP_STATUS.NOT_FOUND,
				cliExitCode: CLI_EXIT_CODE.FILE_NOT_FOUND,
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
				httpStatus: HTTP_STATUS.FORBIDDEN,
				cliExitCode: CLI_EXIT_CODE.PERMISSION_ERROR,
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
				httpStatus: HTTP_STATUS.SERVICE_UNAVAILABLE,
				cliExitCode: CLI_EXIT_CODE.NETWORK_ERROR,
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
				httpStatus: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				cliExitCode: CLI_EXIT_CODE.GENERAL_ERROR,
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
				httpStatus: HTTP_STATUS.NOT_FOUND,
				cliExitCode: CLI_EXIT_CODE.MODULE_NOT_FOUND,
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
				httpStatus: HTTP_STATUS.BAD_REQUEST,
				cliExitCode: CLI_EXIT_CODE.VALIDATION_ERROR,
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
				httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR,
				cliExitCode: CLI_EXIT_CODE.CONFIG_ERROR,
				icon: "🌱",
			};
		}

		// Agent not found
		if (lowerMsg.includes("agent not found")) {
			return {
				type: "Agent Not Found",
				httpStatus: HTTP_STATUS.NOT_FOUND,
				cliExitCode: CLI_EXIT_CODE.FILE_NOT_FOUND,
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
				httpStatus: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				cliExitCode: CLI_EXIT_CODE.SYNTAX_ERROR,
				icon: "🧾",
			};
		}

		// Type errors
		if (lowerMsg.includes("typeerror")) {
			return {
				type: "Type Error",
				httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR,
				cliExitCode: CLI_EXIT_CODE.GENERAL_ERROR,
				icon: "🔢",
			};
		}

		// Default runtime error
		return {
			type: "Runtime Error",
			httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR,
			cliExitCode: CLI_EXIT_CODE.GENERAL_ERROR,
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
				/['"]([^'"]+\.(?:ts|js|json|env|yaml|yml))['"]/,
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
					`Install the missing package: ${this.packageManager} add ${moduleName}`,
					`Check if ${moduleName} is in your package.json dependencies`,
					`Run '${this.packageManager} install' to ensure all dependencies are installed`,
				);
			} else {
				suggestions.push(
					`Run '${this.packageManager} install' to install missing dependencies`,
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
				`Try running '${this.packageManager} add @iqai/adk' to update the SDK`,
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
			/Error: Cannot find package ['"]([^'"]+)['"]/,
		];

		for (const pattern of patterns) {
			const match = message.match(pattern);
			if (match?.[1]) {
				return this.normalizeModulePath(match[1]);
			}
		}

		return null;
	}

	private normalizeModulePath(modulePath: string): string {
		// Handle relative paths - extract just the package name
		if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
			// This is a relative import, not a package
			return modulePath;
		}

		// Handle scoped packages (@org/package)
		if (modulePath.startsWith("@")) {
			const parts = modulePath.split("/");
			return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : modulePath;
		}

		// Handle regular packages with subpaths
		const firstSegment = modulePath.split("/")[0];

		// Check if it's a Node.js built-in module
		const builtInModules = [
			"fs",
			"path",
			"http",
			"https",
			"crypto",
			"stream",
			"url",
			"util",
			"events",
			"os",
			"child_process",
			"net",
			"buffer",
		];

		if (builtInModules.includes(firstSegment)) {
			return firstSegment;
		}

		// Return just the package name
		return firstSegment;
	}

	private extractEnvVarName(message: string): string | null {
		const patterns = [
			/environment variable[:\s]+([A-Z_][A-Z0-9_]*)/i,
			/Missing required[:\s]+([A-Z_][A-Z0-9_]*)/i,
			/variable[:\s]+([A-Z_][A-Z0-9_]*)/i,
			/([A-Z_][A-Z0-9_]*)\s+is\s+(?:not\s+)?(?:defined|set|required)/i,
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
		let cleaned = message
			.replace(/^Error:\s*/i, "")
			.replace(/^Failed to\s+/i, "")
			.replace(/^Exception:\s*/i, "")
			.trim();

		// Capitalize first letter
		if (cleaned.length > 0) {
			cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
		}

		return cleaned || "An unexpected error occurred";
	}
}
