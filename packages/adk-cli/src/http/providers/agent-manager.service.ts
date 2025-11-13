import { existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "node:util";
import type { BaseAgent, BuiltAgent } from "@iqai/adk";
import { FullMessage, InMemorySessionService } from "@iqai/adk";
import { Injectable, Logger } from "@nestjs/common";
import type { Agent, ContentPart, LoadedAgent } from "../../common/types";
import { AgentLoader } from "./agent-loader.service";
import type { ModuleExport, SessionState } from "./agent-loader.types";
import {
	clearAgentSessions as clearAgentSessionsHelper,
	createRunnerWithSession as createRunnerWithSessionHelper,
	getExistingSession as getExistingSessionHelper,
	getOrCreateSession as getOrCreateSessionHelper,
	hashState as hashStateHelper,
	storeLoadedAgent as storeLoadedAgentHelper,
} from "./agent-manager/sessions";
import { extractInitialState as extractInitialStateHelper } from "./agent-manager/state";
import { AgentScanner } from "./agent-scanner.service";

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
	) {
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
			const stateHash = hashStateHelper(initialState);
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
				await clearAgentSessionsHelper(
					this.sessionService,
					agentPath,
					this.logger,
				);
				sessionIdToUse = undefined; // Don't preserve session if state changed
			}

			// Store the new state hash
			this.initialStateHashes.set(agentPath, stateHash);

			const sessionToUse =
				sessionIdToUse && !stateChanged
					? await getExistingSessionHelper(
							this.sessionService,
							agentPath,
							sessionIdToUse,
							this.logger,
						)
					: await getOrCreateSessionHelper(
							this.sessionService,
							agentPath,
							agentResult,
							(r) => extractInitialStateHelper(r, this.logger),
							this.logger,
						);
			const runner = await createRunnerWithSessionHelper(
				this.sessionService,
				agentResult.agent,
				sessionToUse,
				agentPath,
			);
			await storeLoadedAgentHelper(
				this.sessionService,
				agentPath,
				agentResult,
				runner,
				sessionToUse,
				agent,
				(path, payload) => this.loadedAgents.set(path, payload as LoadedAgent),
				this.logger,
				(path, built) => this.builtAgents.set(path, built),
			);

			return { session: sessionIdToUse };
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
	 * Extract initial state from an agent result
	 */
	private extractInitialState(agentResult: {
		agent: BaseAgent;
		builtAgent?: BuiltAgent;
	}): SessionState | undefined {
		return extractInitialStateHelper(agentResult, this.logger);
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
				const stateHash = hashStateHelper(initialState);
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
}
