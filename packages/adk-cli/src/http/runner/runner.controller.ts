import { Body, Controller, Inject, Post, Res } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { EventsResponseDto } from "../dto/api.dto";
import { RunnerService } from "./runner.service";

interface RunRequest {
	appName: string;
	userId: string;
	sessionId: string;
	newMessage: any;
	streaming?: boolean;
}

@ApiTags("runner")
@Controller()
export class RunnerController {
	constructor(
		@Inject(RunnerService)
		private readonly runnerService: RunnerService,
	) {}

	@Post("run")
	@ApiOperation({
		summary: "Execute agent and return all events",
		description:
			"Runs the agent with the provided message and returns all generated events at once.",
	})
	@ApiBody({
		description: "Run request with agent, session, and message details",
		schema: {
			example: {
				appName: "my-agent",
				userId: "user123",
				sessionId: "session456",
				newMessage: { parts: [{ text: "Hello!" }] },
			},
		},
	})
	@ApiOkResponse({ type: EventsResponseDto })
	async run(@Body() body: RunRequest) {
		return this.runnerService.run(body);
	}

	@Post("run_sse")
	@ApiOperation({
		summary: "Execute agent with Server-Sent Events streaming",
		description:
			"Runs the agent and streams events back via SSE for real-time updates.",
	})
	@ApiBody({
		description: "Run request with optional streaming flag",
		schema: {
			example: {
				appName: "my-agent",
				userId: "user123",
				sessionId: "session456",
				newMessage: { parts: [{ text: "Hello!" }] },
				streaming: true,
			},
		},
	})
	async runSSE(@Body() body: RunRequest, @Res() res: Response) {
		return this.runnerService.runSSE(body, res);
	}
}
