import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "node:util";
import type { FullMessage, InMemorySessionService } from "@iqai/adk";
import { AgentBuilder } from "@iqai/adk";
import { Injectable, Logger } from "@nestjs/common";
import type { Agent, LoadedAgent } from "../../common/types";
import { AgentLoader } from "./agent-loader.service";
import { AgentScanner } from "./agent-scanner.service";

const DEFAULT_APP_NAME = "adk-server";
const USER_ID_PREFIX = "user_";

@Injectable()
export class AgentManager {
	private agents = new Map<string, Agent>();
	private loadedAgents = new Map<string, LoadedAgent>();
	private scanner: AgentScanner;
	private loader: AgentLoader;
	private logger: Logger;

	constructor(
		private sessionService: InMemorySessionService,
		quiet = false,
	) {
		this.scanner = new AgentScanner(quiet);
		this.loader = new AgentLoader(quiet);
		this.logger = new Logger("agent-manager");
	}

	getAgents(): Map<string, Agent> {
		return this.agents;
	}

	getLoadedAgents(): Map<string, LoadedAgent> {
		return this.loadedAgents;
	}

	skanAgents?(agentsDir: string): void; // backward-compat typo guard (no-op if called)

	scanAgents(agentsDir: string): void {
		this.logger.log(format("Scanning agents in directory: %s", agentsDir));
		this.agents = this.scanner.scanAgents(agentsDir, this.loadedAgents);
		this.logger.log(format("Found agents: %o", Array.from(this.agents.keys())));
	}

	async startAgent(agentPath: string): Promise<void> {
		this.logger.log(format("Starting agent: %s", agentPath));
		const agent = this.agents.get(agentPath);
		if (!agent) {
			this.logger.error("Agent not found in agents map: %s", agentPath);
			this.logger.debug(
				format("Available agents: %o", Array.from(this.agents.keys())),
			);
			throw new Error(`Agent not found: ${agentPath}`);
		}
		this.logger.log("Agent found, proceeding to load...");

		if (this.loadedAgents.has(agentPath)) {
			return; // Already running
		}

		try {
			// Load the agent module dynamically
			// Try both .js and .ts files, prioritizing .js if it exists
			let agentFilePath = join(agent.absolutePath, "agent.js");
			if (!existsSync(agentFilePath)) {
				agentFilePath = join(agent.absolutePath, "agent.ts");
			}

			if (!existsSync(agentFilePath)) {
				throw new Error(
					`No agent.js or agent.ts file found in ${agent.absolutePath}`,
				);
			}

			// Load environment variables from the project directory before importing
			this.loader.loadEnvironmentVariables(agentFilePath);

			const agentFileUrl = pathToFileURL(agentFilePath).href;

			// Use dynamic import to load the agent (TS path uses esbuild wrapper returning { agent })
			const agentModule: Record<string, unknown> = agentFilePath.endsWith(".ts")
				? await this.loader.importTypeScriptFile(agentFilePath)
				: ((await import(agentFileUrl)) as Record<string, unknown>);

			const exportedAgent = await this.loader.resolveAgentExport(agentModule);

			// Validate basic shape
			if (!exportedAgent?.name) {
				throw new Error(
					`Invalid agent export in ${agentFilePath}. Expected a BaseAgent instance with a name property.`,
				);
			}
			// Soft validation of optional fields (model/instruction not strictly required for all custom agents)

			// Always use the session created by the agent builder; ignore any session from the exported agent.
			const agentBuilder = AgentBuilder.create(exportedAgent.name).withAgent(
				exportedAgent,
			);
			agentBuilder.withSessionService(this.sessionService, {
				userId: `${USER_ID_PREFIX}${agentPath}`,
				appName: DEFAULT_APP_NAME,
				state: undefined,
			});
			const { runner, session } = await agentBuilder.build();
			this.logger.log(
				format("Agent started with session: %o", {
					sessionId: session.id,
					hasState: !!session.state,
					stateKeys: session.state ? Object.keys(session.state) : [],
					stateContent: session.state,
				}),
			);
			// Store the loaded agent with its runner and the session from the builder only
			const loadedAgent: LoadedAgent = {
				agent: exportedAgent,
				runner: runner,
				sessionId: session.id,
				userId: `${USER_ID_PREFIX}${agentPath}`,
				appName: DEFAULT_APP_NAME,
			};
			this.loadedAgents.set(agentPath, loadedAgent);
			agent.instance = exportedAgent;
			agent.name = exportedAgent.name;
			// Ensure the session is stored in the session service
			try {
				const existingSession = await this.sessionService.getSession(
					loadedAgent.appName,
					loadedAgent.userId,
					session.id,
				);
				if (!existingSession) {
					this.logger.log(
						format("Creating session in sessionService: %s", session.id),
					);
					await this.sessionService.createSession(
						loadedAgent.appName,
						loadedAgent.userId,
						session.state,
						session.id,
					);
				} else {
					this.logger.log(
						format("Session already exists in sessionService: %s", session.id),
					);
				}
			} catch (error) {
				this.logger.error("Error ensuring session exists: %o", error);
			}
		} catch (error) {
			// agent might be undefined if lookup failed earlier
			const agentName = agent?.name ?? agentPath;
			this.logger.error(
				`Failed to load agent "${agentName}": ${error instanceof Error ? error.message : String(error)}`,
			);
			throw new Error(
				`Failed to load agent: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async stopAgent(agentPath: string): Promise<void> {
		// Deprecated: explicit stop not needed; keep method no-op for backward compatibility
		this.loadedAgents.delete(agentPath);
		const agent = this.agents.get(agentPath);
		if (agent) {
			agent.instance = undefined;
		}
	}

	async sendMessageToAgent(
		agentPath: string,
		message: string,
		attachments?: Array<{ name: string; mimeType: string; data: string }>,
	): Promise<string> {
		// Auto-start the agent if it's not already running
		if (!this.loadedAgents.has(agentPath)) {
			await this.startAgent(agentPath);
		}

		const loadedAgent = this.loadedAgents.get(agentPath);
		if (!loadedAgent) {
			throw new Error("Agent failed to start");
		}

		try {
			// Build FullMessage (text + optional attachments)
			const fullMessage: FullMessage = {
				parts: [
					{ text: message },
					...(attachments || []).map((file) => ({
						inlineData: { mimeType: file.mimeType, data: file.data },
					})),
				],
			};

			// Always run against the CURRENT loadedAgent.sessionId (switchable)
			let accumulated = "";
			for await (const event of loadedAgent.runner.runAsync({
				userId: loadedAgent.userId,
				sessionId: loadedAgent.sessionId,
				newMessage: fullMessage,
			})) {
				const parts = event?.content?.parts;
				if (Array.isArray(parts)) {
					accumulated += parts
						.map((p: any) =>
							p && typeof p === "object" && "text" in p ? p.text : "",
						)
						.join("");
				}
			}
			return accumulated.trim();
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.logger.error(
				`Error sending message to agent ${agentPath}: ${errorMessage}`,
			);
			throw new Error(`Failed to send message to agent: ${errorMessage}`);
		}
	}

	stopAllAgents(): void {
		for (const [agentPath] of Array.from(this.loadedAgents.entries())) {
			this.stopAgent(agentPath);
		}
	}
}
