import {
	Event,
	InMemorySessionService,
	RunConfig,
	StreamingMode,
} from "@iqai/adk";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";
import { AgentManager } from "../providers/agent-manager.service";

interface RunRequest {
	appName: string;
	userId: string;
	sessionId: string;
	newMessage: any;
	streaming?: boolean;
}

@Injectable()
export class RunnerService {
	private logger: Logger;

	constructor(
		@Inject(AgentManager) private readonly agentManager: AgentManager,
		@Inject(InMemorySessionService)
		private readonly sessionService: InMemorySessionService,
	) {
		this.logger = new Logger("runner-service");
	}

	/**
	 * Execute agent and return all events at once
	 */
	async run(
		body: RunRequest,
	): Promise<{ events: Event[] } | { error: string }> {
		const { appName, userId, sessionId, newMessage } = body;

		try {
			// Verify session exists
			const session = await this.sessionService.getSession(
				appName,
				userId,
				sessionId,
			);

			if (!session) {
				return { error: `Session not found: ${sessionId}` };
			}

			// Get the loaded agent
			const loaded = this.agentManager.getLoadedAgents().get(appName);
			if (!loaded) {
				return { error: `Agent not loaded: ${appName}` };
			}

			// Run the agent and collect all events
			const events: Event[] = [];
			for await (const event of loaded.runner.runAsync({
				userId,
				sessionId,
				newMessage,
			})) {
				events.push(event);
			}

			return { events };
		} catch (error) {
			this.logger.error("Error running agent: %o", error);
			return { error: (error as Error).message };
		}
	}

	/**
	 * Execute agent with Server-Sent Events streaming
	 */
	async runSSE(body: RunRequest, res: Response): Promise<void> {
		const { appName, userId, sessionId, newMessage, streaming } = body;

		try {
			// Verify session exists
			const session = await this.sessionService.getSession(
				appName,
				userId,
				sessionId,
			);

			if (!session) {
				res.status(404).json({ error: `Session not found: ${sessionId}` });
				return;
			}

			// Get the loaded agent
			const loaded = this.agentManager.getLoadedAgents().get(appName);
			if (!loaded) {
				res.status(404).json({ error: `Agent not loaded: ${appName}` });
				return;
			}

			// Set up SSE headers
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Connection", "keep-alive");
			res.flushHeaders();

			// Stream events
			for await (const event of loaded.runner.runAsync({
				userId,
				sessionId,
				newMessage,
				runConfig: new RunConfig({
					streamingMode: streaming ? StreamingMode.SSE : StreamingMode.NONE,
				}),
			})) {
				res.write(`data: ${JSON.stringify(event)}\n\n`);
			}

			res.end();
		} catch (error) {
			this.logger.error("Error running agent with SSE: %o", error);
			if (res.headersSent) {
				res.end(
					`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`,
				);
			} else {
				res.status(500).json({ error: (error as Error).message });
			}
		}
	}
}
