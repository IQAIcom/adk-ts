import { env } from "node:process";
import { AgentBuilder, FileOperationsTool } from "@iqai/adk";

async function main() {
	console.log("🌊 Starting Flows example...");

	try {
		/**
		 * Create agent with flow processing capabilities using AgentBuilder
		 * SingleFlow will be used automatically for tool execution
		 */
		const { runner } = await AgentBuilder.create("flow_specialist")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription("Demonstrates flow processing with file operations")
			.withInstruction(`You are a file management specialist. Use the file_operations tool to handle file requests.
When asked to create a file, use the file_operations tool with operation: "write".
When asked to read a file, use the file_operations tool with operation: "read".
Always use the tools available to you and be clear about the operations you perform.`)
			.withTools(new FileOperationsTool())
			.build();

		/**
		 * Demonstrate basic flow processing with tool execution
		 * The flow will automatically handle tool calling and response generation
		 */
		console.log("🔄 Demonstrating SingleFlow with tool execution");
		console.log("-----------------------------------");

		const fileRequest = `Create a file called "flow-demo.txt" with the content "Flows are working perfectly!"`;

		console.log("📝 Request: Creating a demonstration file");
		console.log("✅ Flow Response:");

		/**
		 * Process the request through the flow pipeline using simplified API
		 * SingleFlow will handle tool execution automatically
		 */
		const response = await runner.ask(fileRequest);
		console.log(response);

		console.log("\n✅ Flows example completed!");
	} catch (error) {
		console.error("❌ Error in flows example:", error);
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
