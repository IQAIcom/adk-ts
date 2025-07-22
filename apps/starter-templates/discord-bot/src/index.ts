import * as fs from "node:fs";
import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	McpDiscord,
	createDatabaseSessionService,
	createSamplingHandler,
} from "@iqai/adk";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Discord Bot with AI Agent
 *
 * A Discord bot powered by ADK that can engage with users in servers and direct messages.
 * Customize the persona and instructions below to create your own unique bot.
 */

async function main() {
	console.log("🤖 Initializing Discord bot agent...");

	// Validate required environment variables
	if (!env.DISCORD_TOKEN) {
		console.error(
			"❌ DISCORD_TOKEN is required. Please set it in your .env file.",
		);
		process.exit(1);
	}

	try {
		// Create the AI agent with custom persona
		const { runner } = await AgentBuilder.create("discord_bot")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription("You are a helpful Discord bot that assists users")
			.withInstruction(`
				You are a friendly and helpful Discord bot assistant.

				Personality:
				- Be conversational and engaging
				- Provide helpful and accurate information
				- Use Discord-appropriate emojis occasionally
				- Keep responses concise but informative
				- Be respectful and follow Discord community guidelines
				- Understand Discord culture and terminology

				Guidelines:
				- Always respond in a helpful manner
				- If you don't know something, admit it
				- Suggest relevant resources when appropriate
				- Maintain context from previous messages in the conversation
				- Be mindful of server rules and community standards
				- Use Discord markdown formatting when helpful (e.g., **bold**, *italic*, \`code\`)
			`)
			.withSessionService(
				createDatabaseSessionService(getSqliteConnectionString("discord_bot")),
			)
			.build();

		// Create sampling handler for the Discord MCP
		const samplingHandler = createSamplingHandler(runner.ask);

		// Initialize Discord toolset
		const discordToolset = McpDiscord({
			samplingHandler,
			env: {
				DISCORD_TOKEN: env.DISCORD_TOKEN,
				PATH: env.PATH,
			},
		});

		// Get available tools
		await discordToolset.getTools();

		console.log("✅ Discord bot agent initialized successfully!");
		console.log("🚀 Bot is now running and ready to receive messages...");

		// Keep the process running
		await keepAlive();
	} catch (error) {
		console.error("❌ Failed to initialize Discord bot:", error);
		process.exit(1);
	}
}

/**
 * Keep the process alive
 */
async function keepAlive() {
	// Keep the process running
	process.on("SIGINT", () => {
		console.log("\n👋 Shutting down Discord bot gracefully...");
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
