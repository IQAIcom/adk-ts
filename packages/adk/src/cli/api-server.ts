import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import * as chokidar from "chokidar";
import type { BaseAgent } from "../agents/base-agent";
import { LlmAgent } from "../agents/llm-agent";
import { BaseToolset } from "../tools/base/base-toolset";
import { RunConfig, StreamingMode } from "../agents/run-config";
import { InMemoryArtifactService } from "../artifacts/in-memory-artifact-service";
import { InMemoryMemoryService } from "../memory/in-memory-memory-service";
import { createDatabaseSessionService } from "../sessions/database-factories";
import { InMemorySessionService } from "../sessions/in-memory-session-service";
import { Runner } from "../runners";
import type { Content } from "@google/genai";
import type { DatabaseSessionService } from "../sessions";
import { loadDotenvForAgent } from "./utils";

// Fix for the Event type conflict - import directly from events directory
import type { Event as RunnerEvent } from "../events/Event";

// Import agent_graph
import * as agentGraph from "./agent-graph";

// Interface definitions to replace Pydantic models
interface AgentRunRequest {
	appName: string;
	userId: string;
	sessionId: string;
	newMessage: Content;
	streaming: boolean;
}

interface ApiServerOptions {
	agentDir: string;
	sessionDbUrl?: string;
	allowOrigins?: string[];
	web: boolean;
	traceToCloud?: boolean;
	port?: number;
	reload?: boolean;
}

// Interface for OpenTelemetry-like span structure
interface ReadableSpan {
	name: string;
	context: {
		traceId: number;
		spanId: number;
	};
	startTime: number;
	endTime: number;
	attributes: Record<string, any>;
	parent?: {
		spanId: number;
	};
}

// In-memory span exporter class
class InMemoryExporter {
	private spans: ReadableSpan[] = [];
	private traceDict: Record<string, number[]>;

	constructor(traceDict: Record<string, number[]>) {
		this.traceDict = traceDict;
	}

	export(spans: ReadableSpan[]): boolean {
		for (const span of spans) {
			const traceId = span.context.traceId;
			if (span.name === "call_llm") {
				const attributes = span.attributes;
				const sessionId = attributes["gcp.vertex.agent.session_id"];
				if (sessionId) {
					if (!this.traceDict[sessionId]) {
						this.traceDict[sessionId] = [traceId];
					} else {
						this.traceDict[sessionId].push(traceId);
					}
				}
			}
		}
		this.spans.push(...spans);
		return true;
	}

	getFinishedSpans(sessionId: string): ReadableSpan[] {
		const traceIds = this.traceDict[sessionId];
		if (!traceIds || traceIds.length === 0) {
			return [];
		}
		return this.spans.filter((span) => traceIds.includes(span.context.traceId));
	}

	forceFlush(timeoutMillis = 30000): boolean {
		return true;
	}

	clear(): void {
		this.spans.length = 0;
	}
}

/**
 * Creates an Express app that serves as an API server for agents
 *
 * @param options Configuration options for the server
 * @returns The configured Express app and server
 */
export function createApiServer(options: ApiServerOptions): {
	app: express.Application;
	server: http.Server;
} {
	const {
		agentDir,
		sessionDbUrl = "",
		allowOrigins = ["*"],
		web = false,
		traceToCloud = false,
		port = 8000,
		reload = true,
	} = options;

	// Trace dictionary for storing trace information
	const traceDict: Record<string, any> = {};
	const sessionTraceDict: Record<string, number[]> = {};

	const memoryExporter = new InMemoryExporter(sessionTraceDict);

	const app = express();
	const server = http.createServer(app);
	const io = new SocketIOServer(server, {
		cors: {
			origin: allowOrigins,
			methods: ["GET", "POST"],
			credentials: true,
		},
	});

	app.use(express.json());
	app.use(
		cors({
			origin: allowOrigins,
			credentials: true,
		}),
	);

	// Add the agent directory to the module search path
	if (!process.env.NODE_PATH?.includes(agentDir)) {
		process.env.NODE_PATH =
			(process.env.NODE_PATH || "") + path.delimiter + agentDir;
		// Force Node.js to reload the module paths
		require("node:module").Module._initPaths();
	}

	// Initialize services
	const runnerDict: Record<string, Runner> = {};
	const rootAgentDict: Record<string, BaseAgent> = {};
	const toolsetsToClose: Set<BaseToolset> = new Set();

	// Build the Artifact service
	const artifactService = new InMemoryArtifactService();
	const memoryService = new InMemoryMemoryService();

	// Build the Session service
	const agentEngineId = "";
	let sessionService: DatabaseSessionService | InMemorySessionService;

	if (sessionDbUrl) {
		if (sessionDbUrl.startsWith("agentengine://")) {
			// TODO: Implement VertexAI session service for TypeScript version
			throw new Error(
				"VertexAI session service not implemented in TypeScript version yet",
			);
		}
		sessionService = createDatabaseSessionService(sessionDbUrl);
	} else {
		sessionService = new InMemorySessionService();
	}

	// Helper function to collect all toolsets from an agent tree
	function getAllToolsets(agent: BaseAgent): Set<BaseToolset> {
		const toolsets = new Set<BaseToolset>();
		if (agent instanceof LlmAgent) {
			for (const toolUnion of agent.tools) {
				if (toolUnion instanceof BaseToolset) {
					toolsets.add(toolUnion);
				}
			}
		}
		for (const subAgent of agent.subAgents) {
			const subToolsets = getAllToolsets(subAgent);
			subToolsets.forEach((toolset) => toolsets.add(toolset));
		}
		return toolsets;
	}

	// Define API endpoints
	app.get("/list-apps", (req: express.Request, res: express.Response) => {
		const basePath = path.resolve(agentDir);
		if (!fs.existsSync(basePath)) {
			return res.status(404).json({ error: "Path not found" });
		}
		if (!fs.statSync(basePath).isDirectory()) {
			return res.status(400).json({ error: "Not a directory" });
		}

		const agentNames = fs
			.readdirSync(basePath)
			.filter((x) => {
				const fullPath = path.join(basePath, x);
				return (
					fs.statSync(fullPath).isDirectory() &&
					!x.startsWith(".") &&
					x !== "node_modules"
				);
			})
			.sort();

		res.json(agentNames);
	});

	app.get(
		"/debug/trace/:eventId",
		(req: express.Request, res: express.Response) => {
			const { eventId } = req.params;
			const eventDict = traceDict[eventId];
			if (!eventDict) {
				return res.status(404).json({ error: "Trace not found" });
			}
			res.json(eventDict);
		},
	);

	app.get(
		"/debug/trace/session/:sessionId",
		(req: express.Request, res: express.Response) => {
			const { sessionId } = req.params;
			const spans = memoryExporter.getFinishedSpans(sessionId);
			if (!spans || spans.length === 0) {
				return res.json([]);
			}

			const result = spans.map((span) => ({
				name: span.name,
				span_id: span.context.spanId,
				trace_id: span.context.traceId,
				start_time: span.startTime,
				end_time: span.endTime,
				attributes: span.attributes,
				parent_span_id: span.parent?.spanId || null,
			}));

			res.json(result);
		},
	);

	// Session management endpoints
	app.get(
		"/apps/:appName/users/:userId/sessions/:sessionId",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId, sessionId } = req.params;
			// Connect to managed session if agent_engine_id is set
			const effectiveAppName = agentEngineId || appName;

			const session = await sessionService.getSession(
				effectiveAppName,
				userId,
				sessionId,
			);

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			res.json(session);
		},
	);

	app.get(
		"/apps/:appName/users/:userId/sessions",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId } = req.params;
			// Connect to managed session if agent_engine_id is set
			const effectiveAppName = agentEngineId || appName;

			const sessionsList = await sessionService.listSessions(
				effectiveAppName,
				userId,
			);

			const sessions = sessionsList.sessions;

			res.json(sessions);
		},
	);

	app.post(
		"/apps/:appName/users/:userId/sessions/:sessionId",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId, sessionId } = req.params;
			const { state } = req.body;
			// Connect to managed session if agent_engine_id is set
			const effectiveAppName = agentEngineId || appName;

			const existingSession = await sessionService.getSession(
				effectiveAppName,
				userId,
				sessionId,
			);

			if (existingSession) {
				console.warn(`Session already exists: ${sessionId}`);
				return res
					.status(400)
					.json({ error: `Session already exists: ${sessionId}` });
			}

			const newSession = await sessionService.createSession(
				effectiveAppName,
				userId,
				state || {},
				sessionId,
			);

			res.json(newSession);
		},
	);

	app.post(
		"/apps/:appName/users/:userId/sessions",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId } = req.params;
			const { state } = req.body;
			// Connect to managed session if agent_engine_id is set
			const effectiveAppName = agentEngineId || appName;

			const newSession = await sessionService.createSession(
				effectiveAppName,
				userId,
				state || {},
			);

			res.json(newSession);
		},
	);

	app.delete(
		"/apps/:appName/users/:userId/sessions/:sessionId",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId, sessionId } = req.params;
			// Connect to managed session if agent_engine_id is set
			const effectiveAppName = agentEngineId || appName;

			await sessionService.deleteSession(effectiveAppName, userId, sessionId);

			res.status(204).send();
		},
	);

	// Artifact endpoints
	app.get(
		"/apps/:appName/users/:userId/sessions/:sessionId/artifacts/:artifactName",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId, sessionId, artifactName } = req.params;
			const { version } = req.query;
			const effectiveAppName = agentEngineId || appName;

			try {
				const artifact = await artifactService.loadArtifact({
					appName: effectiveAppName,
					userId,
					sessionId,
					filename: artifactName,
					version: version ? Number.parseInt(version as string) : undefined,
				});

				if (!artifact) {
					return res.status(404).json({ error: "Artifact not found" });
				}

				res.json(artifact);
			} catch (error) {
				console.error("Error loading artifact:", error);
				res.status(500).json({ error: "Error loading artifact" });
			}
		},
	);

	app.get(
		"/apps/:appName/users/:userId/sessions/:sessionId/artifacts/:artifactName/versions/:versionId",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId, sessionId, artifactName, versionId } =
				req.params;
			const effectiveAppName = agentEngineId || appName;

			try {
				const artifact = await artifactService.loadArtifact({
					appName: effectiveAppName,
					userId,
					sessionId,
					filename: artifactName,
					version: Number.parseInt(versionId),
				});

				if (!artifact) {
					return res.status(404).json({ error: "Artifact not found" });
				}

				res.json(artifact);
			} catch (error) {
				console.error("Error loading artifact version:", error);
				res.status(500).json({ error: "Error loading artifact version" });
			}
		},
	);

	app.get(
		"/apps/:appName/users/:userId/sessions/:sessionId/artifacts",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId, sessionId } = req.params;
			const effectiveAppName = agentEngineId || appName;

			try {
				const artifactNames = await artifactService.listArtifactKeys({
					appName: effectiveAppName,
					userId,
					sessionId,
				});

				res.json(artifactNames);
			} catch (error) {
				console.error("Error listing artifacts:", error);
				res.status(500).json({ error: "Error listing artifacts" });
			}
		},
	);

	app.get(
		"/apps/:appName/users/:userId/sessions/:sessionId/artifacts/:artifactName/versions",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId, sessionId, artifactName } = req.params;
			const effectiveAppName = agentEngineId || appName;

			try {
				const versions = await artifactService.listVersions({
					appName: effectiveAppName,
					userId,
					sessionId,
					filename: artifactName,
				});

				res.json(versions);
			} catch (error) {
				console.error("Error listing artifact versions:", error);
				res.status(500).json({ error: "Error listing artifact versions" });
			}
		},
	);

	app.delete(
		"/apps/:appName/users/:userId/sessions/:sessionId/artifacts/:artifactName",
		async (req: express.Request, res: express.Response) => {
			const { appName, userId, sessionId, artifactName } = req.params;
			const effectiveAppName = agentEngineId || appName;

			try {
				await artifactService.deleteArtifact({
					appName: effectiveAppName,
					userId,
					sessionId,
					filename: artifactName,
				});

				res.status(204).send();
			} catch (error) {
				console.error("Error deleting artifact:", error);
				res.status(500).json({ error: "Error deleting artifact" });
			}
		},
	);

	// Agent run endpoints
	app.post("/run", async (req: express.Request, res: express.Response) => {
		const requestData: AgentRunRequest = req.body;
		const { appName, userId, sessionId, newMessage } = requestData;

		try {
			// Connect to managed session if agent_engine_id is set
			const appId = agentEngineId || appName;

			const session = await sessionService.getSession(appId, userId, sessionId);

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			const runner = await getRunner(appName);
			const events: RunnerEvent[] = [];

			for await (const event of runner.runAsync({
				userId,
				sessionId,
				newMessage,
			})) {
				events.push(event);
			}

			console.info(`Generated ${events.length} events in agent run:`, events);
			res.json(events);
		} catch (error) {
			console.error("Error in agent run:", error);
			res.status(500).json({ error: "Error in agent run" });
		}
	});

	app.post("/run_sse", async (req: express.Request, res: express.Response) => {
		const requestData: AgentRunRequest = req.body;
		const { appName, userId, sessionId, newMessage, streaming } = requestData;

		try {
			// Connect to managed session if agent_engine_id is set
			const appId = agentEngineId || appName;

			const session = await sessionService.getSession(appId, userId, sessionId);

			if (!session) {
				return res.status(404).json({ error: "Session not found" });
			}

			// Set up SSE headers
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Cache-Control",
			});

			const runner = await getRunner(appName);
			const streamMode = streaming ? StreamingMode.SSE : StreamingMode.NONE;

			try {
				for await (const event of runner.runAsync({
					userId,
					sessionId,
					newMessage,
					runConfig: new RunConfig({ streamingMode: streamMode }),
				})) {
					const sseEvent = JSON.stringify(event);
					console.info("Generated event in agent run streaming:", sseEvent);
					res.write(`data: ${sseEvent}\n\n`);
				}
			} catch (error) {
				console.error("Error in event generator:", error);
				res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
			}

			res.end();
		} catch (error) {
			console.error("Error in SSE agent run:", error);
			res.status(500).json({ error: "Error in SSE agent run" });
		}
	});

	// Agent graph endpoint
	app.get(
		"/apps/:appName/users/:userId/sessions/:sessionId/events/:eventId/graph",
		async (req: express.Request, res: express.Response) => {
			try {
				const { appName, userId, sessionId, eventId } = req.params;

				// Connect to managed session if agent_engine_id is set
				const appId = agentEngineId || appName;

				const session = await sessionService.getSession(
					appId,
					userId,
					sessionId,
				);

				const sessionEvents = session?.events || [];
				const event = sessionEvents.find((x) => x.id === eventId);

				if (!event) {
					return res.json({});
				}

				const rootAgent = await getRootAgent(appName);
				let dotGraph: any;

				// Check for function calls
				const functionCalls = event.getFunctionCalls
					? event.getFunctionCalls()
					: [];
				const functionResponses = event.getFunctionResponses
					? event.getFunctionResponses()
					: [];

				if (functionCalls && functionCalls.length > 0) {
					const functionCallHighlights = functionCalls.map(
						(call) => [event.author, call.name] as [string, string],
					);
					dotGraph = await agentGraph.getAgentGraph(
						rootAgent,
						functionCallHighlights,
					);
				} else if (functionResponses && functionResponses.length > 0) {
					const functionResponseHighlights = functionResponses.map(
						(response) => [response.name, event.author] as [string, string],
					);
					dotGraph = await agentGraph.getAgentGraph(
						rootAgent,
						functionResponseHighlights,
					);
				} else {
					dotGraph = await agentGraph.getAgentGraph(rootAgent, [
						[event.author, ""],
					]);
				}

				if (dotGraph) {
					return res.json({ dot_src: dotGraph.to_string() });
				}
				return res.json({});
			} catch (error) {
				console.error("Error generating agent graph:", error);
				return res.status(500).json({ error: "Error generating agent graph" });
			}
		},
	);

	/**
	 * Helper function to get the root agent for an app
	 */
	async function getRootAgent(appName: string): Promise<BaseAgent> {
		if (rootAgentDict[appName]) {
			return rootAgentDict[appName];
		}

		try {
			// Dynamically import the agent module
			const agentModule = require(path.join(agentDir, appName));

			const rootAgent = agentModule.rootAgent || agentModule.default?.rootAgent;

			if (!rootAgent) {
				throw new Error(
					`Unable to find "rootAgent" from ${appName}. Make sure it exports a 'rootAgent' property.`,
				);
			}
			rootAgentDict[appName] = rootAgent;

			// Collect all toolsets for cleanup
			const agentToolsets = getAllToolsets(rootAgent);
			agentToolsets.forEach((toolset) => toolsetsToClose.add(toolset));

			return rootAgent;
		} catch (error) {
			console.error(`Error getting root agent for ${appName}:`, error);
			throw new Error(`Error getting root agent for ${appName}: ${error}`);
		}
	}

	/**
	 * Helper function to get the runner for an app
	 */
	async function getRunner(appName: string): Promise<Runner> {
		loadDotenvForAgent(path.basename(appName), agentDir);

		if (runnerDict[appName]) {
			return runnerDict[appName];
		}

		// Load environment variables for the agent
		loadDotenvForAgent("", agentDir);

		const rootAgent = await getRootAgent(appName);
		const runner = new Runner({
			appName: agentEngineId || appName,
			agent: rootAgent,
			artifactService,
			sessionService,
			memoryService,
		});

		runnerDict[appName] = runner;
		return runner;
	}

	// If web UI is enabled, serve static files
	if (web) {
		const BASE_DIR = path.dirname(__filename);
		const ANGULAR_DIST_PATH = path.join(BASE_DIR, "browser");

		// Serve static files from the browser directory
		app.use(express.static(ANGULAR_DIST_PATH));

		// Dev UI page - serve the index.html for all other routes, supporting SPAs
		app.get("/*", (req, res) => {
			// Exclude API-like paths from being served the index.html file
			if (req.path.startsWith("/api/") || req.path.startsWith("/debug/")) {
				return res.status(404).send("Not Found");
			}
			const indexHtmlPath = path.join(ANGULAR_DIST_PATH, "index.html");
			if (fs.existsSync(indexHtmlPath)) {
				res.sendFile(indexHtmlPath);
			} else {
				// Fallback if index.html not found
				res
					.status(404)
					.send(
						"Web UI not found. Please make sure the browser directory is properly installed.",
					);
			}
		});

		console.log(`Serving web UI from ${ANGULAR_DIST_PATH}`);
	}

	// Start the server if a port was provided
	if (port) {
		server.listen(port, () => {
			console.log(`API server running at http://localhost:${port}`);
			if (reload) {
				console.log("Auto-reload enabled. Watching for file changes...");
			}
		});
	}

	// Setup auto-reload functionality if enabled
	if (reload && port) {
		// Disable auto-reload on Windows to avoid subprocess transport errors
		// similar to the Python fix for uvicorn reload=True on Windows
		if (process.platform === "win32") {
			console.log(
				"Auto-reload disabled on Windows to avoid potential subprocess transport errors.",
			);
		} else {
			setupAutoReload(server, agentDir, port);
		}
	}

	// Setup graceful shutdown handler for toolsets
	const gracefulShutdown = async () => {
		console.log("Received shutdown signal, closing server gracefully...");

		// Close all toolsets
		for (const toolset of toolsetsToClose) {
			try {
				await toolset.close();
			} catch (error) {
				console.error("Error closing toolset:", error);
			}
		}

		server.close(() => {
			console.log("Server closed");
			process.exit(0);
		});
	};

	process.on("SIGTERM", gracefulShutdown);
	process.on("SIGINT", gracefulShutdown);

	// Auto-reload functionality
	if (reload) {
		setupAutoReload(server, agentDir, port);
	}

	return { app, server };
}

// Auto-reload setup
function setupAutoReload(
	server: http.Server,
	agentDir: string,
	port: number,
): void {
	const watcher = chokidar.watch(agentDir, {
		ignored: [
			/node_modules/,
			/\.git/,
			/\.adk/,
			/\.DS_Store/,
			/\.pyc$/,
			/__pycache__/,
		],
		persistent: true,
		ignoreInitial: true,
	});

	watcher.on("change", (filePath: string) => {
		console.log(`File changed: ${filePath}`);
		console.log("Restarting server...");

		// Clear the require cache for the changed file and related modules
		clearRequireCache(agentDir);

		// Close the server and restart
		server.close(() => {
			console.log("Server restarted");
			// Note: In a production environment, you'd want to use a process manager
			// like PM2 or nodemon for proper restart functionality
			process.exit(0);
		});
	});

	watcher.on("error", (error) => {
		console.error("File watcher error:", error);
	});

	// Clean up watcher on process exit
	process.on("SIGINT", () => {
		watcher.close();
	});

	process.on("SIGTERM", () => {
		watcher.close();
	});
}

// Clear require cache for a directory
function clearRequireCache(dir: string): void {
	Object.keys(require.cache).forEach((key) => {
		if (key.startsWith(dir)) {
			delete require.cache[key];
		}
	});
}
