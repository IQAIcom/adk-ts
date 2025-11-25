import { Inject, Injectable, Optional } from "@nestjs/common";
import type {
	MessageRequest,
	MessageResponse,
	MessagesResponse,
} from "../../common/types";
import { AgentManager } from "../providers/agent-manager.service";
import { SessionsService } from "../sessions/sessions.service";
import { HotReloadService } from "../reload/hot-reload.service";

@Injectable()
export class MessagingService {
	constructor(
		@Inject(AgentManager) private readonly agentManager: AgentManager,
		@Inject(SessionsService) private readonly sessionsService: SessionsService,
		@Optional()
		@Inject(HotReloadService)
		private readonly hotReload?: HotReloadService,
	) {}

	async getMessages(agentPath: string): Promise<MessagesResponse> {
		const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
		if (!loaded) {
			return { messages: [] };
		}
		const messages = await this.sessionsService.getSessionMessages(loaded);
		return { messages };
	}

	async postMessage(
		agentPath: string,
		body: MessageRequest,
	): Promise<MessageResponse> {
		const { message, attachments } = body || { message: "", attachments: [] };
		const responseText = await this.agentManager.sendMessageToAgent(
			agentPath,
			message,
			attachments,
		);

		// After run completes, broadcast potential state change for this agent/session
		try {
			const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
			if (loaded) {
				this.hotReload?.broadcastState(agentPath, loaded.sessionId);
			}
		} catch {}

		// Determine the producing agent by inspecting the latest session events
		let agentName = agentPath;
		try {
			const loaded = await this.sessionsService.ensureAgentLoaded(agentPath);
			if (loaded) {
				const eventsResp = await this.sessionsService.getSessionEvents(
					loaded,
					loaded.sessionId,
				);
				const events = eventsResp.events || [];
				// Prefer the last event marked as final response from a non-user author
				const lastFinal = [...events]
					.reverse()
					.find((e) => e.author !== "user" && e.isFinalResponse);
				const lastAssistant =
					lastFinal ?? [...events].reverse().find((e) => e.author !== "user");
				agentName = lastAssistant?.author ?? loaded.agent?.name ?? agentPath;
			}
		} catch {
			// Best-effort only; fall back to path
		}
		return { response: responseText, agentName };
	}
}
