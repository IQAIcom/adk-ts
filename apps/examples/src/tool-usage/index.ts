import { env } from "node:process";
import { InMemorySessionService, LlmAgent, Runner } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

import { CalculatorTool } from "./calculator";
import { WeatherTool } from "./weather";

/**
 * Application configuration constants
 */
const APP_NAME = "tool-usage-demo";
const USER_ID = uuidv4();
const DEBUG = true; // Enable debug mode for showing agent loop

/**
 * Tool Usage Example
 *
 * This example demonstrates how to use custom tools with an LLM agent to extend
 * its capabilities beyond text generation. The agent can perform calculations
 * and retrieve weather information through tool integration.
 *
 * The example:
 * 1. Creates an agent with custom Calculator and Weather tools
 * 2. Demonstrates single-tool usage scenarios
 * 3. Shows multi-tool coordination in complex queries
 * 4. Illustrates multi-turn conversations with session persistence
 *
 * Expected Output:
 * - Mathematical calculations using CalculatorTool
 * - Weather information retrieval using WeatherTool
 * - Multi-tool coordination for complex requests
 * - Multi-turn conversation examples
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 * - CalculatorTool and WeatherTool implementations in respective files
 */

/**
 * Creates and configures the LLM agent with custom tools
 * @returns Configured LlmAgent with Calculator and Weather tools
 */
function createToolAgent(): LlmAgent {
	return new LlmAgent({
		name: "tool_assistant",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "An assistant that demonstrates tool usage with Google Gemini",
		instruction:
			"You are a helpful assistant that can perform calculations and check the weather. " +
			"Use the appropriate tools when asked about math or weather. " +
			"Be clear about which tools you're using and provide informative responses.",
		tools: [new CalculatorTool(), new WeatherTool()],
	});
}

/**
 * Executes a user query through the agent and returns the response
 * @param runner The Runner instance for executing agent tasks
 * @param query The user's question or request
 * @param sessionId Optional session ID for maintaining context
 * @returns The agent's response as a string
 */
async function runAgentQuery(
	runner: Runner,
	query: string,
	sessionId?: string,
): Promise<string> {
	const currentSessionId =
		sessionId ||
		(await runner.sessionService.createSession(APP_NAME, USER_ID)).id;

	if (DEBUG) {
		console.log(`\n[DEBUG] Starting agent loop with query: ${query}`);
	}

	let response = "";
	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId: currentSessionId,
		newMessage: {
			parts: [{ text: query }],
		},
	})) {
		if (event.author === "tool_assistant" && event.content?.parts) {
			const content = event.content.parts
				.map((part) => part.text || "")
				.join("");
			if (content && !event.partial) {
				response = content;
			}
		}
	}

	if (DEBUG) {
		console.log("[DEBUG] Agent loop completed");
	}

	return response;
}

/**
 * Demonstrates single-tool usage scenarios
 * @param runner The Runner instance for executing agent tasks
 */
async function demonstrateSingleToolUsage(runner: Runner): Promise<void> {
	/**
	 * Example 1: Calculator Tool Usage
	 * Shows basic mathematical operations
	 */
	console.log("\nExample 1: Calculator Tool");
	console.log("Question: What is 24 multiplied by 7?");
	console.log("-----------------------------------");

	const calcResponse = await runAgentQuery(
		runner,
		"What is 24 multiplied by 7?",
	);
	console.log("Final Response:", calcResponse);
	console.log("-----------------------------------");

	/**
	 * Example 2: Weather Tool Usage
	 * Demonstrates API-style tool integration
	 */
	console.log("\nExample 2: Weather Tool");
	console.log("Question: What's the weather like in Stockholm today?");
	console.log("-----------------------------------");

	const weatherResponse = await runAgentQuery(
		runner,
		"What's the weather like in Stockholm today?",
	);
	console.log("Final Response:", weatherResponse);
	console.log("-----------------------------------");
}

/**
 * Demonstrates multi-tool coordination in a single query
 * @param runner The Runner instance for executing agent tasks
 */
async function demonstrateMultiToolUsage(runner: Runner): Promise<void> {
	console.log("\nExample 3: Multi-tool coordination");
	console.log(
		"Question: I need to know the weather in Paris and then calculate how many euros I need if I spend 25 euros per day for 7 days.",
	);
	console.log("-----------------------------------");

	const multiToolResponse = await runAgentQuery(
		runner,
		"I need to know the weather in Paris and then calculate how many euros I need if I spend 25 euros per day for 7 days.",
	);
	console.log("Final Response:", multiToolResponse);
	console.log("-----------------------------------");
}

/**
 * Demonstrates multi-turn conversation with persistent session
 * @param runner The Runner instance for executing agent tasks
 * @param sessionService The session service for creating persistent sessions
 */
async function demonstrateMultiTurnConversation(
	runner: Runner,
	sessionService: InMemorySessionService,
): Promise<void> {
	console.log("\nExample 4: Multi-turn conversation");
	console.log("-----------------------------------");

	// Create a persistent session for multi-turn conversation
	const conversationSession = await sessionService.createSession(
		APP_NAME,
		USER_ID,
	);

	// First turn: Weather inquiry
	console.log(
		"User: Hi, I'm planning a trip to New York. What's the weather like there?",
	);
	let response = await runAgentQuery(
		runner,
		"Hi, I'm planning a trip to New York. What's the weather like there?",
		conversationSession.id,
	);
	console.log("Assistant:", response);

	// Second turn: Accommodation cost calculation
	console.log(
		"\nUser: Great! If I stay for 5 days and hotels cost $200 per night, how much will I spend on accommodation?",
	);
	response = await runAgentQuery(
		runner,
		"Great! If I stay for 5 days and hotels cost $200 per night, how much will I spend on accommodation?",
		conversationSession.id,
	);
	console.log("Assistant:", response);

	// Third turn: Total cost calculation
	console.log(
		"\nUser: And what will the total be if I also spend $100 per day on food and activities?",
	);
	response = await runAgentQuery(
		runner,
		"And what will the total be if I also spend $100 per day on food and activities?",
		conversationSession.id,
	);
	console.log("Assistant:", response);
}

async function main() {
	console.log("🛠️ Starting Tool Usage demonstration...");

	try {
		/**
		 * Create agent with custom tools
		 * The agent gains Calculator and Weather capabilities
		 */
		const agent = createToolAgent();

		/**
		 * Set up session management and runner
		 * Provides conversation context and execution environment
		 */
		const sessionService = new InMemorySessionService();
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		console.log("Agent initialized with custom tools");
		console.log("-----------------------------------");

		/**
		 * Run comprehensive tool usage demonstrations
		 * Shows various scenarios from simple to complex tool interactions
		 */
		await demonstrateSingleToolUsage(runner);
		await demonstrateMultiToolUsage(runner);
		await demonstrateMultiTurnConversation(runner, sessionService);

		console.log("\n✅ Tool usage examples complete!");
	} catch (error) {
		console.error("❌ Error in tool usage example:", error);
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
