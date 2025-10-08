import * as p from "@clack/prompts";
import { spinner } from "@clack/prompts";
import chalk from "chalk";
import { marked } from "marked";
import * as markedTerminal from "marked-terminal";
import { Command, CommandRunner, Option } from "nest-commander";
import { startHttpServer } from "../http/bootstrap";

const mt: any =
	(markedTerminal as any).markedTerminal ?? (markedTerminal as any);
marked.use(mt() as any);

/**
 * Render markdown to ANSI for terminal using 'marked' + 'marked-terminal'.
 * Simple static import and configuration as per package docs.
 */
async function render(text: string): Promise<string> {
	const input = text ?? "";
	const out = marked.parse(input);
	return typeof out === "string" ? out : String(out ?? "");
}

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

	constructor(apiUrl: string) {
		this.apiUrl = apiUrl;
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

		const selectedAgent = await p.select({
			message: "Choose an agent to chat with:",
			options: agents.map((agent) => ({
				label: agent.name,
				value: agent,
				hint: agent.relativePath,
			})),
		});

		if (p.isCancel(selectedAgent)) {
			p.cancel("Operation cancelled");
			process.exit(0);
		}

		return selectedAgent;
	}

	async sendMessage(message: string): Promise<void> {
		if (!this.selectedAgent) {
			throw new Error("No agent selected");
		}

		const s = spinner();
		s.start("🤖 Thinking...");

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
				s.stop("❌ Failed to send message");
				throw new Error(`Failed to send message: ${errorText}`);
			}

			const result = (await response.json()) as {
				response?: string;
				agentName?: string;
			};
			s.stop(`🤖 ${result.agentName ?? "Assistant"}:`);

			if (result.response) {
				const formattedResponse = await render(result.response);
				p.log.message((formattedResponse || "").trim());
			}
		} catch (_error) {
			p.log.error("Failed to send message");
		}
	}

	async startChat(): Promise<void> {
		if (!this.selectedAgent) {
			throw new Error("Agent not selected");
		}

		// Add SIGINT handler for interactive chat mode
		const sigintHandler = () => {
			p.cancel("Chat ended");
			process.exit(0);
		};
		process.on("SIGINT", sigintHandler);

		try {
			while (true) {
				try {
					const message = await p.text({
						message: "💬 Message:",
						placeholder:
							"Type your message here... (type 'exit' or 'quit' to end)",
					});

					if (p.isCancel(message)) {
						sigintHandler();
					}

					const trimmed =
						typeof message === "symbol"
							? String(message)
							: (message || "").trim();

					// Check for explicit exit commands
					if (["exit", "quit"].includes(trimmed.toLowerCase())) {
						p.outro("Chat ended");
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

		if (options?.server) {
			// Server-only mode
			const apiPort = 8042;
			const host = options.host || "localhost";
			console.log(chalk.blue("🚀 Starting ADK Server..."));

			const server = await startHttpServer({
				port: apiPort,
				host,
				agentsDir: process.cwd(),
				quiet: !isVerbose,
				hotReload: options?.hot,
				watchPaths: options?.watch,
			});

			console.log(chalk.cyan("Press Ctrl+C to stop the server"));
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
		p.intro("🤖 ADK Agent Chat");

		// Ensure server is up, else start it
		const healthResponse = await fetch(`${apiUrl}/health`).catch(() => null);
		if (!healthResponse || !healthResponse.ok) {
			const serverSpinner = spinner();
			serverSpinner.start("🚀 Starting server...");

			await startHttpServer({
				port: 8042,
				host: options?.host || "localhost",
				agentsDir: process.cwd(),
				quiet: !isVerbose,
				hotReload: options?.hot,
				watchPaths: options?.watch,
			});

			await new Promise((resolve) => setTimeout(resolve, 1000));
			serverSpinner.stop("✅ Server ready");
		}

		const client = new AgentChatClient(apiUrl);

		await client.connect();

		const agentSpinner = spinner();
		agentSpinner.start("🔍 Scanning for agents...");
		try {
			const agents = await client.fetchAgents();

			let selectedAgent: Agent;
			if (agents.length === 0) {
				agentSpinner.stop("❌ No agents found");
				p.cancel("No agents found in the current directory");
				process.exit(1);
			} else if (agents.length === 1 || agentPathArg) {
				selectedAgent =
					(agentPathArg &&
						agents.find((a) => a.relativePath === agentPathArg)) ||
					agents[0];
				agentSpinner.stop(`🤖 Selected agent: ${selectedAgent.name}`);
			} else {
				agentSpinner.stop(`🤖 Found ${agents.length} agents`);
				const choice = await p.select({
					message: "Choose an agent to chat with:",
					options: agents.map((agent) => ({
						label: agent.name,
						value: agent,
						hint: agent.relativePath,
					})),
				});

				if (p.isCancel(choice)) {
					p.cancel("Operation cancelled");
					process.exit(0);
				}
				selectedAgent = choice as Agent;
			}

			client.setSelectedAgent(selectedAgent);
			await client.startChat();
			p.outro("Chat ended");
		} catch (error) {
			p.cancel(
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
