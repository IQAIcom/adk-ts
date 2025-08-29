import { createSamplingHandler } from "@iqai/adk";
import * as dotenv from "dotenv";
import { getRootAgent } from "./agents/agent";
import { getDiscordAgent } from "./agents/discord-agent/agent";

dotenv.config();

/**
 * Discord Bot with AI Agent
 *
 * A Discord bot powered by ADK that can engage with users in servers and direct messages.
 * Customize the persona and instructions below to create your own unique bot.
 */

async function main() {
	console.log("🤖 Initializing Discord bot agent...");

	try {
		const { runner } = await getRootAgent();

		// Create sampling handler for the Discord MCP
		const samplingHandler = createSamplingHandler(runner.ask);

		// Initialize Discord toolset
		await getDiscordAgent(samplingHandler);

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

main().catch(console.error);
