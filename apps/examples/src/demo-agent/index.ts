import { McpTelegram, createSamplingHandler } from "@iqai/adk";
import * as dotenv from "dotenv";
import { env } from "./env";
import { createPersonalAgent } from "./personal-agent/agent";
import { createReminderNotificationService } from "./services/reminder-notification";

dotenv.config();

/**
 * Telegram Bot with AI Agent
 *
 * A Telegram bot powered by ADK that can engage with users in channels and direct messages.
 * Customize the persona and instructions below to create your own unique bot.
 */

async function main() {
	console.log("🤖 Initializing Telegram bot agent...");

	const { sessionService, session, runner } = await createPersonalAgent();

	// Validate required environment variables
	if (!env.TELEGRAM_BOT_TOKEN) {
		console.error(
			"❌ TELEGRAM_BOT_TOKEN is required. Please set it in your .env file.",
		);
		process.exit(1);
	}

	// Create sampling handler for the Telegram MCP
	const samplingHandler = createSamplingHandler(runner.ask);

	// Initialize Telegram toolset
	const toolset = McpTelegram({
		samplingHandler,
		env: {
			TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
		},
	});

	const tools = await toolset.getTools();

	console.log("✅ Telegram bot agent initialized successfully!");
	console.log("🚀 Bot is now running and ready to receive messages...");

	// Start the reminder notification service
	const reminderService = createReminderNotificationService(
		session,
		sessionService,
		tools,
	);

	reminderService.start();

	// Handle graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n👋 Shutting down Telegram bot gracefully...");
		reminderService.stop();
		process.exit(0);
	});

	// Keep the process alive
	setInterval(() => {
		// Just keep the process running
	}, 1000);
}

main().catch(console.error);
