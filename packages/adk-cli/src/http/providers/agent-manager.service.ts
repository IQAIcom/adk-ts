import { createHash } from "node:crypto";
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
import { DEFAULT_APP_NAME, USER_ID_PREFIX } from "../../common/constants";
import type { Agent, ContentPart, LoadedAgent } from "../../common/types";
import { AgentLoader } from "./agent-loader.service";
import type {
	ModuleExport,
	SessionState,
	SessionWithState,
} from "./agent-loader.types";
import { AgentScanner } from "./agent-scanner.service";

/**
 * Agent-like object with optional sessionService
 */
interface AgentWithSessionService {
	sessionService?: SessionServiceLike;
}

/**
 * Session service structure with sessions map
 */
interface SessionServiceLike {
	sessions?: Map<string, Map<string, Map<string, SessionWithState>>>;
}

@Injectable()
export class AgentManager {
	private agents = new Map<string, Agent>();
	private loadedAgents = new Map<string, LoadedAgent>();
	private builtAgents = new Map<string, BuiltAgent>();
	private initialStateHashes = new Map<string, string>();
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

	/**
	 * Start an agent, optionally restoring a previous session.
	 * @param agentPath - The path to the agent
	 * @param preservedSessionId - Optional session ID to restore (used during hot reload)
	 * @param forceFullReload - Force cache invalidation and session reset (used when initial state changes)
	 */
	async startAgent(
		agentPath: string,
		preservedSessionId?: string,
		forceFullReload?: boolean,
	): Promise<void> {
		this.logger.log(
			format(
				"Starting agent: %s%s",
				agentPath,
				preservedSessionId ? ` (restoring session ${preservedSessionId})` : "",
			),
		);

		const agent = this.validateAndGetAgent(agentPath);

		if (this.loadedAgents.has(agentPath)) {
			return; // Already running
		}

		try {
			const agentResult = await this.loadAgentModule(agent, forceFullReload);

			// Check if initial state has changed
			const initialState = this.extractInitialState(agentResult);
			const stateHash = this.hashState(initialState);
			const previousStateHash = this.initialStateHashes.get(agentPath);
			const stateChanged = previousStateHash && previousStateHash !== stateHash;

			let sessionIdToUse = preservedSessionId;
			if (stateChanged) {
				this.logger.log(
					format(
						"Initial state changed for %s - forcing full reload (old: %s, new: %s)",
						agentPath,
						previousStateHash,
						stateHash,
					),
				);
				// Clear existing sessions when initial state changes
				await this.clearAgentSessions(agentPath);
				sessionIdToUse = undefined; // Don't preserve session if state changed
			}

			// Store the new state hash
			this.initialStateHashes.set(agentPath, stateHash);

			const sessionToUse =
				sessionIdToUse && !stateChanged
					? await this.getExistingSession(agentPath, sessionIdToUse)
					: await this.getOrCreateSession(agentPath, agentResult);
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
		forceInvalidateCache?: boolean,
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
			? await this.loader.importTypeScriptFile(
					agentFilePath,
					agent.projectRoot,
					forceInvalidateCache,
				)
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

	/**
	 * Get an existing session by ID, falling back to creating a new one if not found
	 */
	private async getExistingSession(
		agentPath: string,
		sessionId: string,
	): Promise<Session> {
		const userId = `${USER_ID_PREFIX}${agentPath}`;
		const appName = DEFAULT_APP_NAME;

		try {
			const session = await this.sessionService.getSession(
				appName,
				userId,
				sessionId,
			);
			if (session) {
				this.logger.log(format("Restored existing session: %s", sessionId));
				return session;
			}
		} catch (error) {
			this.logger.warn(
				format(
					"Failed to restore session %s, creating new one: %s",
					sessionId,
					error instanceof Error ? error.message : String(error),
				),
			);
		}

		// Fall back to creating a new session if restoration fails
		return this.sessionService.createSession(appName, userId);
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
		// Store the builtAgent in a separate map for state extraction
		if (agentResult.builtAgent) {
			this.builtAgents.set(agentPath, agentResult.builtAgent);
		}

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
		this.builtAgents.delete(agentPath);
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
				const parts = (event?.content?.parts || []) as ContentPart[];
				accumulated += parts.map((p) => (p?.text ? p.text : "")).join("");
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
	getInitialStateForAgent(agentPath: string): SessionState | undefined {
		const agent = this.agents.get(agentPath);
		if (!agent) {
			return undefined;
		}
		if (!agent.instance) {
			return undefined;
		}
		// Use the builtAgent from the separate map if available
		const builtAgent = this.builtAgents.get(agentPath);
		const agentResult = {
			agent: agent.instance,
			builtAgent: builtAgent,
		};
		return this.extractInitialState(agentResult);
	}

	/**
	 * Extract initial state from an agent result by checking built agent, sessionService, and sub-agents.
	 * Tries extraction in this order:
	 * 1. From builtAgent.session (if available)
	 * 2. From agent.sessionService (if present)
	 * 3. From subAgents' sessionServices (if any)
	 *
	 * @param agentResult - The agent result containing agent and optional builtAgent
	 * @returns The initial session state if found, undefined otherwise
	 */
	private extractInitialState(agentResult: {
		agent: BaseAgent;
		builtAgent?: BuiltAgent;
	}): SessionState | undefined {
		// Try to extract from built agent's session first
		const builtAgentState = this.extractBuiltAgentState(agentResult.builtAgent);
		if (builtAgentState) {
			return builtAgentState;
		}

		// Try to extract from agent's session service
		const agentState = this.getInitialStateFromSessionService(
			agentResult.agent as unknown as AgentWithSessionService,
		);
		if (agentState) {
			return agentState;
		}

		// Try to extract from sub-agents' session services
		const subAgentState = this.extractSubAgentState(agentResult.agent);
		if (subAgentState) {
			return subAgentState;
		}

		return undefined;
	}

	/**
	 * Extract state from a built agent's session if available.
	 *
	 * @param builtAgent - The built agent instance (optional)
	 * @returns The state from builtAgent.session if found and non-empty, undefined otherwise
	 */
	private extractBuiltAgentState(
		builtAgent: BuiltAgent | undefined,
	): SessionState | undefined {
		if (!builtAgent?.session) {
			return undefined;
		}

		const state = builtAgent.session.state as SessionState | undefined;
		if (state && Object.keys(state).length > 0) {
			return state;
		}

		return undefined;
	}

	/**
	 * Extract state from sub-agents' session services.
	 * Checks each sub-agent for a session service and returns the first non-empty state found.
	 *
	 * @param agent - The agent that may have sub-agents
	 * @returns The state from the first sub-agent with a non-empty state, undefined otherwise
	 */
	private extractSubAgentState(agent: BaseAgent): SessionState | undefined {
		const subAgents = (agent as { subAgents?: BaseAgent[] }).subAgents;
		if (!Array.isArray(subAgents)) {
			return undefined;
		}

		for (const subAgent of subAgents) {
			const subState = this.getInitialStateFromSessionService(
				subAgent as unknown as AgentWithSessionService,
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

		return undefined;
	}

	/**
	 * Extract the first non-empty state from a potentially-Map state value.
	 * Handles both plain objects (SessionState) and Map instances.
	 *
	 * @param state - The state value, which could be SessionState, Map, or undefined
	 * @returns The extracted SessionState if non-empty, undefined otherwise
	 */
	private extractNonEmptyState(
		state: SessionState | Map<string, unknown> | undefined,
	): SessionState | undefined {
		if (state == null) return undefined;

		if (state instanceof Map) {
			if (state.size > 0) {
				return Object.fromEntries(state);
			}
			return undefined;
		}

		if (typeof state === "object" && Object.keys(state).length > 0) {
			return state as SessionState;
		}

		return undefined;
	}

	/**
	 * Extract state from an agent's sessionService by traversing its nested maps.
	 *
	 * The sessionService maintains a nested structure:
	 * - Map<appName, Map<userId, Map<sessionId, SessionWithState>>>
	 *
	 * This method iterates through all sessions and returns the first non-empty state found.
	 * States can be either plain objects (SessionState) or Maps (which are converted to objects).
	 *
	 * @param agent - The agent with optional sessionService property
	 * @returns The first non-empty session state found, or undefined if none exists
	 */
	private getInitialStateFromSessionService(
		agent: AgentWithSessionService | undefined,
	): SessionState | undefined {
		const sessions = agent?.sessionService?.sessions;
		if (!sessions) return undefined;

		// sessions is a Map<appName, Map<userId, Map<sessionId, SessionWithState>>>
		for (const [, userSessions] of sessions) {
			for (const [, session] of userSessions) {
				for (const [, innerSession] of session) {
					const extractedState = this.extractNonEmptyState(
						innerSession?.state as
							| SessionState
							| Map<string, unknown>
							| undefined,
					);
					if (extractedState) {
						return extractedState;
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

	/**
	 * Check if initial state has changed for any loaded agent
	 * Returns true if any agent's initial state hash has changed
	 */
	async hasInitialStateChanged(): Promise<boolean> {
		for (const [agentPath, agent] of this.agents.entries()) {
			if (!this.loadedAgents.has(agentPath)) {
				continue; // Skip agents that aren't loaded
			}

			try {
				// Temporarily load the agent to check its state
				const agentResult = await this.loadAgentModule(agent, false);
				const initialState = this.extractInitialState(agentResult);
				const stateHash = this.hashState(initialState);
				const previousStateHash = this.initialStateHashes.get(agentPath);

				if (previousStateHash && previousStateHash !== stateHash) {
					this.logger.log(
						format(
							"Detected initial state change for %s (old: %s, new: %s)",
							agentPath,
							previousStateHash,
							stateHash,
						),
					);
					return true;
				}
			} catch (error) {
				// If we can't load the agent, assume state might have changed
				this.logger.warn(
					format(
						"Failed to check state for %s: %s",
						agentPath,
						error instanceof Error ? error.message : String(error),
					),
				);
				return true; // Be safe and reload
			}
		}
		return false;
	}

	stopAllAgents(): void {
		for (const [agentPath] of Array.from(this.loadedAgents.entries())) {
			this.stopAgent(agentPath);
		}
		this.builtAgents.clear();
	}

	/**
	 * Hash the initial state to detect changes
	 */
	private hashState(state: SessionState | undefined): string {
		if (!state || Object.keys(state).length === 0) {
			return "empty";
		}
		return createHash("sha256").update(JSON.stringify(state)).digest("hex");
	}

	/**
	 * Clear all sessions for an agent (used when initial state changes)
	 */
	private async clearAgentSessions(agentPath: string): Promise<void> {
		try {
			const userId = `${USER_ID_PREFIX}${agentPath}`;
			const appName = DEFAULT_APP_NAME;
			const sessions = await this.sessionService.listSessions(appName, userId);

			for (const session of sessions.sessions) {
				try {
					await this.sessionService.deleteSession(appName, userId, session.id);
					this.logger.log(
						format("Cleared session %s for agent %s", session.id, agentPath),
					);
				} catch (error) {
					this.logger.warn(
						format(
							"Failed to clear session %s: %s",
							session.id,
							error instanceof Error ? error.message : String(error),
						),
					);
				}
			}
		} catch (error) {
			this.logger.warn(
				format(
					"Failed to list sessions for clearing: %s",
					error instanceof Error ? error.message : String(error),
				),
			);
		}
	}
}
