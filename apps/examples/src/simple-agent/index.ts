import { env } from "node:process";
import { Agent, type Content, InMemorySessionService, Runner } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "simple-example";
const USER_ID = uuidv4();

/**
 * Simple Agent Example
 *
 * This example demonstrates the basic usage of the ADK framework with a simple
 * LLM agent using Google's Gemini model.
 *
 * The example:
 * 1. Creates a basic agent with Gemini 2.5 Flash model
 * 2. Sets up session management for conversation context
 * 3. Sends a simple question and displays the response
 * 4. Shows the fundamental agent interaction pattern
 *
 * Expected Output:
 * - Agent initialization confirmation
 * - Response to the question about Australia's capital
 * - Completion confirmation
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */
async function main() {
	console.log("🤖 Starting simple agent example with Google's Gemini model...");

	try {
		/**
		 * Create a basic agent using Google's Gemini model
		 * The agent is configured with minimal settings for demonstration
		 */
		const agent = new Agent({
			name: "gemini_assistant",
			model: env.LLM_MODEL || "gemini-2.5-flash",
			description: "A simple assistant using Google's Gemini model",
		});

		/**
		 * Set up session management for conversation context
		 * This enables proper tracking of the conversation state
		 */
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		/**
		 * Create runner for executing agent interactions
		 * The runner handles the communication between user and agent
		 */
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		/**
		 * Send a simple question to the agent
		 * This demonstrates the basic interaction pattern
		 */
		const questionText = "What is the capital of Australia?";
		const userMessage: Content = { parts: [{ text: questionText }] };

		console.log(`💬 Question: ${questionText}`);
		console.log("🤖 Agent response:");

		/**
		 * Stream the agent's response in real-time
		 * The agent processes the question and provides an answer
		 */
		for await (const event of runner.runAsync({
			userId: session.userId,
			sessionId: session.id,
			newMessage: userMessage,
		})) {
			if (event.content?.parts) {
				const responseText = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (responseText) {
					console.log(responseText);
				}
			}
		}

		console.log("\n✅ Example completed successfully!");
	} catch (error) {
		console.error("❌ Error in agent example:", error);
		process.exit(1);
	}
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
