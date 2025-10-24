import { existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "node:util";
import {
	AgentBuilder,
	Event,
	FullMessage,
	InMemorySessionService,
	Session,
	State,
} from "@iqai/adk";
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
			// Load agent module safely without stack traces on failure
			let exportedAgent: any;
			try {
				exportedAgent = await this.loadAgentModule(agent);
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				this.logger.error(`❌ Failed to import agent: ${msg}`);
				throw new Error(msg);
			}

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
			const message = error instanceof Error ? error.message : String(error);

			// log without stack
			this.logger.error(`Failed to load agent "${agentName}": ${message}`);

			// rethrow without stack
			const cleanError = new Error(`Failed to load agent: ${message}`);
			cleanError.stack = undefined;
			throw cleanError;
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
		let agentFilePath = normalize(join(agent.absolutePath, "agent.js"));
		if (!existsSync(agentFilePath)) {
			agentFilePath = normalize(join(agent.absolutePath, "agent.ts"));
		}
		if (!existsSync(agentFilePath)) {
			throw new Error(
				`No agent.js or agent.ts file found in ${agent.absolutePath}`,
			);
		}

		this.loader.loadEnvironmentVariables(agentFilePath);
		const agentFileUrl = pathToFileURL(agentFilePath).href;

		try {
			const agentModule: Record<string, unknown> = agentFilePath.endsWith(".ts")
				? await this.loader.importTypeScriptFile(
						agentFilePath,
						agent.projectRoot,
					)
				: ((await import(agentFileUrl)) as Record<string, unknown>);

			const exportedAgent = await this.loader.resolveAgentExport(agentModule);

			if (!exportedAgent?.agent.name) {
				throw new Error(
					`Invalid agent export in ${agentFilePath}. Expected a BaseAgent instance with a name property.`,
				);
			}

			return exportedAgent;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			throw new Error(msg);
		}
	}

	private async getOrCreateSession(
		agentPath: string,
		exportedAgent: any,
	): Promise<Session> {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;

		const existingSessions = await this.sessionService.listSessions(
			appName,
			userId,
		);

		if (existingSessions.sessions.length > 0) {
			const mostRecentSession = existingSessions.sessions.reduce(
				(latest, current) =>
					current.lastUpdateTime > latest.lastUpdateTime ? current : latest,
			);

			// Check if the session has state, if not, initialize it
			if (
				!mostRecentSession.state ||
				Object.keys(mostRecentSession.state).length === 0
			) {
				this.logger.log(
					"Existing session has no state, will initialize with default state",
				);

				// Get the default/initial state from the agent if available
				const initialState = this.getInitialStateForAgent(exportedAgent);

				if (initialState) {
					const stateUpdateEvent = new Event({
						author: "system",
						actions: {
							stateDelta: initialState,
							artifactDelta: {},
						},
						content: {
							parts: [
								{
									text: "Initialized session with default state from agent definition.",
								},
							],
						},
					});

					// This updates both the session in storage and the local `mostRecentSession` object.
					await this.sessionService.appendEvent(
						mostRecentSession,
						stateUpdateEvent,
					);
					this.logger.log(
						format("Updated session with initial state: %o", {
							sessionId: mostRecentSession.id,
							stateKeys: Object.keys(initialState),
						}),
					);
				}
			}

			this.logger.log(
				format("Reusing existing session: %o", {
					sessionId: mostRecentSession.id,
					hasState: !!mostRecentSession.state,
					stateKeys: mostRecentSession.state
						? Object.keys(mostRecentSession.state)
						: [],
					lastUpdateTime: mostRecentSession.lastUpdateTime,
				}),
			);
			return mostRecentSession;
		}

		this.logger.log("No existing sessions found, creating new session");

		// Get initial state
		const initialState = this.getInitialStateForAgent(exportedAgent);

		const agentBuilder = AgentBuilder.create(exportedAgent.name).withAgent(
			exportedAgent,
		);
		agentBuilder.withSessionService(this.sessionService, {
			userId,
			appName,
			state: initialState,
		});
		const { session } = await agentBuilder.build();

		this.logger.log(
			format("New session created: %o", {
				sessionId: session.id,
				hasState: !!session.state,
				stateKeys: session.state ? Object.keys(session.state) : [],
			}),
		);

		return session;
	}

	/**
	 * Extract initial state from the agent definition
	 * This allows agents to define their default state
	 */
	private getInitialStateForAgent(exportedAgent: any) {
		const sessions = exportedAgent?.sessionService?.sessions;
		if (!sessions) return undefined;

		for (const [, userSessions] of sessions) {
			for (const [, session] of userSessions) {
				// session itself is a Map of actual session objects
				for (const [, innerSession] of session) {
					const state = innerSession?.state;
					if (!state) continue;

					const stateKeys =
						state instanceof Map
							? Array.from(state.keys())
							: Object.keys(state);

					if (
						(state instanceof Map && state.size > 0) ||
						(typeof state === "object" && stateKeys.length > 0)
					) {
						return state as State;
					}
				}
			}
		}
		return undefined;
	}

	private async createRunnerWithSession(
		exportedAgent: any,
		sessionToUse: Session,
		agentPath: string,
	): Promise<any> {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;

		const agentBuilder = AgentBuilder.create(exportedAgent.name).withAgent(
			exportedAgent,
		);

		agentBuilder.withSessionService(this.sessionService, {
			userId,
			appName,
			state: sessionToUse.state,
			sessionId: sessionToUse.id,
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

		const loadedAgent: LoadedAgent = {
			agent: exportedAgent,
			runner,
			sessionId: sessionToUse.id,
			userId,
			appName,
		};

		this.loadedAgents.set(agentPath, loadedAgent);
		agent.instance = exportedAgent;
		agent.name = exportedAgent.name;

		try {
			const existingSession = await this.sessionService.getSession(
				appName,
				userId,
				sessionToUse.id,
			);

			if (!existingSession) {
				this.logger.log(
					format("Creating session in sessionService: %s", sessionToUse.id),
				);
				await this.sessionService.createSession(
					appName,
					userId,
					sessionToUse.state,
					sessionToUse.id,
				);
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			this.logger.error(`Error ensuring session exists: ${msg}`);
		}
	}

	async stopAgent(agentPath: string): Promise<void> {
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
		if (!this.loadedAgents.has(agentPath)) {
			await this.startAgent(agentPath);
		}

		const loadedAgent = this.loadedAgents.get(agentPath);
		if (!loadedAgent) {
			throw new Error("Agent failed to start");
		}

		try {
			const fullMessage: FullMessage = {
				parts: [
					{ text: message },
					...(attachments || []).map((file) => ({
						inlineData: { mimeType: file.mimeType, data: file.data },
					})),
				],
			};

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
			const msg = error instanceof Error ? error.message : String(error);
			this.logger.error(`Error sending message to agent ${agentPath}: ${msg}`);
			throw new Error(`Failed to send message to agent: ${msg}`);
		}
	}

	stopAllAgents(): void {
		for (const [agentPath] of Array.from(this.loadedAgents.entries())) {
			this.stopAgent(agentPath);
		}
	}
}
