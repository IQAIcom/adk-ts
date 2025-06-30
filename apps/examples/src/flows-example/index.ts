import { env } from "node:process";
import {
	FileOperationsTool,
	InMemorySessionService,
	LlmAgent,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "flows-example";
const USER_ID = uuidv4();

/**
 * Flows Example
 *
 * This example demonstrates the basic flow capabilities of the ADK framework.
 * Flows handle the processing pipeline for agent interactions, including tool
 * calling and response generation.
 *
 * The example:
 * 1. Creates an agent with file operations tool
 * 2. Demonstrates automatic flow selection (SingleFlow)
 * 3. Shows tool execution within the flow pipeline
 * 4. Illustrates basic flow processing capabilities
 *
 * Expected Output:
 * - File creation using the FileOperationsTool
 * - Flow processing confirmation
 * - Agent response showing successful file operations
 *
 * Prerequisites:
 * - Node.js environment
 * - Write permissions in the current directory
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */

/**
 * Creates and configures the LLM agent with file operations capability
 * @returns Configured LlmAgent with FileOperationsTool
 */
function createFlowAgent(): LlmAgent {
	return new LlmAgent({
		name: "flow_specialist",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "Demonstrates flow processing with file operations",
		instruction: `You are a file management specialist. Use the file_operations tool to handle file requests.
When asked to create a file, use the file_operations tool with operation: "write".
When asked to read a file, use the file_operations tool with operation: "read".
Always use the tools available to you and be clear about the operations you perform.`,
		tools: [new FileOperationsTool()],
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});
}

/**
 * Demonstrates basic flow processing with tool execution
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function demonstrateBasicFlow(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	console.log("🔄 Demonstrating SingleFlow with tool execution");
	console.log("-----------------------------------");

	/**
	 * Send a file creation request
	 * The flow will automatically handle tool calling and response generation
	 */
	const fileRequest = {
		parts: [
			{
				text: `Create a file called "flow-demo.txt" with the content "Flows are working perfectly!"`,
			},
		],
	};

	console.log("📝 Request: Creating a demonstration file");
	console.log("✅ Flow Response:");

	/**
	 * Process the request through the flow pipeline
	 * SingleFlow will handle tool execution automatically
	 */
	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId,
		newMessage: fileRequest,
	})) {
		if (event.author === "flow_specialist" && event.content?.parts) {
			const content = event.content.parts
				.map((part) => part.text || "")
				.join("");
			if (content) {
				console.log(content);
			}
		}
	}
}

async function main() {
	console.log("🌊 Starting Flows example...");

	try {
		/**
		 * Set up session management
		 * Creates a persistent session for the demonstration
		 */
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		/**
		 * Create agent with flow processing capabilities
		 * SingleFlow will be used automatically for tool execution
		 */
		const agent = createFlowAgent();

		/**
		 * Set up runner for agent execution
		 * The runner coordinates between agents and flows
		 */
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		/**
		 * Demonstrate basic flow processing
		 * Shows how flows handle tool execution and response generation
		 */
		await demonstrateBasicFlow(runner, session.id);

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
