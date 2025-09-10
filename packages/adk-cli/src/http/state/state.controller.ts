import { Body, Controller, Get, Inject, Param, Put } from "@nestjs/common";
import {
	ApiBody,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags,
} from "@nestjs/swagger";
import { StateResponse, StateUpdateRequest } from "../../common/types";
import { StateResponseDto, SuccessResponseDto } from "../dto/api.dto";
import { StateService } from "./state.service";

@ApiTags("state")
@Controller("api/agents/:id/sessions/:sessionId")
export class StateController {
	constructor(
		@Inject(StateService)
		private readonly state: StateService,
	) {}

	@Get("state")
	@ApiOperation({
		summary: "Get current session state",
		description:
			"Retrieves combined agent, user, and session state along with metadata such as last update time and size metrics.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiParam({ name: "sessionId", description: "Session identifier" })
	@ApiOkResponse({ type: StateResponseDto })
	async getState(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	): Promise<StateResponse> {
		const agentPath = decodeURIComponent(id);
		return this.state.getState(agentPath, sessionId);
	}

	@Put("state")
	@ApiOperation({
		summary: "Update a state path",
		description:
			"Updates a nested state value for the session given a dot/JSON path and value payload.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiParam({ name: "sessionId", description: "Session identifier" })
	@ApiBody({
		description: "State update payload specifying path and new value",
		schema: { example: { path: "user.preferences.theme", value: "dark" } },
	})
	@ApiOkResponse({ type: SuccessResponseDto })
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
