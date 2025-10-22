import * as p from "@clack/prompts";
import chalk from "chalk";
import { marked } from "marked";
import * as markedTerminal from "marked-terminal";
import { Command, CommandRunner, Option } from "nest-commander";
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
	private silencingActive = false;

	constructor(verbose: boolean) {
		this.verbose = verbose;
	}

	hookConsole(): void {
		if (this.verbose || this.originals) return;

		this.originals = {
			log: console.log,
			info: console.info,
			warn: console.warn,
			error: console.error,
			debug: console.debug,
		};
		this.originalStdoutWrite = process.stdout.write.bind(process.stdout);
		this.originalStderrWrite = process.stderr.write.bind(process.stderr);

		const noop = () => {};
		console.log = noop as any;
		console.info = noop as any;
		console.warn = noop as any;
		console.error = noop as any;
		console.debug = noop as any;

		// Smart stdout/stderr silencing - silence unless during withAllowedOutput
		const shouldSilence = () => !this.silencingActive;

		process.stdout.write = ((chunk: any, encoding?: any, callback?: any) => {
			if (shouldSilence()) return true;
			return this.originalStdoutWrite(chunk, encoding, callback);
		}) as any;

		process.stderr.write = ((chunk: any, encoding?: any, callback?: any) => {
			if (shouldSilence()) return true;
			return this.originalStderrWrite(chunk, encoding, callback);
		}) as any;
	}

	hookChildProcessSilence(): void {
		if (this.verbose || this.originalSpawn) return;

		const cp = require("node:child_process");
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
			return this.originalSpawn!(command, args, options);
		}) as any;
	}

	restore(): void {
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
		}
		if (this.originalStderrWrite) {
			process.stderr.write = this.originalStderrWrite;
		}
		if (this.originalSpawn) {
			const cp = require("node:child_process");
			cp.spawn = this.originalSpawn;
			this.originalSpawn = null;
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
		if (this.verbose) {
			return await fn();
		}

		const wasSilencing = this.silencingActive;
		this.silencingActive = true; // Allow output during this function

		try {
			return await fn();
		} finally {
			this.silencingActive = wasSilencing; // Restore previous state
		}
	}

	error(text: string): void {
		this.writeErr(chalk.red(text) + "\n");
	}

	renderMarkdown(text: string): string {
		const input = text ?? "";
		const out = marked.parse(input);
		return typeof out === "string" ? out : String(out ?? "");
	}

	printAnswer(markdown: string): void {
		const rendered = this.renderMarkdown(markdown);
		this.writeOut((rendered || "").trim() + "\n");
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

			// Save original methods
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

			// Filter stdout - allow spinner, block logs
			process.stdout.write = ((chunk: any, encoding?: any, callback?: any) => {
				if (isSpinnerOutput(chunk)) {
					return savedStdout.call(process.stdout, chunk, encoding, callback);
				}
				// Block everything else
				return true;
			}) as any;

			// Block all stderr
			process.stderr.write = (() => true) as any;

			// Block all console methods
			console.log = (() => {}) as any;
			console.info = (() => {}) as any;
			console.warn = (() => {}) as any;
			console.error = (() => {}) as any;

			try {
				const response = await fetch(
					`${this.apiUrl}/api/agents/${encodeURIComponent(this.selectedAgent!.relativePath)}/message`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ message }),
					},
				);

				if (!response.ok) {
					const errorText = await response.text();
					spinner.stop("❌ Failed to send message");
					throw new Error(`Failed to send message: ${errorText}`);
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
				this.consoleManager.error("Failed to send message");
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
					this.consoleManager.error(`Error in chat: ${error}`);
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
		const envVerbose = process.env.ADK_VERBOSE;
		const isVerbose =
			options?.verbose ?? (envVerbose === "1" || envVerbose === "true");

		const consoleManager = new ConsoleManager(isVerbose);
		consoleManager.hookConsole();
		consoleManager.hookChildProcessSilence();
		process.on("exit", () => consoleManager.restore());

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
			consoleManager.error(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			);
			process.exit(1);
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
