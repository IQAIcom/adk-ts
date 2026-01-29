import { InMemorySessionService } from "@iqai/adk";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { EventsResponse } from "../../common/types";
import { AgentGraphService } from "../providers/agent-graph.service";
import { AgentLoader } from "../providers/agent-loader.service";
import { SessionsService } from "../sessions/sessions.service";

@Injectable()
export class EventsService {
	private logger: Logger;

	constructor(
		@Inject(SessionsService) private readonly sessionsService: SessionsService,
		@Inject(InMemorySessionService)
		private readonly sessionService: InMemorySessionService,
		@Inject(AgentLoader) private readonly agentLoader: AgentLoader,
		@Inject(AgentGraphService)
		private readonly agentGraphService: AgentGraphService,
	) {
		this.logger = new Logger("events-service");
	}

	async getEvents(
		agentPath: string,
		sessionId: string,
	): Promise<EventsResponse> {
		const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
		if (!loaded) {
			return { events: [], totalCount: 0 };
		}
		return this.sessionsService.getSessionEvents(loaded, sessionId);
	}

	async getEventGraph(
		agentPath: string,
		sessionId: string,
		eventId: string,
	): Promise<
		{ graph: any; highlights: Array<[string, string]> } | { error: string }
	> {
		try {
			const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
			if (!loaded) {
				return { error: "Failed to load agent" };
			}

			// Get the session
			const session = await this.sessionService.getSession(
				loaded.appName,
				loaded.userId,
				sessionId,
			);

			if (!session) {
				return { error: `Session not found: ${sessionId}` };
			}

			// Find the event
			const sessionEvents = session.events || [];
			const event = sessionEvents.find((e) => e.id === eventId);

			if (!event) {
				return { error: `Event not found: ${eventId}` };
			}

			// Get function calls and responses from the event methods
			const functionCalls = event.getFunctionCalls?.() || [];
			const functionResponses = event.getFunctionResponses?.() || [];

			// Generate highlights
			let highlights: Array<[string, string]> = [];

			if (functionCalls.length > 0) {
				for (const functionCall of functionCalls) {
					highlights.push([event.author!, functionCall.name!]);
				}
			} else if (functionResponses.length > 0) {
				for (const functionResponse of functionResponses) {
					highlights.push([functionResponse.name!, event.author!]);
				}
			} else {
				highlights = [[event.author!, ""]];
			}

			// Get the agent graph
			const graph = await this.agentGraphService.getGraph(agentPath);

			return { graph, highlights };
		} catch (error) {
			this.logger.error("Error getting event graph: %o", error);
			return { error: (error as Error).message };
		}
	}
}
