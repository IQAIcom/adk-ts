import type { FastMCP } from "fastmcp";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
	level?: LogLevel;
	server?: FastMCP;
}

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

class Logger {
	private level: LogLevel;
	private server?: FastMCP;

	constructor(options: LoggerOptions = {}) {
		this.level = options.level ?? "info";
		this.server = options.server;
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
	}

	private formatMessage(
		level: LogLevel,
		message: string,
		data?: unknown,
	): string {
		const timestamp = new Date().toISOString();
		const dataStr = data ? ` ${JSON.stringify(data)}` : "";
		return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
	}

	// IMPORTANT: Use stderr for all logging to avoid interfering with
	// MCP JSON-RPC protocol which uses stdout
	debug(message: string, data?: unknown): void {
		if (this.shouldLog("debug")) {
			console.error(this.formatMessage("debug", message, data));
		}
	}

	info(message: string, data?: unknown): void {
		if (this.shouldLog("info")) {
			console.error(this.formatMessage("info", message, data));
		}
	}

	warn(message: string, data?: unknown): void {
		if (this.shouldLog("warn")) {
			console.error(this.formatMessage("warn", message, data));
		}
	}

	error(message: string, error?: unknown): void {
		if (this.shouldLog("error")) {
			const errorData =
				error instanceof Error
					? { name: error.name, message: error.message, stack: error.stack }
					: error;
			console.error(this.formatMessage("error", message, errorData));
		}
	}

	setServer(server: FastMCP): void {
		this.server = server;
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}
}

// Global logger instance - default to warn level to reduce noise
export const logger = new Logger({
	level: (process.env.LOG_LEVEL as LogLevel) ?? "warn",
});

export function createLogger(options?: LoggerOptions): Logger {
	return new Logger(options);
}
