import { type ServerType, serve } from "@hono/node-server";
import { InMemorySessionService } from "@iqai/adk";
import { Hono } from "hono";
import { Logger } from "./logger.js";
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
	private logger: Logger;

	constructor(
		agentsDir: string,
		port = 8042,
		host = "localhost",
		quiet = false,
	) {
		this.config = { agentsDir, port, host, quiet };
		this.logger = new Logger({ name: "adk-server", quiet });
		this.sessionService = new InMemorySessionService();
		this.agentManager = new AgentManager(this.sessionService, quiet);
		this.sessionManager = new SessionManager(this.sessionService, quiet);
		this.app = new Hono();

		// Setup routes
		setupRoutes(this.app, this.agentManager, this.sessionManager, agentsDir);

		// Initial agent scan
		this.logger.info(`Starting agent scan in ${agentsDir} ✨`);
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
				this.logger.info(
					`Server listening on http://${this.config.host}:${this.config.port} 🚀`,
				);
				resolve();
			}, 100);
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve) => {
			this.logger.info("Stopping server and all agents... 🛑");
			// Stop all running agents
			this.agentManager.stopAllAgents();

			if (this.server) {
				this.server.close();
			}
			this.logger.info("Server stopped");
			resolve();
		});
	}

	getPort(): number {
		return this.config.port;
	}
}
