import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import { AgentBuilder, createDatabaseSessionService } from "@iqai/adk";

const APP_NAME = "CounterDemo";
const USER_ID = "demo-user";

async function main() {
	console.log("📊 Starting Database Session example...");

	try {
		/**
		 * Create agent with persistent SQLite sessions using AgentBuilder
		 * The database session service provides persistent storage for conversations
		 */
		const sessionService = createDatabaseSessionService(
			getSqliteConnectionString("counter"),
		);

		/**
		 * Find existing session or create new one
		 * Sessions are automatically persisted and can be resumed
		 */
		await getExistingSession(sessionService);
		/**
		 * Create runner with persistent session
		 * The counter state persists across multiple runs
		 */
		const { runner } = await AgentBuilder.create("counter_agent")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription(
				"You are a counter. Increment the count each time when I tell you so. Start with 1",
			)
			.withSession(sessionService, { userId: USER_ID, appName: APP_NAME })
			.build();

		/**
		 * Execute counter interaction with persistent memory
		 * The counter state persists across multiple runs
		 */
		console.log("🔢 Incrementing counter...");
		const response = await runner.ask(
			"Increment counter and show current count",
		);
		console.log("🤖 Agent:", response);

		console.log("\n💡 Run this script multiple times to see persistence!");
		console.log("✅ Database Session example completed!");
	} catch (error) {
		console.error("❌ Error in database session example:", error);
		process.exit(1);
	}
}

/**
 * Finds existing session or returns null if none exists
 * @param sessionService The session service to search
 * @returns Existing session ID or null
 */
async function getExistingSession(sessionService: any): Promise<string | null> {
	try {
		const { sessions } = await sessionService.listSessions(APP_NAME, USER_ID);

		if (sessions.length > 0) {
			console.log(`🔄 Will resume existing session: ${sessions[0].id}`);
			return sessions[0].id;
		}

		console.log("🆕 Will create new session...");
		return null;
	} catch (error) {
		console.log("🆕 Will create new session...");
		return null;
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
