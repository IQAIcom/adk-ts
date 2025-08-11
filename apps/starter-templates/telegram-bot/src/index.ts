import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	LlmAgent,
	createDatabaseSessionService,
	createSamplingHandler,
} from "@iqai/adk";
import * as dotenv from "dotenv";
import { agent } from "./agents/agent";
import { createTelegramAgent } from "./createTelegramAgent";

dotenv.config();

/**
 * Telegram Bot with AI Agent
 *
 * A Telegram bot powered by ADK that can engage with users in channels and direct messages.
 * Customize the persona and instructions below to create your own unique bot.
 */

async function main() {
	console.log("🤖 Initializing Telegram bot agent...");

	// Validate required environment variables
	if (!env.TELEGRAM_BOT_TOKEN) {
		console.error(
			"❌ TELEGRAM_BOT_TOKEN is required. Please set it in your .env file.",
		);
		process.exit(1);
	}

	try {
		// Build runner from exported agent with fallback
		const builder: any = (AgentBuilder as any).fromAgent
			? (AgentBuilder as any).fromAgent(agent)
			: agent instanceof LlmAgent
				? AgentBuilder.create(agent.name)
						.withModel((agent as any).model)
						.withInstruction((agent as any).instruction || "")
						.withDescription((agent as any).description || "")
				: AgentBuilder.create(agent.name);

		const { runner } = await builder
			.withSessionService(
				createDatabaseSessionService(getSqliteConnectionString("telegram_bot")),
			)
			.build();

		// Create sampling handler and initialize Telegram MCP via factory
		const samplingHandler = createSamplingHandler(runner.ask);
		const telegramToolset = createTelegramAgent(samplingHandler);

		// Get available tools
		await telegramToolset.getTools();

		console.log("✅ Telegram bot agent initialized successfully!");
		console.log("🚀 Bot is now running and ready to receive messages...");

		// Keep the process running
		await keepAlive();
	} catch (error) {
		console.error("❌ Failed to initialize Telegram bot:", error);
		process.exit(1);
	}
}

/**
 * Keep the process alive
 */
async function keepAlive() {
	// Keep the process running
	process.on("SIGINT", () => {
		console.log("\n👋 Shutting down Telegram bot gracefully...");
		process.exit(0);
	});

	// Prevent the process from exiting
	setInterval(() => {
		// This keeps the event loop active
	}, 1000);
}

/**
 * Get SQLite connection string for the database
 */
function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	return `sqlite://${dbPath}`;
}

main().catch(console.error);
