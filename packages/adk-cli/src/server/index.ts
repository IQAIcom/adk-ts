import { type ServerType, serve } from "@hono/node-server";
import { InMemorySessionService } from "@iqai/adk";
import { Hono } from "hono";
import { setupRoutes } from "./routes.js";
import { AgentManager, SessionManager } from "./services.js";
import type { ServerConfig } from "./types.js";

export class ADKServer {
	private agentManager: AgentManager;
	private sessionManager: SessionManager;
	private sessionService: InMemorySessionService;
	private app: Hono;
	private server: ServerType | undefined;
	private config: ServerConfig;

	constructor(
		agentsDir: string,
		port = 8042,
		host = "localhost",
		quiet = false,
	) {
		this.config = { agentsDir, port, host, quiet };
		this.sessionService = new InMemorySessionService();
		this.agentManager = new AgentManager(this.sessionService, quiet);
		this.sessionManager = new SessionManager(this.sessionService);
		this.app = new Hono();

		// Setup routes
		setupRoutes(this.app, this.agentManager, this.sessionManager, agentsDir);

		// Initial agent scan
		this.agentManager.scanAgents(agentsDir);
	}

	async start(): Promise<void> {
		return new Promise((resolve) => {
			this.server = serve({
				fetch: this.app.fetch,
				port: this.config.port,
				hostname: this.config.host,
			});

			// Give the server a moment to start
			setTimeout(() => {
				resolve();
			}, 100);
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve) => {
			// Stop all running agents
			this.agentManager.stopAllAgents();

			if (this.server) {
				this.server.close();
			}
			resolve();
		});
	}

	getPort(): number {
		return this.config.port;
	}
}
