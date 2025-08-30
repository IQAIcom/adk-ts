import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type {
	MessageRequest,
	MessageResponse,
	MessagesResponse,
} from "../../../common/types";
import type { MessagingService } from "./messaging.service";

@Controller("api/agents/:id")
export class MessagingController {
	constructor(private readonly messaging: MessagingService) {}

	@Get("messages")
	async getAgentMessages(@Param("id") id: string): Promise<MessagesResponse> {
		const agentPath = decodeURIComponent(id);
		return this.messaging.getMessages(agentPath);
	}

	@Post("message")
	async postAgentMessage(
		@Param("id") id: string,
		@Body() body: MessageRequest,
	): Promise<MessageResponse> {
		const agentPath = decodeURIComponent(id);
		return this.messaging.postMessage(agentPath, body);
	}
}
