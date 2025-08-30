import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import type {
	CreateSessionRequest,
	SessionsResponse,
} from "../../../common/types";
import type { SessionsService } from "./sessions.service";

@Controller("api/agents/:id/sessions")
export class SessionsController {
	constructor(private readonly sessions: SessionsService) {}

	@Get()
	async listSessions(@Param("id") id: string): Promise<SessionsResponse> {
		const agentPath = decodeURIComponent(id);
		return this.sessions.listSessions(agentPath);
	}

	@Post()
	async createSession(
		@Param("id") id: string,
		@Body() request: CreateSessionRequest,
	) {
		const agentPath = decodeURIComponent(id);
		return this.sessions.createSession(agentPath, request);
	}

	@Delete(":sessionId")
	async deleteSession(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.sessions.deleteSession(agentPath, sessionId);
	}

	@Post(":sessionId/switch")
	async switchSession(
		@Param("id") id: string,
		@Param("sessionId") sessionId: string,
	) {
		const agentPath = decodeURIComponent(id);
		return this.sessions.switchSession(agentPath, sessionId);
	}
}
