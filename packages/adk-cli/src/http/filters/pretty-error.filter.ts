import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from "@nestjs/common";
import { ZodError } from "zod";

interface ExpressResponse {
	status(code: number): ExpressResponse;
	json(body: any): void;
}

interface PrettyErrorResponse {
	error: string;
	message: string;
	details?: string[];
	stack?: string;
	timestamp: string;
	path?: string;
}

/**
 * Global exception filter that formats errors in a user-friendly way.
 * Handles agent errors, internal errors, Zod validation errors, and HTTP exceptions.
 */
@Catch()
export class PrettyErrorFilter implements ExceptionFilter {
	private readonly logger = new Logger("ErrorHandler");
	private readonly showStackTraces: boolean;

	constructor(showStackTraces = false) {
		this.showStackTraces =
			showStackTraces || process.env.ADK_DEBUG_NEST === "1";
	}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<ExpressResponse>();
		const request = ctx.getRequest();

		const errorResponse = this.formatError(exception, request.url);

		// Log the error with appropriate severity
		if (errorResponse.status >= 500) {
			this.logger.error(
				`${errorResponse.error}: ${errorResponse.message}`,
				this.showStackTraces ? errorResponse.stack : undefined,
			);
		} else {
			this.logger.warn(`${errorResponse.error}: ${errorResponse.message}`);
		}

		// Send formatted response
		response.status(errorResponse.status).json({
			error: errorResponse.error,
			message: errorResponse.message,
			...(errorResponse.details && { details: errorResponse.details }),
			...(this.showStackTraces &&
				errorResponse.stack && { stack: errorResponse.stack }),
			timestamp: errorResponse.timestamp,
			path: errorResponse.path,
		});
	}

	private formatError(
		exception: unknown,
		path: string,
	): PrettyErrorResponse & { status: number } {
		const timestamp = new Date().toISOString();

		// Handle Zod validation errors
		if (exception instanceof ZodError) {
			return {
				status: HttpStatus.BAD_REQUEST,
				error: "Validation Error",
				message: "Agent configuration or input validation failed",
				details: (exception as ZodError).issues.map((issue: any) => {
					const pathStr = issue.path.length ? issue.path.join(".") : "(root)";
					return `${pathStr}: ${issue.message}`;
				}),
				timestamp,
				path,
			};
		}

		// Handle NestJS HTTP exceptions
		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const exceptionResponse = exception.getResponse();
			const message =
				typeof exceptionResponse === "string"
					? exceptionResponse
					: (exceptionResponse as any).message || exception.message;

			return {
				status,
				error: exception.name,
				message: this.prettifyMessage(message),
				...(exception.stack && { stack: exception.stack }),
				timestamp,
				path,
			};
		}

		// Handle standard Error objects
		if (exception instanceof Error) {
			const status = this.determineStatusFromError(exception);
			const { error, message, details } = this.categorizeError(exception);

			return {
				status,
				error,
				message: this.prettifyMessage(message),
				...(details && { details }),
				...(exception.stack && { stack: exception.stack }),
				timestamp,
				path,
			};
		}

		// Handle unknown exceptions
		return {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			error: "Internal Server Error",
			message: "An unexpected error occurred",
			details: [String(exception)],
			timestamp,
			path,
		};
	}

	/**
	 * Categorizes errors into user-friendly categories with helpful messages
	 */
	private categorizeError(error: Error): {
		error: string;
		message: string;
		details?: string[];
	} {
		const errorMsg = error.message.toLowerCase();

		// Agent loading errors
		if (
			errorMsg.includes("failed to load agent") ||
			errorMsg.includes("failed to import")
		) {
			return {
				error: "Agent Loading Error",
				message: error.message,
				details: this.extractAgentLoadingDetails(error),
			};
		}

		// Missing environment variables
		if (
			errorMsg.includes("missing required environment variable") ||
			errorMsg.includes("environment variable")
		) {
			return {
				error: "Environment Configuration Error",
				message: error.message,
				details: [
					"💡 Check your .env file or environment variables",
					"Run 'adk check' to validate your configuration",
				],
			};
		}

		// Module resolution errors
		if (errorMsg.includes("cannot find module")) {
			const moduleName = this.extractModuleName(error.message);
			return {
				error: "Module Not Found",
				message: error.message,
				details: moduleName
					? [
							`Missing dependency: ${moduleName}`,
							`💡 Try running: npm install ${moduleName}`,
							"Or ensure it's declared in your package.json",
						]
					: [
							"💡 Check your imports and installed dependencies",
							"Run: npm install or pnpm install",
						],
			};
		}

		// Agent not found
		if (errorMsg.includes("agent not found")) {
			return {
				error: "Agent Not Found",
				message: error.message,
				details: [
					"💡 Make sure the agent exists and the path is correct",
					"Run 'adk list' to see available agents",
				],
			};
		}

		// Session errors
		if (errorMsg.includes("session")) {
			return {
				error: "Session Error",
				message: error.message,
			};
		}

		// Runtime errors (during agent execution)
		if (
			errorMsg.includes("runtime") ||
			errorMsg.includes("execution") ||
			errorMsg.includes("failed executing")
		) {
			return {
				error: "Agent Runtime Error",
				message: error.message,
				details: ["💡 Check your agent's code for runtime issues"],
			};
		}

		// Syntax errors
		if (error.name === "SyntaxError") {
			return {
				error: "Syntax Error",
				message: error.message,
				details: ["💡 Check your TypeScript/JavaScript code for syntax errors"],
			};
		}

		// Type errors
		if (error.name === "TypeError") {
			return {
				error: "Type Error",
				message: error.message,
				details: ["💡 Check for null/undefined values or type mismatches"],
			};
		}

		// Generic error
		return {
			error: error.name || "Error",
			message: error.message,
		};
	}

	/**
	 * Extract helpful details from agent loading errors
	 */
	private extractAgentLoadingDetails(error: Error): string[] {
		const details: string[] = [];

		if (error.message.includes("esbuild")) {
			details.push("💡 Compilation error during agent bundling");
		}

		if (error.message.includes(".ts")) {
			details.push("Check your TypeScript syntax and imports");
		}

		if (error.message.includes("Cannot find module")) {
			details.push("Ensure all dependencies are installed");
		}

		if (details.length === 0) {
			details.push("💡 Check your agent.ts file for errors");
		}

		return details;
	}

	/**
	 * Extract module name from "Cannot find module" errors
	 */
	private extractModuleName(message: string): string | null {
		const match = message.match(/Cannot find module ['"]([^'"]+)['"]/);
		return match ? match[1] : null;
	}

	/**
	 * Determine HTTP status code from error characteristics
	 */
	private determineStatusFromError(error: Error): HttpStatus {
		const errorMsg = error.message.toLowerCase();

		if (errorMsg.includes("not found") || errorMsg.includes("does not exist")) {
			return HttpStatus.NOT_FOUND;
		}

		if (
			errorMsg.includes("invalid") ||
			errorMsg.includes("validation") ||
			errorMsg.includes("missing required")
		) {
			return HttpStatus.BAD_REQUEST;
		}

		if (
			errorMsg.includes("unauthorized") ||
			errorMsg.includes("authentication")
		) {
			return HttpStatus.UNAUTHORIZED;
		}

		if (errorMsg.includes("forbidden") || errorMsg.includes("permission")) {
			return HttpStatus.FORBIDDEN;
		}

		// Default to internal server error for agent loading/runtime issues
		return HttpStatus.INTERNAL_SERVER_ERROR;
	}

	/**
	 * Clean up and prettify error messages
	 */
	private prettifyMessage(message: string | string[]): string {
		if (Array.isArray(message)) {
			return message.join("; ");
		}

		// Remove common prefixes that add noise
		let clean = message
			.replace(/^Error:\s*/i, "")
			.replace(/^Failed to\s+/i, "Failed to ");

		// Capitalize first letter if not already
		clean = clean.charAt(0).toUpperCase() + clean.slice(1);

		return clean;
	}
}
