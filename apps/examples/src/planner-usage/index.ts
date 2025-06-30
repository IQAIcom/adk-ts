import { env } from "node:process";
import {
	BuiltInPlanner,
	InMemorySessionService,
	LlmAgent,
	PlanReActPlanner,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "planner-demo";
const USER_ID = uuidv4();

/**
 * Planner Usage Example
 *
 * This example demonstrates how to use different planner types with LLM agents
 * to enhance reasoning and response structure. Planners help agents organize
 * their thinking process and provide more systematic approaches to problem-solving.
 *
 * The example:
 * 1. Shows a baseline agent without any planner
 * 2. Demonstrates BuiltInPlanner for model-native thinking
 * 3. Illustrates PlanReActPlanner for structured planning
 * 4. Compares different approaches to the same tasks
 * 5. Highlights the benefits of each planner type
 *
 * Expected Output:
 * - Baseline responses without planning structure
 * - Thinking-enhanced responses with BuiltInPlanner
 * - Structured planning responses with PlanReActPlanner
 * - Clear comparison between approaches
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-pro)
 */
async function main() {
	console.log("🎯 Starting Planner Integration example...");

	try {
		/**
		 * Run planner demonstrations in sequence
		 * Each demonstration shows a different approach to agent planning
		 */
		await demonstrateNoPlannerBaseline();
		await demonstrateBuiltInPlanner();
		await demonstratePlanReActPlanner();

		console.log("\n✅ Planner Integration example completed!");
	} catch (error) {
		console.error("❌ Error in planner examples:", error);
		process.exit(1);
	}
}

/**
 * Demonstrates a baseline agent without any planner for comparison
 */
async function demonstrateNoPlannerBaseline(): Promise<void> {
	console.log("\n⚡ === No Planner Baseline ===");

	const agent = new LlmAgent({
		name: "SimpleAgent",
		description: "An agent without any planner",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instruction: "You are a helpful assistant.",
		// No planner specified
	});

	const response = await runAgentWithQuery(
		agent,
		"What's the capital of France?",
	);

	console.log("📝 No Planner Response (baseline):");
	console.log(response);
}

/**
 * Demonstrates the BuiltInPlanner which uses model-native thinking capabilities
 */
async function demonstrateBuiltInPlanner(): Promise<void> {
	console.log("\n🧠 === BuiltInPlanner Example ===");

	const agent = new LlmAgent({
		name: "ThinkingAgent",
		description: "An agent that uses built-in thinking",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instruction:
			"You are a helpful assistant that thinks through problems carefully.",
		planner: new BuiltInPlanner({
			thinkingConfig: {
				includeThinking: true,
			},
		}),
	});

	const response = await runAgentWithQuery(
		agent,
		"What's 2 + 2? Please explain your reasoning.",
	);

	console.log("📝 BuiltInPlanner Response:");
	console.log(response);
}

/**
 * Demonstrates the PlanReActPlanner which uses structured planning tags
 */
async function demonstratePlanReActPlanner(): Promise<void> {
	console.log("\n📋 === PlanReActPlanner Example ===");

	const agent = new LlmAgent({
		name: "PlanningAgent",
		description: "An agent that uses structured planning",
		model: env.LLM_MODEL || "gemini-2.5-pro",
		instruction: "You are a helpful assistant that plans before acting.",
		planner: new PlanReActPlanner(),
	});

	const response = await runAgentWithQuery(
		agent,
		"I need to plan a birthday party for 20 people. Help me organize this.",
	);

	console.log("📝 PlanReActPlanner Response:");
	console.log(response);
	console.log("\n📊 Notice the structured planning tags in the response!");
}

/**
 * Runs an agent with a specific query and returns the response
 * @param agent The LlmAgent to execute
 * @param userMessage The message to send to the agent
 * @returns The agent's response as a string
 */
async function runAgentWithQuery(
	agent: LlmAgent,
	userMessage: string,
): Promise<string> {
	console.log(`👤 User: ${userMessage}`);

	try {
		/**
		 * Set up session and runner for agent execution
		 * Each agent gets its own isolated session
		 */
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		/**
		 * Execute the agent and collect the response
		 * Process streaming events to build complete response
		 */
		let agentResponse = "";

		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId: session.id,
			newMessage: {
				parts: [{ text: userMessage }],
			},
		})) {
			if (event.author === agent.name && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) {
					agentResponse += content;
				}
			}
		}

		return agentResponse || "No response from agent";
	} catch (error) {
		return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
	}
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
