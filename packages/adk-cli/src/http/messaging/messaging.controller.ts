import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import {
	ApiBody,
	ApiOkResponse,
	ApiOperation,
	ApiParam,
	ApiTags,
} from "@nestjs/swagger";
import {
	MessageRequest,
	MessageResponse,
	MessagesResponse,
} from "../../common/types";
import { MessageResponseDto, MessagesResponseDto } from "../dto/api.dto";
import { MessagingService } from "./messaging.service";

@ApiTags("messaging")
@Controller("api/agents/:id")
export class MessagingController {
	constructor(
		@Inject(MessagingService)
		private readonly messaging: MessagingService,
	) {}

	@Get("messages")
	@ApiOperation({
		summary: "Get message history",
		description:
			"Returns ordered chat transcript for the agent, including user and assistant messages.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiOkResponse({ type: MessagesResponseDto })
	async getAgentMessages(@Param("id") id: string): Promise<MessagesResponse> {
		const agentPath = decodeURIComponent(id);
		return this.messaging.getMessages(agentPath);
	}

	@Post("message")
	@ApiOperation({
		summary: "Send a message to the agent",
		description:
			"Adds a user message (with optional base64 attachments) and returns the assistant response.",
	})
	@ApiParam({ name: "id", description: "Agent identifier" })
	@ApiBody({
		description: "Message payload",
		schema: {
			example: {
				message: "Hello agent!",
				attachments: [
					{
						name: "notes.txt",
						mimeType: "text/plain",
						data: "YmFzZTY0IGRhdGE=",
					},
				],
			},
		},
	})
	@ApiOkResponse({ type: MessageResponseDto })
	async postAgentMessage(
		@Param("id") id: string,
		@Body() body: MessageRequest,
	): Promise<MessageResponse> {
		const agentPath = decodeURIComponent(id);
		return this.messaging.postMessage(agentPath, body);
	}
}
