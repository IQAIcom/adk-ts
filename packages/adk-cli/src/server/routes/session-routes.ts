import type { Hono } from "hono";
import { Logger } from "../logger.js";
import type { AgentManager, SessionManager } from "../services/index.js";
import type {
	CreateSessionRequest,
	LoadedAgent,
	StateUpdateRequest,
} from "../types.js";

/**
 * Helper function to ensure an agent is loaded
 */
async function ensureAgentLoaded(
	agentManager: AgentManager,
	agentPath: string,
	logger: Logger,
): Promise<LoadedAgent | null> {
	// Try to load the agent if it's not already loaded
	if (!agentManager.getLoadedAgents().has(agentPath)) {
		logger.info("Agent not loaded, trying to start it: %s", agentPath);
		try {
			await agentManager.startAgent(agentPath);
			logger.info("Agent started successfully: %s", agentPath);
		} catch (error) {
			logger.error("Failed to start agent: %s - %o", agentPath, error);
			return null;
		}
	}

	const loadedAgent = agentManager.getLoadedAgents().get(agentPath);
	if (!loadedAgent) {
		logger.warn("Agent still not loaded after starting: %s", agentPath);
		return null;
	}

	return loadedAgent;
}

/**
 * Helper function to create standardized error responses
 */
function createErrorResponse(c: any, message: string, statusCode = 500) {
	return c.json({ error: message }, statusCode);
}

/**
 * Helper function to create empty collection responses
 */
function createEmptyResponse(type: "sessions" | "events") {
	switch (type) {
		case "sessions":
			return { sessions: [] };
		case "events":
			return { events: [], totalCount: 0 };
	}
}

export function setupSessionRoutes(
	app: Hono,
	agentManager: AgentManager,
	sessionManager: SessionManager,
	quiet = false,
): void {
	const logger = new Logger({ name: "session-routes", quiet });

	// Get sessions for agent
	app.get("/api/agents/:id/sessions", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		logger.info("Getting sessions for agent path: %s", agentPath);
		logger.debug(
			"Available loaded agents: %o",
			Array.from(agentManager.getLoadedAgents().keys()),
		);

		const loadedAgent = await ensureAgentLoaded(
			agentManager,
			agentPath,
			logger,
		);
		if (!loadedAgent) {
			return c.json(createEmptyResponse("sessions"));
		}

		logger.info("Fetching sessions for loaded agent: %s", agentPath);
		const sessions = await sessionManager.getAgentSessions(loadedAgent);
		logger.info("Returning sessions: %d", sessions.sessions.length);
		return c.json(sessions);
	});

	// Create new session for agent
	app.post("/api/agents/:id/sessions", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const request: CreateSessionRequest = await c.req.json();
		logger.info("Creating session for agent path: %s", agentPath);

		const loadedAgent = await ensureAgentLoaded(
			agentManager,
			agentPath,
			logger,
		);
		if (!loadedAgent) {
			return createErrorResponse(c, "Failed to load agent", 404);
		}

		try {
			logger.info("Creating session for agent: %s", agentPath);
			const newSession = await sessionManager.createAgentSession(
				loadedAgent,
				request,
			);
			logger.info("Session created successfully: %s", newSession.id);
			return c.json(newSession);
		} catch (error) {
			logger.error("Error creating session: %o", error);
			return createErrorResponse(c, "Failed to create session", 500);
		}
	});

	// Delete session for agent
	app.delete("/api/agents/:id/sessions/:sessionId", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const sessionId = c.req.param("sessionId");

		const loadedAgent = await ensureAgentLoaded(
			agentManager,
			agentPath,
			logger,
		);
		if (!loadedAgent) {
			return createErrorResponse(c, "Failed to load agent", 404);
		}

		try {
			await sessionManager.deleteAgentSession(loadedAgent, sessionId);
			return c.json({ success: true });
		} catch (error) {
			logger.error("Error deleting session: %o", error);
			return createErrorResponse(c, "Failed to delete session", 500);
		}
	});

	// Switch agent to different session
	app.post("/api/agents/:id/sessions/:sessionId/switch", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const sessionId = c.req.param("sessionId");

		const loadedAgent = await ensureAgentLoaded(
			agentManager,
			agentPath,
			logger,
		);
		if (!loadedAgent) {
			return createErrorResponse(c, "Failed to load agent", 404);
		}

		try {
			await sessionManager.switchAgentSession(loadedAgent, sessionId);
			return c.json({ success: true });
		} catch (error) {
			logger.error("Error switching session: %o", error);
			return createErrorResponse(c, "Failed to switch session", 500);
		}
	});

	// Get events for specific session
	app.get("/api/agents/:id/sessions/:sessionId/events", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const sessionId = c.req.param("sessionId");

		const loadedAgent = await ensureAgentLoaded(
			agentManager,
			agentPath,
			logger,
		);
		if (!loadedAgent) {
			return c.json(createEmptyResponse("events"));
		}

		const events = await sessionManager.getSessionEvents(
			loadedAgent,
			sessionId,
		);
		return c.json(events);
	});

	// Get state for specific session
	app.get("/api/agents/:id/sessions/:sessionId/state", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const sessionId = c.req.param("sessionId");

		const loadedAgent = await ensureAgentLoaded(
			agentManager,
			agentPath,
			logger,
		);
		if (!loadedAgent) {
			return createErrorResponse(c, "Failed to load agent", 404);
		}

		const state = await sessionManager.getSessionState(loadedAgent, sessionId);
		return c.json(state);
	});

	// Update session state
	app.put("/api/agents/:id/sessions/:sessionId/state", async (c) => {
		const agentPath = decodeURIComponent(c.req.param("id"));
		const sessionId = c.req.param("sessionId");
		const request: StateUpdateRequest = await c.req.json();

		const loadedAgent = await ensureAgentLoaded(
			agentManager,
			agentPath,
			logger,
		);
		if (!loadedAgent) {
			return createErrorResponse(c, "Failed to load agent", 404);
		}

		try {
			await sessionManager.updateSessionState(
				loadedAgent,
				sessionId,
				request.path,
				request.value,
			);
			return c.json({ success: true });
		} catch (error) {
			logger.error("Error updating session state: %o", error);
			return createErrorResponse(c, "Failed to update state", 500);
		}
	});
}
