import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	InMemoryMemoryService,
	LlmAgent,
	Runner,
	createDatabaseSessionService,
} from "@iqai/adk";

/**
 * Application configuration constants
 */
const APP_NAME = "CounterDemo";
const USER_ID = "demo-user";

/**
 * Database Session Example
 *
 * This example demonstrates how to use persistent SQLite sessions with the ADK.
 * It shows how conversations and application state can be preserved across
 * multiple runs, allowing for continuity between application sessions.
 *
 * The example:
 * 1. Creates a counter agent that maintains state
 * 2. Uses SQLite for persistent session storage
 * 3. Automatically finds existing sessions or creates new ones
 * 4. Demonstrates persistence across multiple script runs
 * 5. Shows how state accumulates over time
 *
 * Expected Output:
 * - Counter increments with each run
 * - Session persistence across application restarts
 * - Automatic session discovery and reuse
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 * - Write permissions for creating SQLite database files
 */
async function main() {
	console.log("📊 Starting Database Session example...");

	try {
		/**
		 * Create runner with SQLite persistence
		 * The database session service provides persistent storage for conversations
		 */
		const runner = createRunnerWithPersistence();

		/**
		 * Find existing session or create new one
		 * Sessions are automatically persisted and can be resumed
		 */
		const sessionId = await getOrCreateSession(runner);

		/**
		 * Execute counter interaction with persistent memory
		 * The counter state persists across multiple runs
		 */
		await runCounterInteraction(runner, sessionId);

		console.log("\n💡 Run this script multiple times to see persistence!");
		console.log("✅ Database Session example completed!");
	} catch (error) {
		console.error("❌ Error in database session example:", error);
		process.exit(1);
	}
}

/**
 * Creates a runner with persistent SQLite storage
 * @returns Configured Runner with database session service
 */
function createRunnerWithPersistence(): Runner {
	return new Runner({
		appName: APP_NAME,
		agent: new LlmAgent({
			name: "counter_agent",
			model: env.LLM_MODEL || "gemini-2.5-flash",
			description:
				"You are a counter. Increment the count each time when I tell you so. Start with 1",
		}),
		sessionService: createDatabaseSessionService(
			getSqliteConnectionString("counter"),
		),
		memoryService: new InMemoryMemoryService(),
	});
}

/**
 * Finds existing session or creates a new one
 * @param runner The Runner instance with session service
 * @returns Session ID for the counter demo
 */
async function getOrCreateSession(runner: Runner): Promise<string> {
	const { sessions } = await runner.sessionService.listSessions(
		APP_NAME,
		USER_ID,
	);

	if (sessions.length > 0) {
		console.log(`🔄 Resuming existing session: ${sessions[0].id}`);
		return sessions[0].id;
	}

	console.log("🆕 Creating new session...");
	const newSession = await runner.sessionService.createSession(
		APP_NAME,
		USER_ID,
	);
	return newSession.id;
}

/**
 * Executes a counter interaction with the agent
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The session ID to use for the interaction
 */
async function runCounterInteraction(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	console.log("🔢 Incrementing counter...");

	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId,
		newMessage: {
			parts: [{ text: "Increment counter and show current count" }],
		},
	})) {
		if (
			event.content?.parts &&
			event.author === "counter_agent" &&
			!event.partial
		) {
			const response = event.content.parts.map((p) => p.text).join("");
			console.log("🤖 Agent:", response);
		}
	}
}

/**
 * Get SQLite connection string for the given database name
 * Creates the directory if it doesn't exist
 * @param dbName Name of the database file (without extension)
 * @returns SQLite connection string
 */
function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);

	// Ensure the directory exists
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}

	return `sqlite://${dbPath}`;
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
