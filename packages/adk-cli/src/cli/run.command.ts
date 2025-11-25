import * as p from "@clack/prompts";
import chalk from "chalk";
import { marked } from "marked";
import * as markedTerminal from "marked-terminal";
import { Command, CommandRunner, Option } from "nest-commander";
import { envSchema } from "../common/schema";
import { startHttpServer } from "../http/bootstrap";

// Setup markdown terminal renderer
const mt: any =
	(markedTerminal as any).markedTerminal ?? (markedTerminal as any);
marked.use(mt() as any);

interface RunOptions {
	host?: string;
	server?: boolean;
	verbose?: boolean;
	hot?: boolean;
	watch?: string[];
}

interface Agent {
	relativePath: string;
	name: string;
	absolutePath: string;
}

// Console management for quiet mode
class ConsoleManager {
	private originals: any = null;
	private originalStdoutWrite: any = null;
	private originalStderrWrite: any = null;
	private originalSpawn: any = null;
	private verbose: boolean;
	private outputAllowed = false;
	private isDestroyed = false;

	constructor(verbose: boolean) {
		this.verbose = verbose;
		// Ensure cleanup on process exit
		process.on("exit", () => this.restore());
		process.on("SIGINT", () => this.restore());
		process.on("SIGTERM", () => this.restore());
	}

	hookConsole(): void {
		if (this.verbose || this.originals || this.isDestroyed) return;

		try {
			this.originals = {
				log: console.log,
				info: console.info,
				warn: console.warn,
				error: console.error,
				debug: console.debug,
			};
			this.originalStdoutWrite = process.stdout.write.bind(process.stdout);
			this.originalStderrWrite = process.stderr.write.bind(process.stderr);

			// Smart console method replacement - allow errors and warnings in verbose mode
			const shouldSilenceConsole = (level: string) => {
				if (this.outputAllowed) return false;
				// Always allow error and warn messages to prevent diagnostic issues
				return !["error", "warn"].includes(level);
			};

			const createConsoleFn = (
				level: string,
				original: (...args: any[]) => any,
			) => {
				return ((...args: any[]) => {
					if (!shouldSilenceConsole(level)) {
						original.apply(console, args);
					}
				}) as any;
			};

			console.log = createConsoleFn("log", this.originals.log);
			console.info = createConsoleFn("info", this.originals.info);
			console.warn = createConsoleFn("warn", this.originals.warn);
			console.error = createConsoleFn("error", this.originals.error);
			console.debug = createConsoleFn("debug", this.originals.debug);

			// Smart stdout silencing - allow certain output patterns
			const shouldSilenceStdout = (chunk: any) => {
				if (this.outputAllowed) return false;
				return !this.isImportantOutput(chunk);
			};

			process.stdout.write = ((chunk: any, encoding?: any, callback?: any) => {
				if (shouldSilenceStdout(chunk)) return true;
				return this.originalStdoutWrite(chunk, encoding, callback);
			}) as any;

			// Allow stderr for error messages but filter out non-critical output
			process.stderr.write = ((chunk: any, encoding?: any, callback?: any) => {
				if (this.outputAllowed) {
					return this.originalStderrWrite(chunk, encoding, callback);
				}
				// Allow error-like content through stderr
				const str = String(chunk).toLowerCase();
				if (
					str.includes("error") ||
					str.includes("warning") ||
					str.includes("failed")
				) {
					return this.originalStderrWrite(chunk, encoding, callback);
				}
				return true;
			}) as any;
		} catch (error) {
			// If console hooking fails, continue without it to avoid breaking the app
			if (this.verbose) {
				console.error("Failed to hook console:", error);
			}
		}
	}

	private isImportantOutput(chunk: any): boolean {
		const str = String(chunk);
		// Allow spinner characters and UI elements
		const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
		// Allow interactive prompts, errors, and control sequences
		return (
			spinnerChars.some((char) => str.includes(char)) ||
			str.includes("🤖") ||
			str.includes("Thinking") ||
			str.includes("\r") ||
			str.includes("\x1b") ||
			str.toLowerCase().includes("error") ||
			str.toLowerCase().includes("warning") ||
			str.includes("?") // Interactive prompts
		);
	}

	hookChildProcessSilence(): void {
		if (this.verbose || this.originalSpawn || this.isDestroyed) return;

		try {
			const cp = require("node:child_process");
			this.originalSpawn = cp.spawn;

			const shouldSilenceProcess = (
				command?: string,
				args?: ReadonlyArray<string>,
			): boolean => {
				if (!command) return false;

				const cmd = command.toLowerCase();
				const allArgs = (args || []).map((a) => String(a).toLowerCase());
				const fullCommand = [cmd, ...allArgs].join(" ");

				// Only silence specific known noisy processes
				const silencePatterns = [
					"mcp-remote",
					"@iqai/mcp",
					"modelcontextprotocol",
					"@modelcontextprotocol",
				];

				return silencePatterns.some((pattern) => fullCommand.includes(pattern));
			};

			cp.spawn = ((command: any, args?: any, options?: any) => {
				try {
					const shouldSilence = shouldSilenceProcess(
						command,
						Array.isArray(args) ? args : options?.args,
					);

					if (shouldSilence) {
						// Determine the correct options object
						const opts = Array.isArray(args) ? options || {} : args || {};

						// Create safer stdio configuration
						const currentStdio = opts.stdio;
						let newStdio: any;

						if (Array.isArray(currentStdio)) {
							newStdio = [
								currentStdio[0] || "pipe",
								"pipe", // stdout to pipe (can be handled)
								"pipe", // stderr to pipe (allow error monitoring)
							];
						} else if (typeof currentStdio === "string") {
							newStdio = ["pipe", "pipe", "pipe"];
						} else {
							newStdio = ["pipe", "pipe", "pipe"];
						}

						const patchedOpts = { ...opts, stdio: newStdio };

						if (Array.isArray(args)) {
							return this.originalSpawn!(command, args, patchedOpts);
						}
						return this.originalSpawn!(command, patchedOpts);
					}
				} catch (error) {
					// Log error and continue with original spawn to avoid breaking functionality
					if (this.verbose) {
						console.error("Error in child process hook:", error);
					}
				}

				return this.originalSpawn!(command, args, options);
			}) as any;
		} catch (error) {
			if (this.verbose) {
				console.error("Failed to hook child process:", error);
			}
		}
	}

	restore(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;

		try {
			if (this.originals) {
				console.log = this.originals.log;
				console.info = this.originals.info;
				console.warn = this.originals.warn;
				console.error = this.originals.error;
				console.debug = this.originals.debug;
				this.originals = null;
			}
			if (this.originalStdoutWrite) {
				process.stdout.write = this.originalStdoutWrite;
				this.originalStdoutWrite = null;
			}
			if (this.originalStderrWrite) {
				process.stderr.write = this.originalStderrWrite;
				this.originalStderrWrite = null;
			}
			if (this.originalSpawn) {
				const cp = require("node:child_process");
				cp.spawn = this.originalSpawn;
				this.originalSpawn = null;
			}
		} catch (error) {
			// Use original console.error if available, fallback to process.stderr
			if (this.originals?.error) {
				this.originals.error("Error during ConsoleManager restore:", error);
			} else {
				process.stderr.write(`Error during ConsoleManager restore: ${error}\n`);
			}
		}
	}

	private writeOut(text: string): void {
		if (this.originalStdoutWrite) {
			this.originalStdoutWrite(text);
		} else {
			process.stdout.write(text);
		}
	}

	private writeErr(text: string): void {
		if (this.originalStderrWrite) {
			this.originalStderrWrite(text);
		} else {
			process.stderr.write(text);
		}
	}

	async withAllowedOutput<T>(fn: () => Promise<T> | T): Promise<T> {
		if (this.verbose || this.isDestroyed) {
			return await fn();
		}

		const wasOutputAllowed = this.outputAllowed;
		this.outputAllowed = true; // Allow output during this function

		try {
			return await fn();
		} finally {
			this.outputAllowed = wasOutputAllowed; // Restore previous state
		}
	}

	error(text: string): void {
		this.writeErr(`${chalk.red(text)}\n`);
	}

	renderMarkdown(text: string): string {
		const input = text ?? "";
		const out = marked.parse(input);
		return typeof out === "string" ? out : String(out ?? "");
	}

	printAnswer(markdown: string): void {
		const rendered = this.renderMarkdown(markdown);
		this.writeOut(`${(rendered || "").trim()}\n`);
	}
}

class AgentChatClient {
	private apiUrl: string;
	private selectedAgent: Agent | null = null;
	private consoleManager: ConsoleManager;

	constructor(apiUrl: string, consoleManager: ConsoleManager) {
		this.apiUrl = apiUrl;
		this.consoleManager = consoleManager;
	}

	async connect(): Promise<void> {
		try {
			const response = await fetch(`${this.apiUrl}/health`).catch(() => null);
			if (!response || !response.ok) {
				throw new Error("Connection failed");
			}
		} catch {
			throw new Error("❌ Connection failed");
		}
	}

	async fetchAgents(): Promise<Agent[]> {
		try {
			const response = await fetch(`${this.apiUrl}/api/agents`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			const data = await response.json();
			if (Array.isArray(data)) return data as Agent[];
			if (data && Array.isArray(data.agents)) return data.agents as Agent[];
			throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
		} catch (error) {
			throw new Error(
				`Failed to fetch agents: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async selectAgent(): Promise<Agent> {
		const agents = await this.fetchAgents();

		if (agents.length === 0) {
			throw new Error("No agents found in the current directory");
		}

		if (agents.length === 1) {
			return agents[0];
		}

		return await this.consoleManager.withAllowedOutput(async () => {
			const choice = await p.select({
				message: "Choose an agent to chat with:",
				options: agents.map((agent) => ({
					label: agent.name,
					value: agent,
					hint: agent.relativePath,
				})) as any,
			});
			if (p.isCancel(choice)) {
				process.exit(0);
			}
			return choice as Agent;
		});
	}

	async sendMessage(message: string): Promise<void> {
		if (!this.selectedAgent) {
			throw new Error("No agent selected");
		}

		await this.consoleManager.withAllowedOutput(async () => {
			const spinner = p.spinner();
			spinner.start("🤖 Thinking...");

			// Save original methods for targeted silencing during the request
			const savedStdout = process.stdout.write;
			const savedStderr = process.stderr.write;
			const savedConsoleLog = console.log;
			const savedConsoleInfo = console.info;
			const savedConsoleWarn = console.warn;
			const savedConsoleError = console.error;

			// Intelligent stdout filtering - allow spinner chars but block log messages
			const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
			const isSpinnerOutput = (chunk: any): boolean => {
				const str = String(chunk);
				return (
					spinnerChars.some((char) => str.includes(char)) ||
					str.includes("🤖 Thinking") ||
					str.includes("\r") || // carriage returns for spinner updates
					str.includes("\x1b")
				); // ANSI escape codes for colors/positioning
			};

			// Temporarily override output during the fetch
			process.stdout.write = ((chunk: any, encoding?: any, callback?: any) => {
				if (isSpinnerOutput(chunk)) {
					return savedStdout.call(process.stdout, chunk, encoding, callback);
				}
				return true; // Block everything else
			}) as any;

			process.stderr.write = (() => true) as any; // Block all stderr
			console.log = (() => {}) as any;
			console.info = (() => {}) as any;
			console.warn = (() => {}) as any;
			console.error = (() => {}) as any;

			try {
				if (!this.selectedAgent?.relativePath) {
					throw new Error("No agent selected or agent path not available");
				}

				const response = await fetch(
					`${this.apiUrl}/api/agents/${encodeURIComponent(this.selectedAgent.relativePath)}/message`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ message }),
					},
				);

				if (!response.ok) {
					const errorText = await response.text();
					spinner.stop("❌ Failed to send message");
					throw new Error(`HTTP ${response.status}: ${errorText}`);
				}

				const result = (await response.json()) as {
					response?: string;
					agentName?: string;
				};

				spinner.stop(`🤖 ${result.agentName ?? "Assistant"}:`);

				if (result.response) {
					this.consoleManager.printAnswer(result.response);
				}
			} catch (error) {
				spinner.stop("❌ Error");
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				this.consoleManager.error(`Failed to send message: ${errorMessage}`);
				throw error;
			} finally {
				// Restore all methods
				process.stdout.write = savedStdout;
				process.stderr.write = savedStderr;
				console.log = savedConsoleLog;
				console.info = savedConsoleInfo;
				console.warn = savedConsoleWarn;
				console.error = savedConsoleError;
			}
		});
	}

	async startChat(): Promise<void> {
		if (!this.selectedAgent) {
			throw new Error("Agent not selected");
		}

		const sigintHandler = () => {
			this.consoleManager.withAllowedOutput(async () => {
				p.outro("Chat ended");
			});
			process.exit(0);
		};
		process.on("SIGINT", sigintHandler);

		try {
			while (true) {
				try {
					const input = await this.consoleManager.withAllowedOutput(
						async () => {
							const res = await p.text({
								message: "💬 Message:",
								placeholder:
									"Type your message here... (type 'exit' or 'quit' to end)",
							});
							if (p.isCancel(res)) return "exit";
							return typeof res === "symbol" ? String(res) : (res ?? "");
						},
					);

					const trimmed = (input || "").trim();

					if (["exit", "quit"].includes(trimmed.toLowerCase())) {
						process.exit(0);
					}

					if (trimmed) {
						await this.sendMessage(trimmed);
					}
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					this.consoleManager.error(`Error in chat: ${errorMessage}`);
					process.exit(1);
				}
			}
		} finally {
			process.removeListener("SIGINT", sigintHandler);
		}
	}

	setSelectedAgent(agent: Agent): void {
		this.selectedAgent = agent;
	}
}

@Command({
	name: "run",
	description: "Start an interactive chat with an agent",
	arguments: "[agent-path]",
})
export class RunCommand extends CommandRunner {
	async run(passed: string[], options?: RunOptions): Promise<void> {
		const agentPathArg = passed?.[0];
		const env = envSchema.parse(process.env);
		const isVerbose = options?.verbose ?? env.ADK_VERBOSE;

		const consoleManager = new ConsoleManager(isVerbose);
		// Hook console and child process only in non-verbose mode
		if (!isVerbose) {
			consoleManager.hookConsole();
			consoleManager.hookChildProcessSilence();
		}

		if (options?.server) {
			const apiPort = 8042;
			const host = options.host || "localhost";

			if (isVerbose) {
				console.log(chalk.blue("🚀 Starting ADK Server..."));
			}

			const server = await startHttpServer({
				port: apiPort,
				host,
				agentsDir: process.cwd(),
				quiet: !isVerbose,
				hotReload: options?.hot,
				watchPaths: options?.watch,
			});

			if (isVerbose) {
				console.log(chalk.cyan("Press Ctrl+C to stop the server"));
			}

			process.on("SIGINT", async () => {
				console.log(chalk.yellow("\n🛑 Stopping server..."));
				await server.stop();
				process.exit(0);
			});

			await new Promise(() => {});
			return;
		}

		// Interactive chat mode
		const apiUrl = `http://${options?.host || "localhost"}:8042`;

		await consoleManager.withAllowedOutput(async () => {
			p.intro("🤖 ADK Agent Chat");
		});

		// Start server if not running
		const healthResponse = await fetch(`${apiUrl}/health`).catch(() => null);
		if (!healthResponse || !healthResponse.ok) {
			await startHttpServer({
				port: 8042,
				host: options?.host || "localhost",
				agentsDir: process.cwd(),
				quiet: !isVerbose,
				hotReload: options?.hot,
				watchPaths: options?.watch,
			});
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		const client = new AgentChatClient(apiUrl, consoleManager);

		try {
			await client.connect();
			const agents = await client.fetchAgents();

			let selectedAgent: Agent;
			if (agents.length === 0) {
				consoleManager.error("No agents found in the current directory");
				process.exit(1);
			} else if (agents.length === 1 || agentPathArg) {
				selectedAgent =
					(agentPathArg &&
						agents.find((a) => a.relativePath === agentPathArg)) ||
					agents[0];
			} else {
				selectedAgent = await consoleManager.withAllowedOutput(async () => {
					const choice = await p.select({
						message: "Choose an agent to chat with:",
						options: agents.map((agent) => ({
							label: agent.name,
							value: agent,
							hint: agent.relativePath,
						})) as any,
					});
					if (p.isCancel(choice)) {
						process.exit(0);
					}
					return choice as Agent;
				});
			}

			client.setSelectedAgent(selectedAgent);
			await client.startChat();

			await consoleManager.withAllowedOutput(async () => {
				p.outro("Chat ended");
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			consoleManager.error(`Error: ${errorMessage}`);
			process.exit(1);
		} finally {
			// Ensure cleanup happens
			consoleManager.restore();
		}
	}

	@Option({
		flags: "-s, --server",
		description: "Start ADK server only (without chat interface)",
	})
	parseServer(): boolean {
		return true;
	}

	@Option({
		flags: "-h, --host <host>",
		description: "Host for server (when using --server) or API URL target",
	})
	parseHost(val: string): string {
		return val;
	}

	@Option({
		flags: "--verbose",
		description: "Enable verbose logs",
	})
	parseVerbose(): boolean {
		return true;
	}

	@Option({
		flags: "--hot",
		description: "Enable hot reloading (watches agents and optional paths)",
	})
	parseHot(): boolean {
		return true;
	}

	@Option({
		flags: "--watch <paths>",
		description:
			"Comma-separated list of additional paths to watch for reloads",
	})
	parseWatch(val: string): string[] {
		return (val || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	}
}
