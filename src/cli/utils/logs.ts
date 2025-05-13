// Logging utilities for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the logging utility functionality from the Python SDK

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Logger configuration options
 */
export interface LoggerOptions {
	level?: "debug" | "info" | "warn" | "error";
	toFile?: boolean;
	filePath?: string;
}

/**
 * Logger class for ADK applications
 */
export class Logger {
	private level: string;
	private toFile: boolean;
	private filePath?: string;

	/**
	 * Creates a new Logger instance
	 *
	 * @param options Logger configuration options
	 */
	constructor(options: LoggerOptions = {}) {
		this.level = options.level || "info";
		this.toFile = options.toFile || false;
		this.filePath = options.filePath;

		if (this.toFile && !this.filePath) {
			this.filePath = path.join(os.tmpdir(), `adk_${Date.now()}.log`);
		}
	}

	/**
	 * Logs a debug message
	 *
	 * @param message The message to log
	 * @param data Additional data to log
	 */
	debug(message: string, data?: any): void {
		if (["debug"].includes(this.level)) {
			this.log("DEBUG", message, data);
		}
	}

	/**
	 * Logs an info message
	 *
	 * @param message The message to log
	 * @param data Additional data to log
	 */
	info(message: string, data?: any): void {
		if (["debug", "info"].includes(this.level)) {
			this.log("INFO", message, data);
		}
	}

	/**
	 * Logs a warning message
	 *
	 * @param message The message to log
	 * @param data Additional data to log
	 */
	warn(message: string, data?: any): void {
		if (["debug", "info", "warn"].includes(this.level)) {
			this.log("WARN", message, data);
		}
	}

	/**
	 * Logs an error message
	 *
	 * @param message The message to log
	 * @param data Additional data to log
	 */
	error(message: string, data?: any): void {
		this.log("ERROR", message, data);
	}

	/**
	 * Logs a message with the specified level
	 *
	 * @param level The log level
	 * @param message The message to log
	 * @param data Additional data to log
	 */
	private log(level: string, message: string, data?: any): void {
		const timestamp = new Date().toISOString();
		const logMessage = `[${timestamp}] [${level}] ${message}${data ? ` ${JSON.stringify(data)}` : ""}`;

		if (this.toFile && this.filePath) {
			// Append to file
			fs.appendFileSync(this.filePath, `${logMessage}\n`);
		} else {
			// Log to console
			if (level === "ERROR") {
				console.error(logMessage);
			} else if (level === "WARN") {
				console.warn(logMessage);
			} else {
				console.log(logMessage);
			}
		}
	}
}

/**
 * Global logger instance
 */
const globalLogger = new Logger();

/**
 * Configures the logger to log to a temporary folder
 */
export function logToTmpFolder(): void {
	const timestamp = new Date().toISOString().replace(/:/g, "-");
	const logDir = path.join(os.tmpdir(), "adk_logs");

	if (!fs.existsSync(logDir)) {
		fs.mkdirSync(logDir, { recursive: true });
	}

	const logPath = path.join(logDir, `adk_${timestamp}.log`);
	console.log(`Logging to ${logPath}`);

	// Replace the global logger with one that logs to a file
	Object.assign(
		globalLogger,
		new Logger({
			toFile: true,
			filePath: logPath,
		}),
	);
}

/**
 * Configures the logger to log to stderr
 */
export function logToStderr(): void {
	// Replace the global logger with one that logs to stderr
	Object.assign(
		globalLogger,
		new Logger({
			toFile: false,
		}),
	);
}

// Export the global logger
export default globalLogger;
