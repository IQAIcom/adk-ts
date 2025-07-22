import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	McpTelegram,
	createDatabaseSessionService,
	createSamplingHandler,
} from "@iqai/adk";
import * as dotenv from "dotenv";

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
		// Create the AI agent with custom persona
		const { runner } = await AgentBuilder.create("telegram_bot")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription("You are a helpful Telegram bot that assists users")
			.withInstruction(`
				You are a friendly and helpful Telegram bot assistant.

				Personality:
				- Be conversational and engaging
				- Provide helpful and accurate information
				- Use emojis occasionally to make conversations more friendly
				- Keep responses concise but informative
				- Be respectful and professional

				Guidelines:
				- Always respond in a helpful manner
				- If you don't know something, admit it
				- Suggest relevant resources when appropriate
				- Maintain context from previous messages in the conversation
			`)
			.withSession(
				createDatabaseSessionService(getSqliteConnectionString("telegram_bot")),
			)
			.build();

		// Create sampling handler for the Telegram MCP
		const samplingHandler = createSamplingHandler(runner.ask);

		// Initialize Telegram toolset
		const telegramToolset = McpTelegram({
			samplingHandler,
			env: {
				TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
				PATH: env.PATH,
			},
		});

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
