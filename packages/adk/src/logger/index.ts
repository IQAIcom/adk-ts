import pino from "pino";
import { getLoggerConfig } from "./config";
import { AgentLogger } from "./specialized/agent-logger";
import { ContainerLogger } from "./specialized/container-logger";
import { LLMLogger } from "./specialized/llm-logger";
import { ToolLogger } from "./specialized/tool-logger";
import type { LogContext } from "./types";

export class Logger {
	private pino: pino.Logger;

	constructor(options: { name: string }) {
		this.pino = pino({
			...getLoggerConfig(),
			base: { component: options.name },
		});
	}

	// Standard logging methods with overloads
	trace(data: LogContext, message: string): void;
	trace(message: string): void;
	trace(dataOrMessage: LogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.trace(dataOrMessage);
		} else {
			this.pino.trace(dataOrMessage, message);
		}
	}

	debug(data: LogContext, message: string): void;
	debug(message: string): void;
	debug(dataOrMessage: LogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.debug(dataOrMessage);
		} else {
			this.pino.debug(dataOrMessage, message);
		}
	}

	info(data: LogContext, message: string): void;
	info(message: string): void;
	info(dataOrMessage: LogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.info(dataOrMessage);
		} else {
			this.pino.info(dataOrMessage, message);
		}
	}

	warn(data: LogContext, message: string): void;
	warn(message: string): void;
	warn(dataOrMessage: LogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.warn(dataOrMessage);
		} else {
			this.pino.warn(dataOrMessage, message);
		}
	}

	error(data: LogContext & { err?: Error }, message: string): void;
	error(message: string): void;
	error(message: string, error: Error): void;
	error(
		dataOrMessage: (LogContext & { err?: Error }) | string,
		messageOrError?: string | Error,
	) {
		if (typeof dataOrMessage === "string") {
			if (messageOrError instanceof Error) {
				// Legacy pattern: error(message, error)
				this.pino.error({ err: messageOrError }, dataOrMessage);
			} else {
				// Simple message
				this.pino.error(dataOrMessage);
			}
		} else {
			this.pino.error(dataOrMessage, messageOrError as string);
		}
	}

	fatal(data: LogContext & { err?: Error }, message: string): void;
	fatal(message: string): void;
	fatal(
		dataOrMessage: (LogContext & { err?: Error }) | string,
		message?: string,
	) {
		if (typeof dataOrMessage === "string") {
			this.pino.fatal(dataOrMessage);
		} else {
			this.pino.fatal(dataOrMessage, message);
		}
	}

	// Context-aware logger factories
	agent(agentName: string): AgentLogger {
		return new AgentLogger(this.pino.child({ agent: agentName }));
	}

	llm(model: string): LLMLogger {
		return new LLMLogger(this.pino.child({ llm: { model } }));
	}

	tool(toolName: string): ToolLogger {
		return new ToolLogger(this.pino.child({ tool: toolName }));
	}

	container(containerId: string): ContainerLogger {
		return new ContainerLogger(this.pino.child({ container: containerId }));
	}

	// Create child logger with additional context
	child(context: LogContext): Logger {
		const childLogger = new Logger({ name: "child" });
		childLogger.pino = this.pino.child(context);
		return childLogger;
	}
}

// Export specialized loggers
export { AgentLogger } from "./specialized/agent-logger";
export { LLMLogger } from "./specialized/llm-logger";
export { ToolLogger } from "./specialized/tool-logger";
export { ContainerLogger } from "./specialized/container-logger";

// Export types
export type { LogContext } from "./types";
