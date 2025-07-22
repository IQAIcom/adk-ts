import { env } from "node:process";
import { AgentBuilder, type EnhancedRunner } from "@iqai/adk";
import { CalculatorTool } from "./calculator.js";
import { WeatherTool } from "./weather.js";

async function main() {
	console.log("🛠️ Starting Tool Usage example...");

	try {
		/**
		 * Create tools from imported tool classes
		 * These tools provide calculator and weather capabilities to the agent
		 */
		const calculatorTool = new CalculatorTool();
		const weatherTool = new WeatherTool();

		/**
		 * Create agent with multiple tools using AgentBuilder
		 * The agent can use all provided tools as needed
		 */
		const { runner } = await AgentBuilder.create("tool_specialist")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription(
				"A specialist agent that demonstrates comprehensive tool usage",
			)
			.withInstruction(`
				You are a helpful assistant with access to multiple tools.
				Use the calculator tool for mathematical operations.
				Use the weather tool to get weather information for cities.
				Be clear about which tools you're using and why.
				Provide comprehensive responses that utilize your tools effectively.
			`)
			.withTools(calculatorTool, weatherTool)
			.build();

		/**
		 * Demonstrate comprehensive tool usage patterns
		 * Shows various ways tools can be used individually and together
		 */
		await demonstrateBasicToolUsage(runner);
		await demonstrateComplexToolInteractions(runner);
		await demonstrateToolChaining(runner);

		console.log("\n✅ Tool Usage example completed!");
	} catch (error) {
		console.error("❌ Error in tool usage example:", error);
		process.exit(1);
	}
}

/**
 * Demonstrates basic individual tool usage
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateBasicToolUsage(
	runner: EnhancedRunner,
): Promise<void> {
	console.log("\n=== Basic Tool Usage ===");

	/**
	 * Calculator Tool Demo
	 */
	console.log("\n--- Calculator Tool ---");
	const mathResult = await runner.ask("What is 25 + 17?");
	console.log("👤 User: What is 25 + 17?");
	console.log("🧮 Calculator Result:", mathResult);

	/**
	 * Weather Tool Demo
	 */
	console.log("\n--- Weather Tool ---");
	const weatherResult = await runner.ask(
		"What's the weather like in San Francisco?",
	);
	console.log("👤 User: What's the weather like in San Francisco?");
	console.log("🌤️ Weather Result:", weatherResult);

	/**
	 * Multiple Simple Operations
	 */
	console.log("\n--- Multiple Operations ---");
	const multipleOps = await runner.ask(
		"Calculate 100 + 50, then tell me the weather in New York",
	);
	console.log(
		"👤 User: Calculate 100 + 50, then tell me the weather in New York",
	);
	console.log("🔧 Multiple Tools Result:", multipleOps);
}

/**
 * Demonstrates complex tool interactions and coordination
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateComplexToolInteractions(
	runner: EnhancedRunner,
): Promise<void> {
	console.log("\n=== Complex Tool Interactions ===");

	/**
	 * Context-Aware Tool Usage
	 */
	console.log("\n--- Context-Aware Usage ---");
	const contextResult = await runner.ask(
		"I'm planning a trip to Tokyo and Paris. I need to budget $50 per day for each city, and I'll be in Tokyo for 5 days and Paris for 7 days. Calculate my total budget and tell me the weather in both cities.",
	);
	console.log(
		"👤 User: I'm planning a trip to Tokyo and Paris. I need to budget $50 per day for each city, and I'll be in Tokyo for 5 days and Paris for 7 days. Calculate my total budget and tell me the weather in both cities.",
	);
	console.log("🌍 Complex Planning Result:", contextResult);

	/**
	 * Decision-Making with Tools
	 */
	console.log("\n--- Decision-Making with Tools ---");
	const decisionResult = await runner.ask(
		"I have two options: spend 3 days in London or 5 days in Berlin. Each day costs $80. Calculate the cost for each option and check the weather in both cities to help me decide.",
	);
	console.log(
		"👤 User: I have two options: spend 3 days in London or 5 days in Berlin. Each day costs $80. Calculate the cost for each option and check the weather in both cities to help me decide.",
	);
	console.log("🤔 Decision Support Result:", decisionResult);
}

/**
 * Demonstrates tool chaining and workflow patterns
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateToolChaining(runner: EnhancedRunner): Promise<void> {
	console.log("\n=== Tool Chaining and Workflows ===");

	/**
	 * Sequential Tool Chain
	 */
	console.log("\n--- Sequential Tool Chain ---");
	const sequentialResult = await runner.ask(
		"First, calculate how much 15 people would pay if they each contribute $25. Then, use that total amount to determine if it's enough for a group dinner budget where each person needs $35 worth of food.",
	);
	console.log(
		"👤 User: First, calculate how much 15 people would pay if they each contribute $25. Then, use that total amount to determine if it's enough for a group dinner budget where each person needs $35 worth of food.",
	);
	console.log("🔗 Sequential Chain Result:", sequentialResult);

	/**
	 * Conditional Tool Usage
	 */
	console.log("\n--- Conditional Tool Usage ---");
	const conditionalResult = await runner.ask(
		"Calculate 120 + 45. If the result is greater than 150, check the weather in Miami. If it's less than 150, check the weather in Seattle instead.",
	);
	console.log(
		"👤 User: Calculate 120 + 45. If the result is greater than 150, check the weather in Miami. If it's less than 150, check the weather in Seattle instead.",
	);
	console.log("🔀 Conditional Logic Result:", conditionalResult);

	/**
	 * Iterative Tool Usage
	 */
	console.log("\n--- Iterative Tool Usage ---");
	const iterativeResult = await runner.ask(
		"I'm comparing weather in 3 cities for a business trip. Check weather in Chicago, Boston, and Denver. Then calculate the total cost if flights are $200, $180, and $220 respectively, and help me choose the best option.",
	);
	console.log(
		"👤 User: I'm comparing weather in 3 cities for a business trip. Check weather in Chicago, Boston, and Denver. Then calculate the total cost if flights are $200, $180, and $220 respectively, and help me choose the best option.",
	);
	console.log("🔄 Iterative Analysis Result:", iterativeResult);
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
