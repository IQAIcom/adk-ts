import { Inject, Injectable } from "@nestjs/common";
import type { StateResponse } from "../../common/types";
import { SessionsService } from "../sessions/sessions.service";

@Injectable()
export class StateService {
	constructor(
		@Inject(SessionsService) private readonly sessionsService: SessionsService,
	) {}

	async getState(agentPath: string, sessionId: string): Promise<StateResponse> {
		const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
		if (!loaded) {
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
		return this.sessionsService.getSessionState(loaded, sessionId);
	}

	async updateState(
		agentPath: string,
		sessionId: string,
		path: string,
		value: unknown,
	) {
		const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
		if (!loaded) {
			return { error: "Failed to load agent" } as any;
		}
		await this.sessionsService.updateSessionState(
			loaded,
			sessionId,
			path,
			value as any,
		);
		return { success: true };
	}
}
