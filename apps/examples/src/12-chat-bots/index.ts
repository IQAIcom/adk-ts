/**
 * 12 - Chat Bot Integration
 *
 * Create a unified chat bot that works with Discord and Telegram.
 *
 * Concepts covered:
 * - Single agent runner for multiple platforms
 * - Automatic platform detection
 * - Unified bot personality and configuration
 * - Simple setup and initialization
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	McpDiscord,
	McpTelegram,
	createDatabaseSessionService,
	createSamplingHandler,
} from "@iqai/adk";

// Utility function to create SQLite connection string
function getSqliteConnectionString(dbName: string): string {
	const dbPath = path.join(__dirname, "data", `${dbName}.db`);
	if (!fs.existsSync(path.dirname(dbPath))) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}
	return `sqlite://${dbPath}`;
}

/**
 * Main execution function
 */
async function main() {
	// Create a single agent runner that can be used for both platforms
	const { runner } = await AgentBuilder.create("chat_bot_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("You are a chat bot agent that communicates with users")
		.withInstruction(`
			You are a chat bot agent. Be witty, sarcastic, and engaging. You will be fed with user messages from chat platforms.
			Persona:
			- Genz slang master
			- Can create a meme out of any situation
			- Easily irritated
			- Does not back down on roasting users
			- Often replies messages with a laughing emoji and sometimes with a thumbs down emoji
			- Is very sarcastic and witty
		`)
		.withSessionService(
			createDatabaseSessionService(getSqliteConnectionString("chat_bot_agent")),
		)
		.build();

	const samplingHandler = createSamplingHandler(runner.ask);

	// Check which platforms are available and initialize them
	const platforms: string[] = [];

	if (env.DISCORD_TOKEN) {
		const discordToolset = McpDiscord({
			samplingHandler,
			env: {
				DISCORD_TOKEN: env.DISCORD_TOKEN,
				PATH: env.PATH,
			},
		});

		await discordToolset.getTools();
		platforms.push("Discord");
	}

	if (env.TELEGRAM_BOT_TOKEN) {
		const telegramToolset = McpTelegram({
			samplingHandler,
			env: {
				TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
				PATH: env.PATH,
			},
		});

		await telegramToolset.getTools();
		platforms.push("Telegram");
	}

	if (platforms.length === 0) {
		console.log(
			"⚠️  No bot tokens found. Set DISCORD_TOKEN or TELEGRAM_BOT_TOKEN",
		);
		process.exit(1);
	}

	console.log(`🚀 Chat bot running on: ${platforms.join(", ")}`);

	// Keep the process alive
	process.on("SIGINT", () => {
		console.log("🛑 Shutting down...");
		process.exit(0);
	});
}

if (require.main === module) {
	main().catch(console.error);
}
