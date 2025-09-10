import chalk from "chalk";

interface LoggerOpts {
	name: string;
}

interface LogMeta {
	suggestion?: string;
	context?: Record<string, any>;
}

interface LogLevel {
	icon: string;
	color: (txt: string) => string;
	method: typeof console.log;
}

const LOG_LEVELS: Record<string, LogLevel> = {
	debug: { icon: "🐛", color: chalk.blue, method: console.log },
	info: { icon: "ℹ️", color: chalk.cyan, method: console.debug },
	warn: { icon: "🚧", color: chalk.yellow, method: console.warn },
	error: { icon: "❌", color: chalk.red, method: console.error },
};

export class Logger {
	name: string;
	isDebugEnabled = isDebugEnabled();

	constructor({ name }: LoggerOpts) {
		this.name = name;
	}

	debug(message: string, ...args: any[]) {
		if (this.isDebugEnabled) {
			this.log("debug", message, ...args);
		}
	}

	info(message: string, ...args: any[]) {
		this.log("info", message, ...args);
	}

	warn(message: string, ...args: any[]) {
		this.log("warn", message, ...args);
	}

	error(message: string, ...args: any[]) {
		this.log("error", message, ...args);
	}

	private log(level: keyof typeof LOG_LEVELS, message: string, ...args: any[]) {
		const { icon, color, method } = LOG_LEVELS[level];
		const time = new Date().toLocaleTimeString();
		const isProd = process.env.NODE_ENV === "production";
		const forceBoxes = process.env.ADK_FORCE_BOXES === "true";

		const { meta, otherArgs } = this.extractMeta(args);
		const lines = this.formatArgs(otherArgs, level === "error");

		// Add meta info to lines
		if (meta.suggestion) lines.unshift(`• Suggestion: ${meta.suggestion}`);
		if (meta.context && Object.keys(meta.context).length) {
			const contextStr = Object.entries(meta.context)
				.map(([k, v]) => `${k}=${this.stringify(v)}`)
				.join("  ");
			lines.unshift(`• Context: ${contextStr}`);
		}

		if (isProd && !forceBoxes) {
			// Simple production format
			const header = `[${time}] ${icon} [${this.name}] ${message}`;
			const output = lines.length ? [header, ...lines].join("\n") : header;
			method(color(output));
			return;
		}

		// Boxed format for warn and error
		if (level === "warn" || level === "error") {
			const box = this.formatBox({
				title: `${icon} ${this.capitalize(level)} @ ${time} (${this.name})`,
				description: message,
				lines,
				color,
			});
			method(box);
		} else {
			// Simple format for info and debug
			const header = `[${time}] ${icon} [${this.name}] ${message}`;
			const output = lines.length ? [header, ...lines].join("\n") : header;
			method(color(output));
		}
	}

	private extractMeta(args: any[]): { meta: LogMeta; otherArgs: any[] } {
		const meta: LogMeta = {};
		const otherArgs: any[] = [];
		let metaFound = false;

		for (const arg of args) {
			if (!arg) continue;

			// Check for meta object (only take the first one)
			if (
				!metaFound &&
				typeof arg === "object" &&
				!(arg instanceof Error) &&
				("suggestion" in arg || "context" in arg)
			) {
				meta.suggestion = arg.suggestion;
				meta.context = arg.context;
				metaFound = true;
			} else {
				otherArgs.push(arg);
			}
		}

		return { meta, otherArgs };
	}

	private formatArgs(args: any[], includeStack = false): string[] {
		const lines: string[] = [];
		const maxFrames = Number(process.env.ADK_ERROR_STACK_FRAMES || 8);

		for (const arg of args) {
			if (!arg) continue;

			if (arg instanceof Error) {
				lines.push(`• ${arg.name}: ${arg.message}`);

				if (includeStack && arg.stack) {
					const frames = this.parseStackFrames(arg.stack, maxFrames);
					if (frames.length) {
						lines.push("• Stack:", ...frames);
					}
				}
			} else {
				lines.push(`• ${this.stringify(arg)}`);
			}
		}

		return lines;
	}

	private parseStackFrames(stack: string, maxFrames: number): string[] {
		const frames = stack
			.split(/\n/)
			.slice(1) // skip error message
			.map((f) => f.trim())
			.filter(Boolean)
			.slice(0, maxFrames);

		const result = frames.map((frame) => {
			const cleaned = frame.replace(/^at\s+/, "").replace(process.cwd(), ".");
			return `  ↳ ${cleaned}`;
		});

		const totalFrames = stack.split(/\n/).length - 1;
		if (totalFrames > maxFrames) {
			result.push(`  ↳ … ${totalFrames - maxFrames} more frames`);
		}

		return result;
	}

	private stringify(value: any): string {
		if (typeof value === "string") return value;
		if (typeof value === "number" || typeof value === "boolean")
			return String(value);
		if (value === null || value === undefined) return String(value);

		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	formatBox(params: {
		title: string;
		description: string;
		lines?: string[];
		width?: number;
		maxWidthPct?: number;
		color?: (txt: string) => string;
		pad?: number;
		borderChar?: string;
	}): string {
		const {
			title,
			description,
			lines = [],
			width = 60,
			maxWidthPct = 0.9,
			color = chalk.yellow,
			pad = 1,
			borderChar = "─",
		} = params;

		const isProd = process.env.NODE_ENV === "production";
		const forceBoxes = process.env.ADK_FORCE_BOXES === "true";

		// Simple format for production
		if (isProd && !forceBoxes) {
			return [`${title}: ${description}`, ...lines].join("\n");
		}

		// Calculate dimensions
		const termWidth = process.stdout.columns || 80;
		const maxWidth = Math.floor(termWidth * maxWidthPct);
		const contentWidth = Math.max(
			width,
			title.length + 2,
			description.length,
			...lines.map((l) => l.length),
		);
		const innerWidth = Math.min(contentWidth + pad * 2, maxWidth - 2);

		// Create box parts
		const horizontal = borderChar.repeat(innerWidth + 2);
		const top = `┌${horizontal}┐`;
		const separator = `├${horizontal}┤`;
		const bottom = `└${horizontal}┘`;

		const padLine = (text: string) => {
			const maxContent = innerWidth - pad * 2;
			const truncated =
				text.length > maxContent ? `${text.slice(0, maxContent - 1)}…` : text;
			const padded = " ".repeat(pad) + truncated;
			return padded + " ".repeat(innerWidth - padded.length);
		};

		// Assemble box
		const content = [
			top,
			`│ ${padLine(title)} │`,
			separator,
			`│ ${padLine(description)} │`,
			...lines.map((line) => `│ ${padLine(line)} │`),
			bottom,
		];

		return `\n${content.map((line) => color(line)).join("\n")}`;
	}

	/**
	 * Structured warning with code, suggestion, context.
	 */
	warnStructured(
		warning: {
			code: string;
			message: string;
			suggestion?: string;
			context?: Record<string, any>;
			severity?: "warn" | "info" | "error";
			timestamp?: string;
		},
		opts: { format?: "pretty" | "json" | "text"; verbose?: boolean } = {},
	): void {
		const format = (opts.format || process.env.ADK_WARN_FORMAT || "pretty") as
			| "pretty"
			| "json"
			| "text";
		const verbose =
			opts.verbose || process.env.ADK_AGENT_BUILDER_WARN === "verbose";
		const timestamp = warning.timestamp || new Date().toISOString();
		const severity = warning.severity || "warn";

		if (format === "json") {
			this.warn(
				JSON.stringify({
					level: severity,
					source: this.name,
					timestamp,
					...warning,
				}),
			);
			return;
		}

		const { icon } = LOG_LEVELS[severity] || LOG_LEVELS.warn;
		const base = `${icon} ${warning.code} ${warning.message}`;

		const parts = [base];
		if (warning.suggestion) {
			parts.push(`   • Suggestion: ${warning.suggestion}`);
		}
		if (verbose && warning.context && Object.keys(warning.context).length) {
			const contextStr = Object.entries(warning.context)
				.map(([k, v]) => `${k}=${this.stringify(v)}`)
				.join("  ");
			parts.push(`   • Context: ${contextStr}`);
		}

		if (format === "pretty") {
			this.warn(parts.join("\n"));
		} else {
			// text format
			const textParts = [`[${warning.code}] ${warning.message}`];
			if (warning.suggestion) textParts.push(`  -> ${warning.suggestion}`);
			if (verbose && warning.context && Object.keys(warning.context).length) {
				const contextStr = Object.entries(warning.context)
					.map(([k, v]) => `${k}=${this.stringify(v)}`)
					.join("  ");
				textParts.push(`   • Context: ${contextStr}`);
			}
			this.warn(textParts.join("\n"));
		}
	}

	debugStructured(title: string, data: Record<string, any>): void {
		if (!this.isDebugEnabled) return;

		const time = new Date().toLocaleTimeString();
		const lines = this.objectToLines(data);
		const box = this.formatBox({
			title: `🐛 Debug @ ${time} (${this.name})`,
			description: title,
			lines,
			color: chalk.blue,
		});
		console.log(box);
	}

	debugArray(title: string, items: Array<Record<string, any>>): void {
		if (!this.isDebugEnabled) return;

		const time = new Date().toLocaleTimeString();
		const lines = this.arrayToLines(items);
		const box = this.formatBox({
			title: `🐛 Debug List @ ${time} (${this.name})`,
			description: title,
			lines,
			color: chalk.blue,
			width: 78,
			maxWidthPct: 0.95,
		});
		console.log(box);
	}

	private objectToLines(obj: Record<string, any>): string[] {
		const entries = Object.entries(obj || {});
		if (!entries.length) return ["(empty)"];

		const keyWidth = Math.min(
			30,
			Math.max(6, ...entries.map(([k]) => k.length)),
		);

		return entries.slice(0, 200).map(([k, v]) => {
			const value = this.stringify(v);
			const truncated = value.length > 140 ? `${value.slice(0, 139)}…` : value;
			return `${k.padEnd(keyWidth)}: ${truncated}`;
		});
	}

	private arrayToLines(items: Array<Record<string, any>>): string[] {
		if (!items.length) return ["(empty list)"];

		const maxItems = 50;
		const lines = items.slice(0, maxItems).map((obj, i) => {
			const props = Object.entries(obj)
				.map(([k, v]) => {
					const value = this.stringify(v);
					const truncated =
						value.length > 160 ? `${value.slice(0, 159)}…` : value;
					return `${k}=${truncated}`;
				})
				.join("  •  ");
			return `[${i + 1}] ${props}`;
		});

		if (items.length > maxItems) {
			lines.push(`… ${items.length - maxItems} more items omitted`);
		}

		return lines;
	}
}

export function isDebugEnabled(): boolean {
	return (
		process.env.NODE_ENV === "development" || process.env.ADK_DEBUG === "true"
	);
}
