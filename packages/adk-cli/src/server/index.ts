import { type ServerType, serve } from "@hono/node-server";
import { InMemorySessionService } from "@iqai/adk";
import { Hono } from "hono";
import { Logger } from "./logger.js";
import { setupRoutes } from "./routes/index.js";
import { AgentManager, SessionManager } from "./services/index.js";
import type { ServerConfig } from "./types.js";

// Constants
const DEFAULT_PORT = 8042;
const DEFAULT_HOST = "localhost";
const SERVER_STARTUP_DELAY_MS = 100;

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
		port = DEFAULT_PORT,
		host = DEFAULT_HOST,
		quiet = false,
	) {
		this.config = { agentsDir, port, host, quiet };
		this.logger = new Logger({ name: "adk-server", quiet });
		this.sessionService = new InMemorySessionService();
		this.agentManager = new AgentManager(this.sessionService, quiet);
		this.sessionManager = new SessionManager(this.sessionService, quiet);
		this.app = new Hono();

		// Setup routes
		setupRoutes(
			this.app,
			this.agentManager,
			this.sessionManager,
			agentsDir,
			quiet,
		);

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
			}, SERVER_STARTUP_DELAY_MS);
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
