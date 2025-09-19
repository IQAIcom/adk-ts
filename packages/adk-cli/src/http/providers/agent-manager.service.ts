import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "node:util";
import type { FullMessage, InMemorySessionService, Session } from "@iqai/adk";
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

	scanAgents(agentsDir: string): void {
		this.logger.log(format("Scanning agents in directory: %s", agentsDir));
		this.agents = this.scanner.scanAgents(agentsDir, this.loadedAgents);
		this.logger.log(format("Found agents: %o", Array.from(this.agents.keys())));
	}

	async startAgent(agentPath: string): Promise<void> {
		this.logger.log(format("Starting agent: %s", agentPath));

		const agent = this.validateAndGetAgent(agentPath);

		if (this.loadedAgents.has(agentPath)) {
			return; // Already running
		}

		try {
			const exportedAgent = await this.loadAgentModule(agent);
			const sessionToUse = await this.getOrCreateSession(
				agentPath,
				exportedAgent,
			);
			const runner = await this.createRunnerWithSession(
				exportedAgent,
				sessionToUse,
				agentPath,
			);
			await this.storeLoadedAgent(
				agentPath,
				exportedAgent,
				runner,
				sessionToUse,
				agent,
			);
		} catch (error) {
			const agentName = agent?.name ?? agentPath;
			this.logger.error(
				`Failed to load agent "${agentName}": ${error instanceof Error ? error.message : String(error)}`,
			);
			throw new Error(
				`Failed to load agent: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private validateAndGetAgent(agentPath: string): Agent {
		const agent = this.agents.get(agentPath);
		if (!agent) {
			this.logger.error("Agent not found in agents map: %s", agentPath);
			this.logger.debug(
				format("Available agents: %o", Array.from(this.agents.keys())),
			);
			throw new Error(`Agent not found: ${agentPath}`);
		}
		this.logger.log("Agent found, proceeding to load...");
		return agent;
	}

	private async loadAgentModule(agent: Agent): Promise<any> {
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

		// Use dynamic import to load the agent
		// For TS files, pass the project root to avoid redundant project root discovery
		const agentModule: Record<string, unknown> = agentFilePath.endsWith(".ts")
			? await this.loader.importTypeScriptFile(agentFilePath, agent.projectRoot)
			: ((await import(agentFileUrl)) as Record<string, unknown>);

		const exportedAgent = await this.loader.resolveAgentExport(agentModule);

		// Validate basic shape
		if (!exportedAgent?.name) {
			throw new Error(
				`Invalid agent export in ${agentFilePath}. Expected a BaseAgent instance with a name property.`,
			);
		}

		return exportedAgent;
	}

	private async getOrCreateSession(
		agentPath: string,
		exportedAgent: any,
	): Promise<Session> {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;

		// Try to find existing sessions for this agent/user combination
		const existingSessions = await this.sessionService.listSessions(
			appName,
			userId,
		);

		if (existingSessions.sessions.length > 0) {
			// Use the most recently updated session
			const mostRecentSession = existingSessions.sessions.reduce(
				(latest, current) =>
					current.lastUpdateTime > latest.lastUpdateTime ? current : latest,
			);
			this.logger.log(
				format("Reusing existing session: %o", {
					sessionId: mostRecentSession.id,
					hasState: !!mostRecentSession.state,
					stateKeys: mostRecentSession.state
						? Object.keys(mostRecentSession.state)
						: [],
					lastUpdateTime: mostRecentSession.lastUpdateTime,
					totalExistingSessions: existingSessions.sessions.length,
				}),
			);
			return mostRecentSession;
		}
		// No existing sessions found, create a new one
		this.logger.log("No existing sessions found, creating new session");
		const agentBuilder = AgentBuilder.create(exportedAgent.name).withAgent(
			exportedAgent,
		);
		agentBuilder.withSessionService(this.sessionService, {
			userId,
			appName,
			state: undefined,
		});
		const { session } = await agentBuilder.build();
		this.logger.log(
			format("New session created: %o", {
				sessionId: session.id,
				hasState: !!session.state,
				stateKeys: session.state ? Object.keys(session.state) : [],
				stateContent: session.state,
			}),
		);
		return session;
	}

	private async createRunnerWithSession(
		exportedAgent: any,
		sessionToUse: Session,
		agentPath: string,
	): Promise<any> {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;

		// Always create a fresh runner with the selected session
		const agentBuilder = AgentBuilder.create(exportedAgent.name).withAgent(
			exportedAgent,
		);
		agentBuilder.withSessionService(this.sessionService, {
			userId,
			appName,
			state: undefined,
			sessionId: sessionToUse.id, // Use the selected session ID
		});
		const { runner } = await agentBuilder.build();
		return runner;
	}

	private async storeLoadedAgent(
		agentPath: string,
		exportedAgent: any,
		runner: any,
		sessionToUse: Session,
		agent: Agent,
	): Promise<void> {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;

		// Store the loaded agent with its runner and the selected session
		const loadedAgent: LoadedAgent = {
			agent: exportedAgent,
			runner: runner,
			sessionId: sessionToUse.id,
			userId,
			appName,
		};
		this.loadedAgents.set(agentPath, loadedAgent);
		agent.instance = exportedAgent;
		agent.name = exportedAgent.name;

		// Ensure the session is stored in the session service
		try {
			const existingSession = await this.sessionService.getSession(
				loadedAgent.appName,
				loadedAgent.userId,
				sessionToUse.id,
			);
			if (!existingSession) {
				this.logger.log(
					format("Creating session in sessionService: %s", sessionToUse.id),
				);
				await this.sessionService.createSession(
					loadedAgent.appName,
					loadedAgent.userId,
					sessionToUse.state,
					sessionToUse.id,
				);
			} else {
				this.logger.log(
					format(
						"Session already exists in sessionService: %s",
						sessionToUse.id,
					),
				);
			}
		} catch (error) {
			this.logger.error("Error ensuring session exists: %o", error);
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
