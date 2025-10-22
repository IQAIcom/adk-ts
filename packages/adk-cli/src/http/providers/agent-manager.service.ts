import { existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "node:util";
import type { BaseAgent, BuiltAgent, EnhancedRunner } from "@iqai/adk";
import {
	AgentBuilder,
	FullMessage,
	InMemorySessionService,
	Session,
} from "@iqai/adk";
import { Injectable, Logger } from "@nestjs/common";
import type { Agent, LoadedAgent } from "../../common/types";
import type { ModuleExport } from "./agent-loader.types";
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
			const agentResult = await this.loadAgentModule(agent);
			const sessionToUse = await this.getOrCreateSession(
				agentPath,
				agentResult,
			);
			const runner = await this.createRunnerWithSession(
				agentResult.agent,
				sessionToUse,
				agentPath,
			);
			await this.storeLoadedAgent(
				agentPath,
				agentResult,
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

	private async loadAgentModule(
		agent: Agent,
	): Promise<{ agent: BaseAgent; builtAgent?: BuiltAgent }> {
		// Try both .js and .ts files, prioritizing .js if it exists
		// Normalize paths for cross-platform compatibility
		let agentFilePath = normalize(join(agent.absolutePath, "agent.js"));
		if (!existsSync(agentFilePath)) {
			agentFilePath = normalize(join(agent.absolutePath, "agent.ts"));
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
		const agentModule: ModuleExport = agentFilePath.endsWith(".ts")
			? await this.loader.importTypeScriptFile(agentFilePath, agent.projectRoot)
			: ((await import(agentFileUrl)) as ModuleExport);

		const agentResult = await this.loader.resolveAgentExport(
			agentModule as ModuleExport,
		);

		// Validate basic shape
		if (!agentResult?.agent?.name) {
			throw new Error(
				`Invalid agent export in ${agentFilePath}. Expected a BaseAgent instance with a name property.`,
			);
		}

		// Return the full result (agent + builtAgent if available)
		return agentResult;
	}

	private async getOrCreateSession(
		agentPath: string,
		agentResult: { agent: BaseAgent; builtAgent?: BuiltAgent },
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

			// Check if session has state, if not, initialize it with initial state
			const hasState =
				mostRecentSession.state &&
				Object.keys(mostRecentSession.state).length > 0;

			if (!hasState) {
				const initialState = this.extractInitialState(agentResult);
				if (initialState) {
					this.logger.log(
						format(
							"Existing session has no state, initializing with agent's initial state: %o",
							Object.keys(initialState),
						),
					);
					// Update the existing session with initial state
					await this.sessionService.createSession(
						appName,
						userId,
						initialState,
						mostRecentSession.id, // Use same session ID to update
					);
					// Update the session object
					mostRecentSession.state = initialState;
				}
			}

			// Session exists and will be reused with its current state

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

		// Extract initial state from the agent if it has any
		const initialState = this.extractInitialState(agentResult);

		// Create a fresh session directly in the CLI's session service with initial state
		const session = await this.sessionService.createSession(
			appName,
			userId,
			initialState,
		);

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
		baseAgent: BaseAgent,
		sessionToUse: Session,
		agentPath: string,
	): Promise<EnhancedRunner> {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;

		// Always create a fresh runner with the selected session
		const agentBuilder = AgentBuilder.create(baseAgent.name).withAgent(
			baseAgent,
		);

		agentBuilder.withSessionService(this.sessionService, {
			userId,
			appName,
			sessionId: sessionToUse.id, // Use the selected session ID
			state: sessionToUse.state,
		});

		const { runner } = await agentBuilder.build();
		return runner;
	}

	private async storeLoadedAgent(
		agentPath: string,
		agentResult: { agent: BaseAgent; builtAgent?: BuiltAgent },
		runner: EnhancedRunner,
		sessionToUse: Session,
		agent: Agent,
	): Promise<void> {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;

		// Store the loaded agent with its runner and the selected session
		const loadedAgent: LoadedAgent = {
			agent: agentResult.agent,
			runner: runner,
			sessionId: sessionToUse.id,
			userId,
			appName,
		};
		this.loadedAgents.set(agentPath, loadedAgent);
		agent.instance = agentResult.agent;
		agent.name = agentResult.agent.name;
		// Store the builtAgent for state extraction
		(agent as unknown as { builtAgent?: BuiltAgent }).builtAgent =
			agentResult.builtAgent;

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
				const parts = (event?.content?.parts || []) as Array<
					{ text?: string } | unknown
				>;
				accumulated += parts
					.map((p: unknown) =>
						p && typeof p === "object" && "text" in p
							? (p as { text: string }).text
							: "",
					)
					.join("");
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

	/**
	 * Get initial state for an agent path
	 * Public method that can be called by other services
	 */
	getInitialStateForAgent(
		agentPath: string,
	): Record<string, unknown> | undefined {
		const agent = this.agents.get(agentPath);
		if (!agent) {
			return undefined;
		}
		// Use the builtAgent if available, otherwise use the agent instance
		const builtAgent = (agent as unknown as { builtAgent?: BuiltAgent })
			.builtAgent;
		if (!agent.instance) {
			return undefined;
		}
		const agentResult = {
			agent: agent.instance,
			builtAgent: builtAgent,
		};
		return this.extractInitialState(agentResult);
	}

	/**
	 * Extract initial state from an agent instance by checking its sessionService
	 * This extracts the state that was defined when the agent was built with withSessionService
	 */
	private extractInitialState(agentResult: {
		agent: BaseAgent;
		builtAgent?: BuiltAgent;
	}): Record<string, unknown> | undefined {
		// First try to extract from the builtAgent's session if available
		if (agentResult.builtAgent?.session) {
			const state = agentResult.builtAgent.session.state;

			if (state) {
				const stateKeys = Object.keys(state);
				if (stateKeys.length > 0) {
					return state;
				}
			}
		}

		type AgentWithSessionService = {
			sessionService?: {
				sessions?: Map<
					string,
					Map<string, Map<string, Session & { state?: unknown }>>
				>;
			};
		};
		const state = this.getInitialStateFromSessionService(
			agentResult.agent as unknown as AgentWithSessionService,
		);
		if (state) {
			return state;
		}

		const agent = agentResult.agent as unknown as { subAgents?: BaseAgent[] };
		if (agent.subAgents && Array.isArray(agent.subAgents)) {
			for (const subAgent of agent.subAgents) {
				const subState = this.getInitialStateFromSessionService(
					subAgent as AgentWithSessionService,
				);
				if (subState) {
					this.logger.log(
						format(
							"✅ Extracted state from sub-agent: %o",
							Object.keys(subState),
						),
					);
					return subState;
				}
			}
		}

		return undefined;
	}

	/**
	 * Extract state from an agent's sessionService
	 */
	private getInitialStateFromSessionService(
		agent:
			| {
					sessionService?: {
						sessions?: Map<
							string,
							Map<string, Map<string, Session & { state?: unknown }>>
						>;
					};
			  }
			| undefined,
	): Record<string, unknown> | undefined {
		const sessions = agent?.sessionService?.sessions;
		if (!sessions) return undefined;

		// sessions is a Map<appName, Map<userId, Map<sessionId, Session>>>
		for (const [, userSessions] of sessions) {
			for (const [, session] of userSessions) {
				for (const [, innerSession] of session) {
					const state = innerSession?.state as unknown;
					if (state == null) continue;

					const stateKeys =
						state instanceof Map
							? Array.from(state.keys())
							: typeof state === "object"
								? Object.keys(state as Record<string, unknown>)
								: [];

					if (
						(state instanceof Map && state.size > 0) ||
						(typeof state === "object" && stateKeys.length > 0)
					) {
						// Convert Map to plain object if needed
						if (state instanceof Map) {
							return Object.fromEntries(state) as Record<string, unknown>;
						}
						return state as Record<string, unknown>;
					}
				}
			}
		}
		return undefined;
	}

	/**
	 * Get session info for all loaded agents before stopping
	 * Used for preserving sessions during hot reload
	 */
	getLoadedAgentSessions(): Map<string, string> {
		const sessions = new Map<string, string>();
		for (const [agentPath, loadedAgent] of this.loadedAgents.entries()) {
			sessions.set(agentPath, loadedAgent.sessionId);
		}
		return sessions;
	}

	stopAllAgents(): void {
		for (const [agentPath] of Array.from(this.loadedAgents.entries())) {
			this.stopAgent(agentPath);
		}
	}
}
