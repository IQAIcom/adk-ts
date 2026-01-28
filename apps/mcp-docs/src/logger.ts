import type { FastMCP } from "fastmcp";
import winston from "winston";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
	level?: LogLevel;
	server?: FastMCP;
}

class Logger {
	private winstonLogger: winston.Logger;
	private server?: FastMCP;

	constructor(options: LoggerOptions = {}) {
		this.server = options.server;
		const level = options.level ?? "info";

		this.winstonLogger = winston.createLogger({
			level,
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.printf(({ timestamp, level, message, ...data }) => {
					const dataStr = Object.keys(data).length
						? ` ${JSON.stringify(data)}`
						: "";
					return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
				}),
			),
			transports: [
				new winston.transports.Console({
					stderrLevels: ["error", "warn", "info", "debug"], // Force all levels to stderr
				}),
			],
		});
	}

	// IMPORTANT: Use stderr for all logging to avoid interfering with
	// MCP JSON-RPC protocol which uses stdout
	debug(message: string, data?: unknown): void {
		this.winstonLogger.debug(message, data as any);
	}

	info(message: string, data?: unknown): void {
		this.winstonLogger.info(message, data as any);
	}

	warn(message: string, data?: unknown): void {
		this.winstonLogger.warn(message, data as any);
	}

	error(message: string, error?: unknown): void {
		if (error instanceof Error) {
			this.winstonLogger.error(message, {
				name: error.name,
				message: error.message,
				stack: error.stack,
			});
		} else {
			this.winstonLogger.error(message, error as any);
		}
	}

	setServer(server: FastMCP): void {
		this.server = server;
	}

	setLevel(level: LogLevel): void {
		this.winstonLogger.level = level;
	}
}

// Global logger instance - default to warn level to reduce noise
export const logger = new Logger({
	level: (process.env.LOG_LEVEL as LogLevel) ?? "warn",
});

export function createLogger(options?: LoggerOptions): Logger {
	return new Logger(options);
}
