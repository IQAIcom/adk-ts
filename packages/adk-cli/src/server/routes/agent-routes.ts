import type { Hono } from "hono";
import { Logger } from "../logger.js";
import type { AgentManager, SessionManager } from "../services/index.js";
import type {
	AgentListResponse,
	MessageRequest,
	MessageResponse,
	MessagesResponse,
} from "../types.js";

/**
 * Helper function to map agents to response format
 */
function mapAgentsToResponse(agents: Map<string, any>): AgentListResponse[] {
	return Array.from(agents.values()).map((agent) => ({
		path: agent.absolutePath,
		name: agent.name,
		directory: agent.absolutePath,
		relativePath: agent.relativePath,
	}));
}

/**
 * Helper function to create empty collection responses
 */
function createEmptyMessagesResponse() {
	return { messages: [] };
}

export function setupAgentRoutes(
	app: Hono,
	agentManager: AgentManager,
	sessionManager: SessionManager,
	agentsDir: string,
	quiet = false,
): void {
	const logger = new Logger({ name: "agent-routes", quiet });

	// List agents
	app.get("/api/agents", (c) => {
		const agentsList = mapAgentsToResponse(agentManager.getAgents());
		return c.json({ agents: agentsList });
	});

	// Refresh agents list
	app.post("/api/agents/refresh", (c) => {
		agentManager.scanAgents(agentsDir);
		const agentsList = mapAgentsToResponse(agentManager.getAgents());
		return c.json({ agents: agentsList });
	});

	// Get agent messages
	app.get("/api/agents/:id/messages", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const loadedAgent = agentManager.getLoadedAgents().get(agentPath);
		if (!loadedAgent) {
			return c.json(createEmptyMessagesResponse());
		}

		const messages = await sessionManager.getSessionMessages(loadedAgent);
		const response: MessagesResponse = { messages };
		return c.json(response);
	});

	// Send message to agent
	app.post("/api/agents/:id/message", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const { message, attachments }: MessageRequest = await c.req.json();
		const response = await agentManager.sendMessageToAgent(
			agentPath,
			message,
			attachments,
		);
		const messageResponse: MessageResponse = { response };
		return c.json(messageResponse);
	});
}
