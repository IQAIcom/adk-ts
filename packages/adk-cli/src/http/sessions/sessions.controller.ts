import {
	Body,
	Controller,
	Delete,
	Get,
	Inject,
	Param,
	Post,
} from "@nestjs/common";
import {
	ApiBody,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags,
} from "@nestjs/swagger";
import { CreateSessionRequest, SessionsResponse } from "../../common/types";
import {
	SessionResponseDto,
	SessionsResponseDto,
	SuccessResponseDto,
} from "../dto/api.dto";
import { SessionsService } from "./sessions.service";

@ApiTags("sessions")
@Controller("api/agents/:id/sessions")
export class SessionsController {
	constructor(
		@Inject(SessionsService)
		private readonly sessions: SessionsService,
	) {}

	@Get()
	@ApiOperation({
		summary: "List sessions for an agent",
		description:
			"Returns all active sessions for the specified agent including metadata.",
	})
	@ApiParam({
		name: "id",
		description: "URL-encoded absolute agent path or identifier",
	})
	@ApiOkResponse({ type: SessionsResponseDto })
	async listSessions(@Param("id") id: string): Promise<SessionsResponse> {
		const agentPath = decodeURIComponent(id);
		return this.sessions.listSessions(agentPath);
	}

	@Post()
	@ApiOperation({
		summary: "Create a new session",
		description:
			"Creates a session for the agent. Optional state and custom sessionId may be provided.",
	})
	@ApiParam({
		name: "id",
		description: "URL-encoded absolute agent path or identifier",
	})
	@ApiBody({
		description: "Initial session creation payload with optional state",
		schema: { example: { state: { foo: "bar" }, sessionId: "custom-id-123" } },
	})
	@ApiOkResponse({ type: SessionResponseDto })
	async createSession(
		@Param("id") id: string,
		@Body() request: CreateSessionRequest,
	) {
		const agentPath = decodeURIComponent(id);
		return this.sessions.createSession(agentPath, request);
	}

	@Delete(":sessionId")
	@ApiOperation({
		summary: "Delete a session",
		description: "Stops and removes the session if it exists.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiParam({ name: "sessionId", description: "Session to delete" })
	@ApiOkResponse({ type: SuccessResponseDto })
	async deleteSession(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.sessions.deleteSession(agentPath, sessionId);
	}

	@Post(":sessionId/switch")
	@ApiOperation({
		summary: "Switch active session",
		description:
			"Marks the specified session as active (implementation specific).",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiParam({ name: "sessionId", description: "Session to switch to" })
	@ApiOkResponse({ type: SuccessResponseDto })
	async switchSession(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.sessions.switchSession(agentPath, sessionId);
	}
}
