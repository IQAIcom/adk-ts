import * as p from "@clack/prompts";
import chalk from "chalk";
import { marked } from "marked";
import * as markedTerminal from "marked-terminal";

// Note: We use clack for prompts now; no readline usage here

const mt: any =
	(markedTerminal as any).markedTerminal ?? (markedTerminal as any);
marked.use(mt() as any);

type ConsoleMethods = Pick<
	Console,
	"log" | "info" | "warn" | "error" | "debug"
>;

export class Logger {
	private verbose: boolean;
	private originals: ConsoleMethods | null = null;
	private originalStdoutWrite: ((...args: any[]) => boolean) | null = null;
	private originalStderrWrite: ((...args: any[]) => boolean) | null = null;
	private originalSpawn: any | null = null;
	private spinnerTimer: ReturnType<typeof setInterval> | null = null;
	private spinnerText = "";
	private spinnerFrame = 0;
	private readonly frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

	constructor(opts?: { verbose?: boolean }) {
		this.verbose = !!opts?.verbose;
	}

	// Silence all console.* and low-level writes except our own output, unless verbose
	hookConsole(): void {
		if (this.verbose || this.originals) return;
		this.originals = {
			log: console.log,
			info: console.info,
			warn: console.warn,
			error: console.error,
			debug: console.debug,
		};
		this.originalStdoutWrite = process.stdout.write.bind(process.stdout) as any;
		this.originalStderrWrite = process.stderr.write.bind(process.stderr) as any;
		const noop = () => {};
		console.log = noop as any;
		console.info = noop as any;
		console.warn = noop as any;
		console.error = noop as any;
		console.debug = noop as any;
		// Mute all third-party writes to stdout/stderr
		process.stdout.write = ((..._args: any[]) =>
			true) as unknown as typeof process.stdout.write;
		process.stderr.write = ((..._args: any[]) =>
			true) as unknown as typeof process.stderr.write;
	}

	// Additionally, silence noisy child process stderr for known MCP-related processes
	hookChildProcessSilence(): void {
		if (this.verbose || this.originalSpawn) return;
		const cp =
			require("node:child_process") as typeof import("node:child_process");
		this.originalSpawn = cp.spawn;
		const shouldSilence = (
			command?: string,
			args?: ReadonlyArray<string>,
		): boolean => {
			const cmd = (command || "").toLowerCase();
			const joined = [
				cmd,
				...(args || []).map((a) => String(a).toLowerCase()),
			].join(" ");
			return (
				joined.includes("mcp-remote") ||
				joined.includes("@iqai/mcp") ||
				joined.includes("modelcontextprotocol") ||
				joined.includes("@modelcontextprotocol")
			);
		};
		cp.spawn = ((command: any, args?: any, options?: any) => {
			try {
				if (
					shouldSilence(command, Array.isArray(args) ? args : options?.args)
				) {
					const opts = (Array.isArray(args) ? options : args) || {};
					const stdio = opts.stdio;
					const newStdio = Array.isArray(stdio)
						? [stdio[0] ?? "pipe", stdio[1] ?? "pipe", "ignore"]
						: ["pipe", "pipe", "ignore"];
					const patched = { ...opts, stdio: newStdio };
					if (Array.isArray(args)) {
						return this.originalSpawn!(command, args, patched);
					}
					return this.originalSpawn!(command, patched);
				}
			} catch {
				// fall through
			}
			return this.originalSpawn!(command, args as any, options as any);
		}) as any;
	}

	restoreConsole(): void {
		if (!this.originals) return;
		console.log = this.originals.log;
		console.info = this.originals.info;
		console.warn = this.originals.warn;
		console.error = this.originals.error;
		console.debug = this.originals.debug;
		this.originals = null;
		if (this.originalStdoutWrite) {
			process.stdout.write = this.originalStdoutWrite as any;
		}
		if (this.originalStderrWrite) {
			process.stderr.write = this.originalStderrWrite as any;
		}
		if (this.originalSpawn) {
			const cp =
				require("node:child_process") as typeof import("node:child_process");
			cp.spawn = this.originalSpawn;
			this.originalSpawn = null;
		}
	}

	// Basic writers that bypass overridden console
	private writeOut(text: string) {
		if (this.originalStdoutWrite) {
			this.originalStdoutWrite(text);
		} else {
			process.stdout.write(text);
		}
	}
	private writeErr(text: string) {
		if (this.originalStderrWrite) {
			this.originalStderrWrite(text);
		} else {
			process.stderr.write(text);
		}
	}

	// Render markdown to ANSI suitable for terminal
	renderMarkdown(text: string): string {
		const input = text ?? "";
		const out = marked.parse(input);
		return typeof out === "string" ? out : String(out ?? "");
	}

	intro(text: string): void {
		if (!this.verbose) return;
		this.writeOut(chalk.cyan(text) + "\n");
	}
	outro(text: string): void {
		if (!this.verbose) return;
		this.writeOut(chalk.cyan(text) + "\n");
	}
	info(text: string): void {
		if (!this.verbose) return;
		this.writeOut(text + "\n");
	}
	error(text: string): void {
		this.writeErr(chalk.red(text) + "\n");
	}

	// Spinner shown even when not verbose (used as answering state)
	startSpinner(text: string): void {
		this.stopSpinner();
		this.spinnerText = text;
		this.spinnerFrame = 0;
		this.spinnerTimer = setInterval(() => {
			const frame = this.frames[this.spinnerFrame % this.frames.length];
			this.spinnerFrame++;
			this.writeOut("\r" + chalk.gray(`${frame} ${this.spinnerText}   `));
		}, 80);
	}
	stopSpinner(finalText?: string): void {
		if (this.spinnerTimer) {
			clearInterval(this.spinnerTimer);
			this.spinnerTimer = null;
			// clear line
			this.writeOut("\r\x1b[2K");
		}
		if (finalText) {
			this.writeOut(finalText + "\n");
		}
	}

	// Print a question (when needed) and an answer rendered from markdown
	printAnswer(markdown: string, header?: string): void {
		if (header) this.writeOut(chalk.bold(header) + "\n");
		const rendered = this.renderMarkdown(markdown);
		this.writeOut((rendered || "").trim() + "\n");
	}

	// Temporarily allow stdout/stderr writes (for UI libraries like clack)
	async withAllowedOutput<T>(fn: () => Promise<T> | T): Promise<T> {
		if (this.verbose) {
			return await fn();
		}
		// Save current (silenced) writers to restore after
		const _saveStdout = process.stdout.write;
		const _saveStderr = process.stderr.write;
		try {
			if (this.originalStdoutWrite) {
				process.stdout.write = this.originalStdoutWrite as any;
			}
			if (this.originalStderrWrite) {
				process.stderr.write = this.originalStderrWrite as any;
			}
			return await fn();
		} finally {
			// Re-silence writes
			process.stdout.write = _saveStdout;
			process.stderr.write = _saveStderr;
		}
	}

	// ===============
	// Clack wrappers
	// ===============

	// Prompt for free text via clack
	async prompt(
		message: string,
		opts?: { placeholder?: string; initialValue?: string },
	): Promise<string> {
		return await this.withAllowedOutput(async () => {
			const res = await p.text({
				message,
				placeholder: opts?.placeholder,
				initialValue: opts?.initialValue,
			});
			if (p.isCancel(res)) return "exit";
			return typeof res === "symbol" ? String(res) : (res ?? "");
		});
	}

	// Select from a list via clack
	async select<T>(
		message: string,
		options: Array<{ label: string; value: T; hint?: string }>,
	): Promise<T> {
		return await this.withAllowedOutput(async () => {
			const choice = await p.select({ message, options: options as any });
			if (p.isCancel(choice)) {
				process.exit(0);
			}
			return choice as T;
		});
	}
}
