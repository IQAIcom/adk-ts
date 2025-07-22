import { env } from "node:process";
import { AgentBuilder, BuiltInPlanner, PlanReActPlanner } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

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

	const response = await AgentBuilder.create("SimpleAgent")
		.withModel(env.LLM_MODEL || "gemini-2.5-pro")
		.withDescription("An agent without any planner")
		.withInstruction("You are a helpful assistant.")
		.ask("What's the capital of France?");

	console.log("📝 No Planner Response (baseline):");
	console.log("👤 User: What's the capital of France?");
	console.log("🤖 Agent:", response);
}

/**
 * Demonstrates the BuiltInPlanner which uses model-native thinking capabilities
 */
async function demonstrateBuiltInPlanner(): Promise<void> {
	console.log("\n🧠 === BuiltInPlanner Example ===");

	const { runner } = await AgentBuilder.create("ThinkingAgent")
		.withModel(env.LLM_MODEL || "gemini-2.5-pro")
		.withDescription("An agent that uses built-in thinking")
		.withInstruction(
			"You are a helpful assistant that thinks through problems carefully.",
		)
		.withPlanner(
			new BuiltInPlanner({
				thinkingConfig: {
					includeThinking: true,
				},
			}),
		)
		.build();

	const query = "What's 2 + 2? Please explain your reasoning.";
	const response = await runner.ask(query);

	console.log("📝 BuiltInPlanner Response:");
	console.log(`👤 User: ${query}`);
	console.log("🤖 Agent:", response);
}

/**
 * Demonstrates the PlanReActPlanner which uses structured planning tags
 */
async function demonstratePlanReActPlanner(): Promise<void> {
	console.log("\n📋 === PlanReActPlanner Example ===");

	const { runner } = await AgentBuilder.create("PlanningAgent")
		.withModel(env.LLM_MODEL || "gemini-2.5-pro")
		.withDescription("An agent that uses structured planning")
		.withInstruction("You are a helpful assistant that plans before acting.")
		.withPlanner(new PlanReActPlanner())

		.build();

	const query =
		"I need to plan a birthday party for 20 people. Help me organize this.";
	const response = await runner.ask(query);

	console.log("📝 PlanReActPlanner Response:");
	console.log(`👤 User: ${query}`);
	console.log("🤖 Agent:", response);
	console.log("\n📊 Notice the structured planning tags in the response!");
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
