import { Controller, Get, Inject, Param } from "@nestjs/common";
import {
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags,
} from "@nestjs/swagger";
import { EventsResponse } from "../../common/types";
import { EventsResponseDto } from "../dto/api.dto";
import { EventsService } from "./events.service";

@ApiTags("events")
@Controller("api/agents/:id/sessions/:sessionId")
export class EventsController {
	constructor(
		@Inject(EventsService)
		private readonly events: EventsService,
	) {}

	@Get("events")
	@ApiOperation({
		summary: "Get session events",
		description:
			"Returns chronological events for a specific agent session including actions, function calls, and responses.",
	})
	@ApiParam({
		name: "id",
		description: "URL-encoded absolute agent path or identifier",
	})
	@ApiParam({ name: "sessionId", description: "Target session identifier" })
	@ApiOkResponse({ type: EventsResponseDto })
	async getEvents(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	): Promise<EventsResponse> {
		const agentPath = decodeURIComponent(id);
		return this.events.getEvents(agentPath, sessionId);
	}

	@Get("events/:eventId/graph")
	@ApiOperation({
		summary: "Get agent graph for a specific event",
		description:
			"Returns the agent graph with highlights showing function calls related to the specified event.",
	})
	@ApiParam({
		name: "id",
		description: "URL-encoded absolute agent path or identifier",
	})
	@ApiParam({ name: "sessionId", description: "Session identifier" })
	@ApiParam({ name: "eventId", description: "Event identifier" })
	@ApiOkResponse({
		schema: {
			properties: {
				graph: { type: "object", description: "Agent graph structure" },
				highlights: {
					type: "array",
					items: { type: "array", items: { type: "string" } },
					description: "Highlighted edges in the graph",
				},
			},
		},
	})
	async getEventGraph(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
		@Param("eventId") eventId: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.events.getEventGraph(agentPath, sessionId, eventId);
	}
}
