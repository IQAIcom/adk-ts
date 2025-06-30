import { GetUserChoiceTool } from "@iqai/adk";

/**
 * Get User Choice Tool Example
 *
 * This example demonstrates the GetUserChoiceTool API and structure.
 * The tool enables agents to present multiple choice questions to users
 * and wait for their selection during conversation flows.
 *
 * Note: This is a demonstration of the tool API structure, not a functional
 * interactive example. In a real implementation, this would be integrated
 * with the agent framework to handle user interaction properly.
 *
 * The example:
 * 1. Creates a GetUserChoiceTool instance
 * 2. Examines the tool's properties and declaration
 * 3. Simulates tool execution with mock arguments
 * 4. Shows expected behavior in real agent scenarios
 *
 * Expected Output:
 * - Tool properties and configuration
 * - Tool declaration structure in JSON format
 * - Simulated execution result
 * - Explanation of real-world behavior
 *
 * Prerequisites:
 * - Node.js environment
 */

/**
 * Demonstrates the GetUserChoiceTool properties and structure
 * @param tool The GetUserChoiceTool instance to examine
 */
function examineToolStructure(tool: GetUserChoiceTool): void {
	console.log("🔧 Tool Properties:");
	console.log(`   Name: ${tool.name}`);
	console.log(`   Description: ${tool.description}`);
	console.log(`   Is long running: ${tool.isLongRunning}`);

	console.log("\n📋 Tool Declaration:");
	console.log(JSON.stringify(tool.getDeclaration(), null, 2));
}

/**
 * Simulates tool execution with example arguments
 * @param tool The GetUserChoiceTool instance to execute
 */
async function simulateToolExecution(tool: GetUserChoiceTool): Promise<void> {
	console.log("\n🎮 Simulating tool execution:");

	/**
	 * Create mock context for tool execution
	 * In real usage, this context is provided by the agent framework
	 */
	const mockContext = {
		actions: {},
	};

	/**
	 * Example arguments showing multiple choice options
	 * This demonstrates how an agent would present choices to a user
	 */
	const args = {
		options: ["Pizza", "Burger", "Salad", "Pasta", "Sushi"],
		question: "What would you like to eat?",
	};

	console.log("📝 Arguments:", args);

	/**
	 * Execute the tool with mock arguments
	 * In real scenarios, this would trigger user interaction
	 */
	const result = await tool.runAsync(args, mockContext as any);

	console.log("✅ Result:", result);
	console.log("🔄 Context actions after execution:", mockContext.actions);
}

/**
 * Explains the real-world behavior of the tool in agent scenarios
 */
function explainRealWorldBehavior(): void {
	console.log("\n🌍 In a real agent implementation:");
	console.log("1. The tool would return null initially");
	console.log(
		"2. The framework would pause execution and present options to the user",
	);
	console.log(
		"3. When the user makes a choice, the framework would resume execution",
	);
	console.log(
		"4. The agent would receive the user's choice and continue processing",
	);
	console.log("5. This enables interactive decision-making in conversations");
}

async function main() {
	console.log("🎯 Starting Get User Choice Tool example...");
	console.log(
		"📌 Note: This demonstrates the tool API, not functional user interaction",
	);

	try {
		/**
		 * Create the GetUserChoiceTool instance
		 * This tool enables agents to present multiple choice questions
		 */
		const getUserChoiceTool = new GetUserChoiceTool();

		/**
		 * Examine tool properties and structure
		 * Shows the tool's configuration and declaration format
		 */
		examineToolStructure(getUserChoiceTool);

		/**
		 * Simulate tool execution
		 * Demonstrates how the tool processes arguments and returns results
		 */
		await simulateToolExecution(getUserChoiceTool);

		/**
		 * Explain real-world usage
		 * Clarifies how the tool works in actual agent conversations
		 */
		explainRealWorldBehavior();

		console.log("\n✅ Get User Choice Tool example completed!");
	} catch (error) {
		console.error("❌ Error in get user choice tool example:", error);
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
