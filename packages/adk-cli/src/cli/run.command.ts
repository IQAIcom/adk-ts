import chalk from "chalk";
import { Command, CommandRunner, Option } from "nest-commander";
import { startHttpServer } from "../http/bootstrap";
import { Logger } from "../utils/logger";

interface ServeLikeOptions {
	host?: string;
}

interface RunOptions extends ServeLikeOptions {
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

class AgentChatClient {
	private apiUrl: string;
	private selectedAgent: Agent | null = null;
	private logger: Logger;

	constructor(apiUrl: string, logger: Logger) {
		this.apiUrl = apiUrl;
		this.logger = logger;
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

		const selectedAgent = await this.logger.select<Agent>(
			"Choose an agent to chat with:",
			agents.map((agent) => ({
				label: agent.name,
				value: agent,
				hint: agent.relativePath,
			})),
		);

		return selectedAgent;
	}

	async sendMessage(message: string): Promise<void> {
		if (!this.selectedAgent) {
			throw new Error("No agent selected");
		}

		this.logger.startSpinner("🤖 Thinking...");

		try {
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
				this.logger.stopSpinner("❌ Failed to send message");
				throw new Error(`Failed to send message: ${errorText}`);
			}

			const result = (await response.json()) as {
				response?: string;
				agentName?: string;
			};
			this.logger.stopSpinner(`🤖 ${result.agentName ?? "Assistant"}:`);

			if (result.response) {
				this.logger.printAnswer(result.response);
			}
		} catch (_error) {
			this.logger.error("Failed to send message");
		}
	}

	async startChat(): Promise<void> {
		if (!this.selectedAgent) {
			throw new Error("Agent not selected");
		}

		// Add SIGINT handler for interactive chat mode
		const sigintHandler = () => {
			this.logger.outro("Chat ended");
			process.exit(0);
		};
		process.on("SIGINT", sigintHandler);

		try {
			while (true) {
				try {
					const input = await this.logger.prompt("💬 Message:", {
						placeholder:
							"Type your message here... (type 'exit' or 'quit' to end)",
					});

					const trimmed = (input || "").trim();

					// Check for explicit exit commands
					if (["exit", "quit"].includes(trimmed.toLowerCase())) {
						process.exit(0);
					}

					if (trimmed) {
						await this.sendMessage(trimmed);
					}
				} catch (error) {
					console.error(chalk.red("Error in chat:"), error);
					process.exit(1);
				}
			}
		} finally {
			// Clean up SIGINT handler
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

		const logger = new Logger({ verbose: isVerbose });
		logger.hookConsole();
		logger.hookChildProcessSilence();
		process.on("exit", () => logger.restoreConsole());

		if (options?.server) {
			// Server-only mode
			const apiPort = 8042;
			const host = options.host || "localhost";
			logger.info(chalk.blue("🚀 Starting ADK Server...") as unknown as string);

			const server = await startHttpServer({
				port: apiPort,
				host,
				agentsDir: process.cwd(),
				quiet: !isVerbose,
				hotReload: options?.hot,
				watchPaths: options?.watch,
			});

			logger.info(
				chalk.cyan("Press Ctrl+C to stop the server") as unknown as string,
			);
			process.on("SIGINT", async () => {
				console.log(chalk.yellow("\n🛑 Stopping server..."));
				await server.stop();
				process.exit(0);
			});

			await new Promise(() => {});
			return;
		}

		// Interactive chat mode (only Q/A should show unless verbose)
		const apiUrl = `http://${options?.host || "localhost"}:8042`;

		logger.intro("🤖 ADK Agent Chat");

		// Ensure server is up, else start it
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

		const client = new AgentChatClient(apiUrl, logger);

		await client.connect();

		try {
			const agents = await client.fetchAgents();

			let selectedAgent: Agent;
			if (agents.length === 0) {
				logger.error("No agents found in the current directory");
				process.exit(1);
			} else if (agents.length === 1 || agentPathArg) {
				selectedAgent =
					(agentPathArg &&
						agents.find((a) => a.relativePath === agentPathArg)) ||
					agents[0];
			} else {
				selectedAgent = await logger.select<Agent>(
					"Choose an agent to chat with:",
					agents.map((agent) => ({
						label: agent.name,
						value: agent,
						hint: agent.relativePath,
					})),
				);
			}

			client.setSelectedAgent(selectedAgent);
			await client.startChat();
			logger.outro("Chat ended");
		} catch (error) {
			logger.error(
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
