// FastAPI implementation for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the FastAPI functionality from the Python SDK but adapted for Express/Node.js

import * as fs from "node:fs";
import * as path from "node:path";
import { InMemoryArtifactService } from "../artifacts";
import { InMemorySessionService, type SessionService } from "../memory";
import { StreamingMode } from "../models";
import { Runner } from "../runners";

/**
 * FastAPI server configuration options
 */
export interface FastApiOptions {
	agentDir: string;
	sessionDbUrl?: string;
	allowOrigins?: string[];
	web: boolean;
	traceToCloud: boolean;
	lifespan?: any; // Would be a properly typed function in a real implementation
}

/**
 * Creates a FastAPI server application
 *
 * @param options The server configuration options
 * @returns A FastAPI application (in TypeScript we would return an Express app)
 */
export function getFastApiApp(options: FastApiOptions): any {
	const {
		agentDir,
		sessionDbUrl,
		allowOrigins = [],
		web,
		traceToCloud,
		lifespan,
	} = options;

	// In a real implementation, we would create an Express application here
	// For now, we'll just define the structure and main components

	// Set up session service based on the provided URL
	let sessionService: SessionService;
	if (sessionDbUrl) {
		if (sessionDbUrl.startsWith("agentengine://")) {
			// Use Vertex AI session service for Google Cloud
			const resourceId = sessionDbUrl.replace("agentengine://", "");
			// sessionService = new VertexAiSessionService(resourceId);
			console.log(
				`Using Vertex AI session service with resource ID ${resourceId}`,
			);
		} else {
			// Use database session service for other database URLs
			// sessionService = new DatabaseSessionService(sessionDbUrl);
			console.log(`Using database session service with URL ${sessionDbUrl}`);
		}
	} else {
		// Use in-memory session service by default
		sessionService = new InMemorySessionService();
		console.log("Using in-memory session service");
	}

	// Set up artifact service
	const artifactService = new InMemoryArtifactService();

	// Set up tracing if enabled
	const traceDict: Record<string, any> = {};
	if (traceToCloud) {
		// Set up cloud tracing (implementation would depend on the cloud provider)
		console.log("Cloud tracing enabled");
	}

	// Define API endpoints (in Express this would be with app.get(), app.post(), etc.)

	// Health endpoint
	const healthEndpoint = () => {
		return { status: "ok" };
	};

	// List agents endpoint
	const listAgentsEndpoint = () => {
		// List all agents in the agent directory
		const agentFolders = fs.readdirSync(agentDir).filter((folder) => {
			const folderPath = path.join(agentDir, folder);
			return (
				fs.statSync(folderPath).isDirectory() &&
				fs.existsSync(path.join(folderPath, "agent.ts"))
			);
		});

		return { agents: agentFolders };
	};

	// Create session endpoint
	const createSessionEndpoint = async (appName: string, userId: string) => {
		const session = await sessionService.createSession(userId, {
			appName,
		});
		return {
			sessionId: session.id,
			userId: session.userId,
			createdAt: session.createdAt,
			appName: session.metadata.appName,
		};
	};

	// Get session endpoint
	const getSessionEndpoint = (sessionId: string) => {
		const session = sessionService.getSession(sessionId);
		if (!session) {
			throw new Error("Session not found");
		}
		return session;
	};

	// Send message endpoint
	const sendMessageEndpoint = async (
		appName: string,
		userId: string,
		sessionId: string,
		message: string,
		streamingMode: StreamingMode = StreamingMode.SSE,
	) => {
		try {
			// Import the agent module
			const agentModulePath = path.join(agentDir, appName);
			const agentModule = await import(agentModulePath);
			const rootAgent = agentModule.agent.rootAgent;

			// Create a runner
			const runner = new Runner({
				appName,
				agent: rootAgent,
				artifactService,
				sessionService,
			});

			// Create the message content
			const content = {
				role: "user",
				parts: [{ text: message }],
			};

			// Run the agent and collect events
			const events: Event[] = [];
			for await (const event of runner.runAsync({
				userId,
				sessionId,
				newMessage: content,
			})) {
				events.push(event);
			}

			return { events };
		} catch (error) {
			console.error("Error sending message:", error);
			throw error;
		}
	};

	// In a real implementation, we would set up WebSocket endpoints, static file serving, etc.

	// Create a mock Express app for the structure
	const app = {
		healthEndpoint,
		listAgentsEndpoint,
		createSessionEndpoint,
		getSessionEndpoint,
		sendMessageEndpoint,
	};

	return app;
}
