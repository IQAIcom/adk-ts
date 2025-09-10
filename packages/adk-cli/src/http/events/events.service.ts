import { Inject, Injectable } from "@nestjs/common";
import type { EventsResponse } from "../../common/types";
import { SessionsService } from "../sessions/sessions.service";

@Injectable()
export class EventsService {
	constructor(
		@Inject(SessionsService) private readonly sessionsService: SessionsService,
	) {}

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
}
