import type { Logger as PinoLogger } from "pino";
import type { ContainerLogContext } from "../types";

export class ContainerLogger {
	constructor(private pino: PinoLogger) {}

	building(
		data?: ContainerLogContext & { imageTag?: string; dockerfile?: string },
	) {
		this.pino.info(data, "Building container image");
	}

	starting(
		data?: ContainerLogContext & { ports?: string[]; volumes?: string[] },
	) {
		this.pino.info(data, "Starting container");
	}

	executing(
		data?: ContainerLogContext & { language?: string; codeLength?: number },
	) {
		this.pino.debug(data, "Executing code in container");
	}

	stopped(
		data?: ContainerLogContext & { exitCode?: number; duration?: number },
	) {
		this.pino.debug(data, "Container stopped");
	}

	error(error: Error, data?: ContainerLogContext) {
		this.pino.error({ err: error, ...data }, "Container error");
	}

	// Direct access to log levels
	trace(data: ContainerLogContext, message: string): void;
	trace(message: string): void;
	trace(dataOrMessage: ContainerLogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.trace(dataOrMessage);
		} else {
			this.pino.trace(dataOrMessage, message);
		}
	}

	debug(data: ContainerLogContext, message: string): void;
	debug(message: string): void;
	debug(dataOrMessage: ContainerLogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.debug(dataOrMessage);
		} else {
			this.pino.debug(dataOrMessage, message);
		}
	}

	info(data: ContainerLogContext, message: string): void;
	info(message: string): void;
	info(dataOrMessage: ContainerLogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.info(dataOrMessage);
		} else {
			this.pino.info(dataOrMessage, message);
		}
	}

	warn(data: ContainerLogContext, message: string): void;
	warn(message: string): void;
	warn(dataOrMessage: ContainerLogContext | string, message?: string) {
		if (typeof dataOrMessage === "string") {
			this.pino.warn(dataOrMessage);
		} else {
			this.pino.warn(dataOrMessage, message);
		}
	}
}
