import chalk from "chalk";

interface LoggerOpts {
	name: string;
	quiet?: boolean;
}

export class Logger {
	name: string;
	private quiet: boolean;
	private debugEnabled: boolean;

	constructor({ name, quiet = false }: LoggerOpts) {
		this.name = name;
		this.quiet = quiet;
		this.debugEnabled =
			process.env.NODE_ENV === "development" ||
			process.env.ADK_DEBUG === "true";
	}

	private time(): string {
		return new Date().toLocaleTimeString();
	}

	private colorize(message: string): string {
		return chalk.blue(message);
	}

	private prefix(icon: string, message: string): string {
		return `${this.time()} ${icon} [${this.name}] ${message}`;
	}

	debug(message: string, ...args: any[]) {
		if (!this.debugEnabled || this.quiet) return;
		console.debug(this.colorize(this.prefix("🐛", message)), ...args);
	}

	info(message: string, ...args: any[]) {
		if (this.quiet) return;
		console.info(this.colorize(this.prefix("ℹ️", message)), ...args);
	}

	warn(message: string, ...args: any[]) {
		if (this.quiet) return;
		console.warn(this.colorize(this.prefix("🚧", message)), ...args);
	}

	error(message: string, ...args: any[]) {
		if (this.quiet) return;
		console.error(this.colorize(this.prefix("❌", message)), ...args);
	}
}
