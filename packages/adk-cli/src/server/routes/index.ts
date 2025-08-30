import type { Hono } from "hono";
import { cors } from "hono/cors";
import type { AgentManager, SessionManager } from "../services/index.js";
import { setupAgentRoutes } from "./agent-routes.js";
import { setupHealthRoutes } from "./health-routes.js";
import { setupSessionRoutes } from "./session-routes.js";

export function setupRoutes(
	app: Hono,
	agentManager: AgentManager,
	sessionManager: SessionManager,
	agentsDir: string,
	quiet = false,
): void {
	// CORS middleware
	app.use("/*", cors());

	// Setup route modules
	setupHealthRoutes(app);
	setupAgentRoutes(app, agentManager, sessionManager, agentsDir, quiet);
	setupSessionRoutes(app, agentManager, sessionManager, quiet);
}
