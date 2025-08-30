import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import type { StateResponse, StateUpdateRequest } from "../../../common/types";
import type { StateService } from "./state.service";

@Controller("api/agents/:id/sessions/:sessionId")
export class StateController {
	constructor(private readonly state: StateService) {}

	@Get("state")
	async getState(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	): Promise<StateResponse> {
		const agentPath = decodeURIComponent(id);
		return this.state.getState(agentPath, sessionId);
	}

	@Put("state")
	async updateState(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
		@Body() request: StateUpdateRequest,
	) {
		const agentPath = decodeURIComponent(id);
		return this.state.updateState(
			agentPath,
			sessionId,
			request.path,
			request.value,
		);
	}
}
