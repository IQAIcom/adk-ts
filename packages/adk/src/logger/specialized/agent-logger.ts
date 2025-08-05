import type { Logger as PinoLogger } from "pino";
import type { AgentLogContext } from "../types";

export class AgentLogger {
	constructor(private pino: PinoLogger) {}

	started(data?: AgentLogContext) {
		this.pino.info(data, "Agent started");
	}

	completed(
		data?: AgentLogContext & { duration?: number; stepCount?: number },
	) {
		this.pino.info(data, "Agent completed");
	}

	error(error: Error, data?: AgentLogContext) {
		this.pino.error({ err: error, ...data }, "Agent error");
	}

	// Direct error method overload for structured data
	errorStructured(
		data: AgentLogContext & { err?: Error },
		message: string,
	): void;
	errorStructured(message: string): void;
	errorStructured(
		dataOrMessage: (AgentLogContext & { err?: Error }) | string,
		message?: string,
	) {
		if (typeof dataOrMessage === "string") {
			this.pino.error(dataOrMessage);
		} else {
			this.pino.error(dataOrMessage, message);
		}
	}

	transferring(
		targetAgent: string,
		data?: AgentLogContext & { reason?: string },
	) {
		this.pino.debug(
			{ target_agent: targetAgent, ...data },
			"Transferring to agent",
		);
	}

	step(stepNumber: number, data?: AgentLogContext) {
		this.pino.debug({ step: stepNumber, ...data }, "Agent step");
	}

	// Direct access to log levels
	trace(data: AgentLogContext, message: string): void;
	trace(message: string): void;
	trace(dataOrMessage: AgentLogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.trace(dataOrMessage);
		} else {
			this.pino.trace(dataOrMessage, message);
		}
	}

	debug(data: AgentLogContext, message: string): void;
	debug(message: string): void;
	debug(dataOrMessage: AgentLogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.debug(dataOrMessage);
		} else {
			this.pino.debug(dataOrMessage, message);
		}
	}

	info(data: AgentLogContext, message: string): void;
	info(message: string): void;
	info(dataOrMessage: AgentLogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.info(dataOrMessage);
		} else {
			this.pino.info(dataOrMessage, message);
		}
	}

	warn(data: AgentLogContext, message: string): void;
	warn(message: string): void;
	warn(dataOrMessage: AgentLogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.warn(dataOrMessage);
		} else {
			this.pino.warn(dataOrMessage, message);
		}
	}
}
