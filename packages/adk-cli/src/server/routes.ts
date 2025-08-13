import type { Hono } from "hono";
import { cors } from "hono/cors";
import type { AgentManager, SessionManager } from "./services.js";
import type {
	AgentListResponse,
	MessageRequest,
	MessageResponse,
	MessagesResponse,
} from "./types.js";

export function setupRoutes(
	app: Hono,
	agentManager: AgentManager,
	sessionManager: SessionManager,
	agentsDir: string,
): void {
	// CORS middleware
	app.use("/*", cors());

	// Health check
	app.get("/health", (c) => c.json({ status: "ok" }));

	// List agents
	app.get("/api/agents", (c) => {
		const agentsList: AgentListResponse[] = Array.from(
			agentManager.getAgents().values(),
		).map((agent) => ({
			path: agent.absolutePath,
			name: agent.name,
			directory: agent.absolutePath,
			relativePath: agent.relativePath,
		}));
		return c.json({ agents: agentsList });
	});

	// Refresh agents list
	app.post("/api/agents/refresh", (c) => {
		agentManager.scanAgents(agentsDir);
		const agentsList: AgentListResponse[] = Array.from(
			agentManager.getAgents().values(),
		).map((agent) => ({
			path: agent.absolutePath,
			name: agent.name,
			directory: agent.absolutePath,
			relativePath: agent.relativePath,
		}));
		return c.json({ agents: agentsList });
	});

	// Get agent messages
	app.get("/api/agents/:id/messages", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const loadedAgent = agentManager.getLoadedAgents().get(agentPath);
		if (!loadedAgent) {
			return c.json({ messages: [] });
		}

		const messages = await sessionManager.getSessionMessages(loadedAgent);
		const response: MessagesResponse = { messages };
		return c.json(response);
	});

	// Send message to agent
	app.post("/api/agents/:id/message", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const { message }: MessageRequest = await c.req.json();
		const response = await agentManager.sendMessageToAgent(agentPath, message);
		const messageResponse: MessageResponse = { response };
		return c.json(messageResponse);
	});
}
