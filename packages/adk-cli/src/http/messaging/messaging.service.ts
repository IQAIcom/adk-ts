import { Inject, Injectable } from "@nestjs/common";
import type {
	LoadedAgent,
	MessageRequest,
	MessageResponse,
	MessagesResponse,
} from "../../common/types";
import { AgentManager } from "../providers/agent-manager.service";
import { SessionsService } from "../sessions/sessions.service";

@Injectable()
export class MessagingService {
	constructor(
		@Inject(AgentManager) private readonly agentManager: AgentManager,
		@Inject(SessionsService) private readonly sessionsService: SessionsService,
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
		return { response: responseText };
	}
}
