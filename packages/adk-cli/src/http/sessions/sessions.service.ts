import { format } from "node:util";
import { Event, InMemorySessionService } from "@iqai/adk";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { TOKENS } from "../../common/tokens";
import type {
	CreateSessionRequest,
	EventsResponse,
	LoadedAgent,
	SessionResponse,
	SessionsResponse,
	StateResponse,
} from "../../common/types";
import { AgentManager } from "../providers/agent-manager.service";

@Injectable()
export class SessionsService {
	private logger: Logger;

	constructor(
		@Inject(AgentManager) private readonly agentManager: AgentManager,
		@Inject(InMemorySessionService)
		private readonly sessionService: InMemorySessionService,
		@Inject(TOKENS.QUIET) private readonly quiet: boolean,
	) {
		this.logger = new Logger("sessions-service");
	}

	// Centralized agent loader for reuse across modules
	public async ensureAgentLoaded(
		agentPath: string,
	): Promise<LoadedAgent | null> {
		if (!this.agentManager.getLoadedAgents().has(agentPath)) {
			try {
				await this.agentManager.startAgent(agentPath);
			} catch {
				return null;
			}
		}
		const loaded = this.agentManager.getLoadedAgents().get(agentPath);
		return loaded ?? null;
	}

	// ----- Public API used by controllers (compat with previous shape) -----

	async listSessions(agentPath: string): Promise<SessionsResponse> {
		const loaded = await this.ensureAgentLoaded(agentPath);
		if (!loaded) {
			return { sessions: [] };
		}
		return this.getAgentSessions(loaded);
	}

	async createSession(
		agentPath: string,
		request: CreateSessionRequest,
	): Promise<SessionResponse | { error: string }> {
		const loaded = await this.ensureAgentLoaded(agentPath);
		if (!loaded) {
			return { error: "Failed to load agent" };
		}
		return this.createAgentSession(loaded, request);
	}

	async deleteSession(
		agentPath: string,
		sessionId: string,
	): Promise<{ success: boolean } | { error: string }> {
		const loaded = await this.ensureAgentLoaded(agentPath);
		if (!loaded) {
			return { error: "Failed to load agent" };
		}
		await this.deleteAgentSession(loaded, sessionId);
		return { success: true };
	}

	async switchSession(
		agentPath: string,
		sessionId: string,
	): Promise<{ success: boolean } | { error: string }> {
		const loaded = await this.ensureAgentLoaded(agentPath);
		if (!loaded) {
			return { error: "Failed to load agent" };
		}
		await this.switchAgentSession(loaded, sessionId);
		return { success: true };
	}

	// ----- Inlined former SessionManager functionality -----

	async getSessionMessages(loadedAgent: LoadedAgent) {
		try {
			// Get session from session service
			const session = await this.sessionService.getSession(
				loadedAgent.appName,
				loadedAgent.userId,
				loadedAgent.sessionId,
			);

			if (!session || !session.events) {
				return [];
			}

			// Convert session events to message format
			// See TODO notes in previous implementation regarding tool call representation.
			const messages = session.events.map((event: Event, index: number) => ({
				id: index + 1,
				type:
					event.author === "user" ? ("user" as const) : ("assistant" as const),
				content:
					event.content?.parts
						?.map((part: unknown) =>
							typeof part === "object" && part !== null && "text" in part
								? (part as { text: string }).text
								: "",
						)
						.join("") || "",
				timestamp: new Date(event.timestamp || Date.now()).toISOString(),
			}));

			return messages;
		} catch (error) {
			this.logger.error(
				"Error fetching messages:",
				error instanceof Error ? error.message : String(error),
			);
			return [];
		}
	}

	/**
	 * Get all sessions for a loaded agent
	 */
	async getAgentSessions(loadedAgent: LoadedAgent): Promise<SessionsResponse> {
		try {
			this.logger.log(
				format(
					"Listing sessions for: %s %s",
					loadedAgent.appName,
					loadedAgent.userId,
				),
			);
			const listResponse = await this.sessionService.listSessions(
				loadedAgent.appName,
				loadedAgent.userId,
			);
			this.logger.log(
				format("Raw sessions from service: %d", listResponse.sessions.length),
			);

			const sessions: SessionResponse[] = [];
			for (const s of listResponse.sessions) {
				// Ensure we load the full session to get the latest event list
				let fullSession: typeof s = s;
				try {
					const session = await this.sessionService.getSession(
						loadedAgent.appName,
						loadedAgent.userId,
						s.id,
					);
					if (session) {
						fullSession = session;
					}
				} catch {
					// Keep fullSession as s
				}

				sessions.push({
					id: s.id,
					appName: s.appName,
					userId: s.userId,
					state: s.state,
					eventCount: Array.isArray(fullSession?.events)
						? fullSession.events.length
						: 0,
					lastUpdateTime: s.lastUpdateTime,
					createdAt: s.lastUpdateTime,
				});
			}

			this.logger.log(format("Processed sessions: %d", sessions.length));
			return { sessions };
		} catch (error) {
			this.logger.error("Error fetching sessions: %o", error);
			return { sessions: [] };
		}
	}

	/**
	 * Create a new session for a loaded agent
	 */
	async createAgentSession(
		loadedAgent: LoadedAgent,
		request?: CreateSessionRequest,
	): Promise<SessionResponse> {
		try {
			// Extract initial state from the agent if no state provided in request
			let stateToUse = request?.state;
			if (!stateToUse) {
				// Get the agent path from userId (remove the prefix)
				const agentPath = loadedAgent.userId.startsWith("user_")
					? loadedAgent.userId.substring(5)
					: loadedAgent.userId;
				const initialState =
					this.agentManager.getInitialStateForAgent(agentPath);
				if (initialState) {
					this.logger.log(
						format(
							"Using initial state from agent for new session: %o",
							Object.keys(initialState),
						),
					);
					stateToUse = initialState;
				}
			}

			this.logger.log(
				format("Creating agent session: %o", {
					appName: loadedAgent.appName,
					userId: loadedAgent.userId,
					hasState: !!stateToUse,
					stateKeys: stateToUse ? Object.keys(stateToUse) : [],
					sessionId: request?.sessionId,
				}),
			);

			const newSession = await this.sessionService.createSession(
				loadedAgent.appName,
				loadedAgent.userId,
				stateToUse,
				request?.sessionId,
			);

			this.logger.log(
				format("Session created with state: %o", {
					sessionId: newSession.id,
					hasState: !!newSession.state,
					stateKeys: newSession.state ? Object.keys(newSession.state) : [],
					stateContent: newSession.state,
				}),
			);

			return {
				id: newSession.id,
				appName: newSession.appName,
				userId: newSession.userId,
				state: newSession.state,
				eventCount: newSession.events.length,
				lastUpdateTime: newSession.lastUpdateTime,
				createdAt: newSession.lastUpdateTime,
			};
		} catch (error) {
			this.logger.error("Error creating session: %o", error);
			throw error;
		}
	}

	/**
	 * Delete a session for a loaded agent
	 */
	async deleteAgentSession(
		loadedAgent: LoadedAgent,
		sessionId: string,
	): Promise<void> {
		try {
			await this.sessionService.deleteSession(
				loadedAgent.appName,
				loadedAgent.userId,
				sessionId,
			);
		} catch (error) {
			this.logger.error("Error deleting session: %o", error);
			throw error;
		}
	}

	/**
	 * Get events for a specific session
	 */
	async getSessionEvents(
		loadedAgent: LoadedAgent,
		sessionId: string,
	): Promise<EventsResponse> {
		try {
			const session = await this.sessionService.getSession(
				loadedAgent.appName,
				loadedAgent.userId,
				sessionId,
			);

			if (!session || !session.events) {
				return { events: [], totalCount: 0 };
			}

			interface EventLike {
				id: string;
				author: string;
				timestamp: number;
				content?: { parts?: unknown[] };
				actions?: unknown;
				branch?: string;
				partial?: boolean;
				getFunctionCalls?: () => unknown[];
				getFunctionResponses?: () => unknown[];
				isFinalResponse?: () => boolean;
			}

			const events = session.events.map((event: Event) => {
				// Handle both Event class instances and plain objects
				const eventLike = event as unknown as EventLike;
				const isEventInstance =
					typeof eventLike.getFunctionCalls === "function";

				const parts = eventLike.content?.parts;

				return {
					id: eventLike.id,
					author: eventLike.author,
					timestamp: eventLike.timestamp,
					content: eventLike.content,
					actions: eventLike.actions,
					functionCalls:
						isEventInstance && eventLike.getFunctionCalls
							? eventLike.getFunctionCalls()
              : parts?.filter(
                  (part: unknown) =>
                    part &&
                    typeof part === "object" &&
                    part !== null &&
                    "functionCall" in part,
                ) || [],
					functionResponses:
						isEventInstance && eventLike.getFunctionResponses
							? eventLike.getFunctionResponses()
							: parts?.filter(
									(part: unknown) =>
										part &&
										part &&
										typeof part === "object" &&
										part !== null &&
										"functionResponse" in part,
								) || [],
					branch: eventLike.branch,
					isFinalResponse:
						isEventInstance && eventLike.isFinalResponse
							? eventLike.isFinalResponse()
							: !parts?.some(
									(part: unknown) =>
										part &&
										typeof part === "object" &&
										part !== null &&
										"functionResponse" in part,
								) && !eventLike.partial,
				};
			});

			return {
				events,
				totalCount: events.length,
			};
		} catch (error) {
			this.logger.error("Error fetching session events: %o", error);
			return { events: [], totalCount: 0 };
		}
	}

	/**
	 * Switch the loaded agent to use a different session
	 */
	async switchAgentSession(
		loadedAgent: LoadedAgent,
		sessionId: string,
	): Promise<void> {
		try {
			// Verify the session exists
			const session = await this.sessionService.getSession(
				loadedAgent.appName,
				loadedAgent.userId,
				sessionId,
			);

			if (!session) {
				throw new Error(`Session ${sessionId} not found`);
			}

			// Update the loaded agent's session ID
			(loadedAgent as { sessionId: string }).sessionId = sessionId;
		} catch (error) {
			this.logger.error("Error switching session: %o", error);
			throw error;
		}
	}

	/**
	 * Get state for specific session
	 */
	async getSessionState(
		loadedAgent: LoadedAgent,
		sessionId: string,
	): Promise<StateResponse> {
		try {
			this.logger.log(format("Getting session state: %s", sessionId));

			const session = await this.sessionService.getSession(
				loadedAgent.appName,
				loadedAgent.userId,
				sessionId,
			);

			if (!session) {
				throw new Error("Session not found");
			}

			const agentState: Record<string, unknown> = {};
			const userState: Record<string, unknown> = {};
			const sessionState = session.state || {};

			this.logger.log(
				format("Session state retrieved: %o", {
					sessionId,
					hasSessionState: !!session.state,
					sessionStateKeys: Object.keys(sessionState),
					sessionStateContent: sessionState,
					sessionLastUpdateTime: session.lastUpdateTime,
				}),
			);

			const allKeys = { ...agentState, ...userState, ...sessionState };
			const totalKeys = Object.keys(allKeys).length;
			const sizeBytes = JSON.stringify(allKeys).length;

			const response = {
				agentState,
				userState,
				sessionState,
				metadata: {
					lastUpdated: session.lastUpdateTime,
					changeCount: 0,
					totalKeys,
					sizeBytes,
				},
			};

			this.logger.log(
				format("Returning state response: %o", {
					hasAgentState:
						!!response.agentState &&
						Object.keys(response.agentState).length > 0,
					hasUserState:
						!!response.userState && Object.keys(response.userState).length > 0,
					hasSessionState:
						!!response.sessionState &&
						Object.keys(response.sessionState).length > 0,
					sessionStateKeys: Object.keys(response.sessionState),
					totalKeys: response.metadata.totalKeys,
				}),
			);

			return response;
		} catch (error) {
			this.logger.error("Error getting session state: %o", error);
			return {
				agentState: {},
				userState: {},
				sessionState: {},
				metadata: {
					lastUpdated: Date.now() / 1000,
					changeCount: 0,
					totalKeys: 0,
					sizeBytes: 0,
				},
			};
		}
	}

	/**
	 * Update session state
	 */
	async updateSessionState(
		loadedAgent: LoadedAgent,
		sessionId: string,
		path: string,
		value: unknown,
	): Promise<void> {
		try {
			this.logger.log(
				format("Updating session state: %s %s = %o", sessionId, path, value),
			);

			const session = await this.sessionService.getSession(
				loadedAgent.appName,
				loadedAgent.userId,
				sessionId,
			);

			if (!session) {
				throw new Error("Session not found");
			}

			const updatedState = { ...session.state };
			this.setNestedValue(updatedState, path, value);

			await this.sessionService.createSession(
				loadedAgent.appName,
				loadedAgent.userId,
				updatedState,
				sessionId,
			);

			this.logger.log("Session state updated successfully");
		} catch (error) {
			this.logger.error("Error updating session state: %o", error);
			throw error;
		}
	}

	/**
	 * Helper method to set nested values using dot notation
	 */
	private setNestedValue(
		obj: Record<string, unknown>,
		path: string,
		value: unknown,
	): void {
		const keys = path.split(".");
		const lastKey = keys.pop()!;
		const target = keys.reduce((current: Record<string, unknown>, key) => {
			if (
				!(key in current) ||
				typeof current[key] !== "object" ||
				current[key] === null
			) {
				current[key] = {};
			}
			return current[key] as Record<string, unknown>;
		}, obj);
		target[lastKey] = value;
	}
}
