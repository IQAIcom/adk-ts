import type { InMemorySessionService } from "@iqai/adk";
import type {
	CreateSessionRequest,
	EventsResponse,
	LoadedAgent,
	SessionResponse,
	SessionsResponse,
	StateResponse,
} from "../types.js";

export class SessionManager {
	constructor(private sessionService: InMemorySessionService) {}

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
			// TODO(adk-web/tool-calls): Enhance this endpoint to better represent tool activity.
			// - Option A: Do not persist or return assistant events with empty text (current web filters these client-side).
			// - Option B: Keep raw history but add a query flag like `includeEmpty=false` to suppress blanks for clients that want clean text-only history.
			// - Option C (preferred): Emit explicit tool events, e.g., { type: "tool", name, args, output, status, timestamps } derived from non-text parts.
			//   This enables the web UI to render compact "Used tool: <name>" chips and show outputs, instead of blank assistant messages.
			//   When implemented, maintain backward compatibility by keeping the current shape under a flag (e.g., `format=legacy`).
			const messages = session.events.map((event, index) => ({
				id: index + 1,
				type:
					event.author === "user" ? ("user" as const) : ("assistant" as const),
				content:
					event.content?.parts
						?.map((part) =>
							typeof part === "object" && "text" in part ? part.text : "",
						)
						.join("") || "",
				timestamp: new Date(event.timestamp || Date.now()).toISOString(),
			}));

			return messages;
		} catch (error) {
			console.error("Error fetching messages:", error);
			return [];
		}
	}

	/**
	 * Get all sessions for a loaded agent
	 */
	async getAgentSessions(loadedAgent: LoadedAgent): Promise<SessionsResponse> {
		try {
			console.log(
				"Listing sessions for:",
				loadedAgent.appName,
				loadedAgent.userId,
			);
			const listResponse = await this.sessionService.listSessions(
				loadedAgent.appName,
				loadedAgent.userId,
			);
			console.log("Raw sessions from service:", listResponse.sessions.length);

			const sessions: SessionResponse[] = [];
			for (const s of listResponse.sessions) {
				// Ensure we load the full session to get the latest event list
				let fullSession: any;
				try {
					fullSession = await this.sessionService.getSession(
						loadedAgent.appName,
						loadedAgent.userId,
						s.id,
					);
				} catch (e) {
					fullSession = s;
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

			console.log("Processed sessions:", sessions.length);
			return { sessions };
		} catch (error) {
			console.error("Error fetching sessions:", error);
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
			console.log("Creating agent session:", {
				appName: loadedAgent.appName,
				userId: loadedAgent.userId,
				hasState: !!request?.state,
				stateKeys: request?.state ? Object.keys(request.state) : [],
				sessionId: request?.sessionId,
			});

			const newSession = await this.sessionService.createSession(
				loadedAgent.appName,
				loadedAgent.userId,
				request?.state,
				request?.sessionId,
			);

			console.log("Session created with state:", {
				sessionId: newSession.id,
				hasState: !!newSession.state,
				stateKeys: newSession.state ? Object.keys(newSession.state) : [],
				stateContent: newSession.state,
			});

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
			console.error("Error creating session:", error);
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
			console.error("Error deleting session:", error);
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

			const events = session.events.map((event: any) => {
				// Handle both Event class instances and plain objects
				const isEventInstance = typeof event.getFunctionCalls === "function";

				return {
					id: event.id,
					author: event.author,
					timestamp: event.timestamp,
					content: event.content,
					actions: event.actions,
					functionCalls: isEventInstance
						? event.getFunctionCalls()
						: event.content?.parts?.filter((part: any) => part.functionCall) ||
							[],
					functionResponses: isEventInstance
						? event.getFunctionResponses()
						: event.content?.parts?.filter(
								(part: any) => part.functionResponse,
							) || [],
					branch: event.branch,
					isFinalResponse: isEventInstance
						? event.isFinalResponse()
						: !event.content?.parts?.some((part: any) => part.functionCall) &&
							!event.partial,
				};
			});

			return {
				events,
				totalCount: events.length,
			};
		} catch (error) {
			console.error("Error fetching session events:", error);
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
			(loadedAgent as any).sessionId = sessionId;
		} catch (error) {
			console.error("Error switching session:", error);
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
			console.log("Getting session state:", sessionId);

			const session = await this.sessionService.getSession(
				loadedAgent.appName,
				loadedAgent.userId,
				sessionId,
			);

			if (!session) {
				throw new Error("Session not found");
			}

			const agentState: Record<string, any> = {};
			const userState: Record<string, any> = {};
			const sessionState = session.state || {};

			console.log("Session state retrieved:", {
				sessionId,
				hasSessionState: !!session.state,
				sessionStateKeys: Object.keys(sessionState),
				sessionStateContent: sessionState,
				sessionLastUpdateTime: session.lastUpdateTime,
			});

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

			console.log("Returning state response:", {
				hasAgentState:
					!!response.agentState && Object.keys(response.agentState).length > 0,
				hasUserState:
					!!response.userState && Object.keys(response.userState).length > 0,
				hasSessionState:
					!!response.sessionState &&
					Object.keys(response.sessionState).length > 0,
				sessionStateKeys: Object.keys(response.sessionState),
				totalKeys: response.metadata.totalKeys,
			});

			return response;
		} catch (error) {
			console.error("Error getting session state:", error);
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
		value: any,
	): Promise<void> {
		try {
			console.log("Updating session state:", sessionId, path, "=", value);

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

			console.log("Session state updated successfully");
		} catch (error) {
			console.error("Error updating session state:", error);
			throw error;
		}
	}

	/**
	 * Helper method to set nested values using dot notation
	 */
	private setNestedValue(obj: any, path: string, value: any): void {
		const keys = path.split(".");
		const lastKey = keys.pop()!;
		const target = keys.reduce((current, key) => {
			if (
				!(key in current) ||
				typeof current[key] !== "object" ||
				current[key] === null
			) {
				current[key] = {};
			}
			return current[key];
		}, obj);
		target[lastKey] = value;
	}
}
