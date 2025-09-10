import type { Content, GroundingMetadata } from "@google/genai";
import { Event } from "../events/event";
import { EventActions } from "../events/event-actions";
import {
	BaseSessionService,
	type GetSessionConfig,
	type ListSessionsResponse,
} from "./base-session-service";
import type { Session } from "./session";

/**
 * Interface for API client from genai package
 * This matches the structure used by the Python version
 */
interface ApiClient {
	async_request(options: {
		http_method: string;
		path: string;
		request_dict: Record<string, any>;
	}): Promise<any>;
}

/**
 * Interface for GenAI client that has an API client
 */
interface GenAIClient {
	_api_client: ApiClient;
}

/**
 * Connects to the Vertex AI Agent Engine Session Service using GenAI API client.
 *
 * https://cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/sessions/overview
 */
export class VertexAiSessionService extends BaseSessionService {
	private readonly project?: string;
	private readonly location?: string;
	private readonly agentEngineId?: string;

	/**
	 * Initializes the VertexAiSessionService.
	 */
	constructor(
		options: {
			project?: string;
			location?: string;
			agentEngineId?: string;
		} = {},
	) {
		super();
		this.project = options.project;
		this.location = options.location;
		this.agentEngineId = options.agentEngineId;
	}

	async createSession(
		appName: string,
		userId: string,
		state?: Record<string, any>,
		sessionId?: string,
	): Promise<Session> {
		if (sessionId) {
			throw new Error(
				"User-provided Session id is not supported for VertexAISessionService.",
			);
		}

		const reasoningEngineId = this.getReasoningEngineId(appName);
		const apiClient = this.getApiClient();

		const sessionJsonDict: Record<string, any> = { user_id: userId };
		if (state) {
			sessionJsonDict.session_state = state;
		}

		const apiResponse = await apiClient.async_request({
			http_method: "POST",
			path: `reasoningEngines/${reasoningEngineId}/sessions`,
			request_dict: sessionJsonDict,
		});

		console.debug("Create Session response", apiResponse);

		const createdSessionId = apiResponse.name.split("/").slice(-3, -2)[0];
		const operationId = apiResponse.name.split("/").pop();

		// Wait for operation to complete
		let maxRetryAttempt = 5;
		let lroResponse: any = null;
		while (maxRetryAttempt >= 0) {
			lroResponse = await apiClient.async_request({
				http_method: "GET",
				path: `operations/${operationId}`,
				request_dict: {},
			});

			if (lroResponse?.done) {
				break;
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
			maxRetryAttempt--;
		}

		if (!lroResponse || !lroResponse.done) {
			throw new Error(
				`Timeout waiting for operation ${operationId} to complete.`,
			);
		}

		// Get session resource
		const getSessionApiResponse = await apiClient.async_request({
			http_method: "GET",
			path: `reasoningEngines/${reasoningEngineId}/sessions/${createdSessionId}`,
			request_dict: {},
		});

		const updateTimestamp =
			new Date(getSessionApiResponse.updateTime).getTime() / 1000;

		return {
			appName: String(appName),
			userId: String(userId),
			id: String(createdSessionId),
			state: getSessionApiResponse.sessionState || {},
			events: [],
			lastUpdateTime: updateTimestamp,
		};
	}

	async getSession(
		appName: string,
		userId: string,
		sessionId: string,
		config?: GetSessionConfig,
	): Promise<Session | undefined> {
		const reasoningEngineId = this.getReasoningEngineId(appName);
		const apiClient = this.getApiClient();

		try {
			// Get session resource
			const getSessionApiResponse = await apiClient.async_request({
				http_method: "GET",
				path: `reasoningEngines/${reasoningEngineId}/sessions/${sessionId}`,
				request_dict: {},
			});

			const sessionIdFromResponse = getSessionApiResponse.name.split("/").pop();
			const updateTimestamp =
				new Date(getSessionApiResponse.updateTime).getTime() / 1000;

			const session: Session = {
				appName: String(appName),
				userId: String(userId),
				id: String(sessionIdFromResponse),
				state: getSessionApiResponse.sessionState || {},
				events: [],
				lastUpdateTime: updateTimestamp,
			};

			// Get events
			let listEventsApiResponse = await apiClient.async_request({
				http_method: "GET",
				path: `reasoningEngines/${reasoningEngineId}/sessions/${sessionId}/events`,
				request_dict: {},
			});

			// Handle empty response case
			if (listEventsApiResponse.httpHeaders) {
				return session;
			}

			if (listEventsApiResponse.sessionEvents) {
				session.events.push(
					...listEventsApiResponse.sessionEvents.map(this.fromApiEvent),
				);
			}

			// Handle pagination
			while (listEventsApiResponse.nextPageToken) {
				const pageToken = listEventsApiResponse.nextPageToken;
				listEventsApiResponse = await apiClient.async_request({
					http_method: "GET",
					path: `reasoningEngines/${reasoningEngineId}/sessions/${sessionId}/events?pageToken=${encodeURIComponent(pageToken)}`,
					request_dict: {},
				});

				if (listEventsApiResponse.sessionEvents) {
					session.events.push(
						...listEventsApiResponse.sessionEvents.map(this.fromApiEvent),
					);
				}
			}

			// Filter events by timestamp
			session.events = session.events.filter(
				(event) => event.timestamp <= updateTimestamp,
			);
			session.events.sort((a, b) => a.timestamp - b.timestamp);

			// Apply config filters
			if (config) {
				if (config.numRecentEvents) {
					session.events = session.events.slice(-config.numRecentEvents);
				} else if (config.afterTimestamp) {
					let i = session.events.length - 1;
					while (i >= 0) {
						if (session.events[i].timestamp < config.afterTimestamp) {
							break;
						}
						i--;
					}
					if (i >= 0) {
						session.events = session.events.slice(i);
					}
				}
			}

			return session;
		} catch (error) {
			console.error(`Error getting session ${sessionId}:`, error);
			return undefined;
		}
	}

	async listSessions(
		appName: string,
		userId: string,
	): Promise<ListSessionsResponse> {
		const reasoningEngineId = this.getReasoningEngineId(appName);
		const apiClient = this.getApiClient();

		let path = `reasoningEngines/${reasoningEngineId}/sessions`;
		if (userId) {
			const parsedUserId = encodeURIComponent(`"${userId}"`);
			path = `${path}?filter=user_id=${parsedUserId}`;
		}

		const apiResponse = await apiClient.async_request({
			http_method: "GET",
			path,
			request_dict: {},
		});

		// Handle empty response case
		if (apiResponse.httpHeaders) {
			return { sessions: [] };
		}

		const sessions: Session[] = [];
		if (apiResponse.sessions) {
			for (const apiSession of apiResponse.sessions) {
				const session: Session = {
					appName,
					userId,
					id: apiSession.name.split("/").pop(),
					state: {},
					events: [],
					lastUpdateTime: new Date(apiSession.updateTime).getTime() / 1000,
				};
				sessions.push(session);
			}
		}

		return { sessions };
	}

	async deleteSession(
		appName: string,
		userId: string,
		sessionId: string,
	): Promise<void> {
		const reasoningEngineId = this.getReasoningEngineId(appName);
		const apiClient = this.getApiClient();

		try {
			await apiClient.async_request({
				http_method: "DELETE",
				path: `reasoningEngines/${reasoningEngineId}/sessions/${sessionId}`,
				request_dict: {},
			});
		} catch (error) {
			console.error(`Error deleting session ${sessionId}:`, error);
			throw error;
		}
	}

	async appendEvent(session: Session, event: Event): Promise<Event> {
		// Update the in-memory session
		await super.appendEvent(session, event);

		const reasoningEngineId = this.getReasoningEngineId(session.appName);
		const apiClient = this.getApiClient();

		await apiClient.async_request({
			http_method: "POST",
			path: `reasoningEngines/${reasoningEngineId}/sessions/${session.id}:appendEvent`,
			request_dict: this.convertEventToJson(event),
		});

		return event;
	}

	private getReasoningEngineId(appName: string): string {
		if (this.agentEngineId) {
			return this.agentEngineId;
		}

		if (/^\d+$/.test(appName)) {
			return appName;
		}

		const pattern =
			/^projects\/([a-zA-Z0-9-_]+)\/locations\/([a-zA-Z0-9-_]+)\/reasoningEngines\/(\d+)$/;
		const match = appName.match(pattern);

		if (!match) {
			throw new Error(
				`App name ${appName} is not valid. It should either be the full ReasoningEngine resource name, or the reasoning engine id.`,
			);
		}

		return match[3];
	}

	private getApiClient(): ApiClient {
		// This needs to be instantiated inside each request for proper event loop management
		// Import genai dynamically to avoid circular dependencies
		const { GoogleGenAI } = require("@google/genai");

		const client = new GoogleGenAI({
			vertexai: true,
			project: this.project,
			location: this.location,
		}) as GenAIClient;

		return client._api_client;
	}

	private convertEventToJson(event: Event): Record<string, any> {
		const metadataJson: Record<string, any> = {
			partial: event.partial,
			turn_complete: event.turnComplete,
			interrupted: event.interrupted,
			branch: event.branch,
			long_running_tool_ids: event.longRunningToolIds
				? Array.from(event.longRunningToolIds)
				: null,
		};

		if (event.groundingMetadata) {
			metadataJson.grounding_metadata = event.groundingMetadata;
		}

		const eventJson: Record<string, any> = {
			author: event.author,
			invocation_id: event.invocationId,
			timestamp: {
				seconds: Math.floor(event.timestamp),
				nanos: Math.floor(
					(event.timestamp - Math.floor(event.timestamp)) * 1_000_000_000,
				),
			},
			error_code: event.errorCode,
			error_message: event.errorMessage,
			event_metadata: metadataJson,
		};

		if (event.actions) {
			const actionsJson = {
				skip_summarization: event.actions.skipSummarization,
				state_delta: event.actions.stateDelta,
				artifact_delta: event.actions.artifactDelta,
				transfer_agent: event.actions.transferToAgent,
				escalate: event.actions.escalate,
				requested_auth_configs: event.actions.requestedAuthConfigs,
			};
			eventJson.actions = actionsJson;
		}

		if (event.content) {
			eventJson.content = event.content;
		}

		return eventJson;
	}

	private fromApiEvent(apiEvent: Record<string, any>): Event {
		let eventActions = new EventActions();
		if (apiEvent.actions) {
			eventActions = new EventActions({
				skipSummarization: apiEvent.actions.skipSummarization,
				stateDelta: apiEvent.actions.stateDelta || {},
				artifactDelta: apiEvent.actions.artifactDelta || {},
				transferToAgent: apiEvent.actions.transferAgent,
				escalate: apiEvent.actions.escalate,
				requestedAuthConfigs: apiEvent.actions.requestedAuthConfigs || {},
			});
		}

		const event = new Event({
			id: apiEvent.name.split("/").pop(),
			invocationId: apiEvent.invocationId,
			author: apiEvent.author,
			actions: eventActions,
			content: this.decodeContent(apiEvent.content),
			timestamp: new Date(apiEvent.timestamp).getTime() / 1000,
		});

		// Set error properties directly since they're inherited from LlmResponse
		if (apiEvent.errorCode) {
			event.errorCode = apiEvent.errorCode;
		}
		if (apiEvent.errorMessage) {
			event.errorMessage = apiEvent.errorMessage;
		}

		if (apiEvent.eventMetadata) {
			const longRunningToolIdsList = apiEvent.eventMetadata.longRunningToolIds;
			event.partial = apiEvent.eventMetadata.partial;
			event.turnComplete = apiEvent.eventMetadata.turnComplete;
			event.interrupted = apiEvent.eventMetadata.interrupted;
			event.branch = apiEvent.eventMetadata.branch;
			event.groundingMetadata = this.decodeGroundingMetadata(
				apiEvent.eventMetadata.groundingMetadata,
			);
			event.longRunningToolIds = longRunningToolIdsList
				? new Set(longRunningToolIdsList)
				: undefined;
		}

		return event;
	}

	private decodeContent(content: any): Content | undefined {
		if (!content) return undefined;
		// Content is already in the correct format from the API
		return content as Content;
	}

	private decodeGroundingMetadata(
		groundingMetadata: any,
	): GroundingMetadata | undefined {
		if (!groundingMetadata) return undefined;
		// GroundingMetadata is already in the correct format from the API
		return groundingMetadata as GroundingMetadata;
	}
}
