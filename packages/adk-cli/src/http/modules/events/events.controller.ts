import { Controller, Get, Param } from "@nestjs/common";
import type { EventsResponse } from "../../../common/types";
import type { EventsService } from "./events.service";

@Controller("api/agents/:id/sessions/:sessionId")
export class EventsController {
	constructor(private readonly events: EventsService) {}

	@Get("events")
	async getEvents(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	): Promise<EventsResponse> {
		const agentPath = decodeURIComponent(id);
		return this.events.getEvents(agentPath, sessionId);
	}
}
