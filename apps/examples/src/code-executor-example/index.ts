import { env } from "node:process";
import { InMemorySessionService, LlmAgent, Runner } from "@iqai/adk";
import { BuiltInCodeExecutor } from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "code-executor-example";
const USER_ID = uuidv4();

/**
 * Creates and configures the LLM agent with code execution capability
 * @returns Configured LlmAgent with BuiltInCodeExecutor
 */
function createCodeAgent(): LlmAgent {
	return new LlmAgent({
		name: "code_agent",
		model: "gemini-2.0-flash",
		description: "A coder agent that can execute Python code",
		instruction: `You are a coder agent. When given a mathematical expression or problem,
write and execute Python code to solve it. Always show your work with code.`,
		codeExecutor: new BuiltInCodeExecutor(),
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});
}

async function main() {
	console.log("🚀 Starting Code Executor example...");

	try {
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		const agent = createCodeAgent();

		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		/**
		 * Demonstrate code execution with a mathematical problem
		 * Using runner.ask() for simplified response handling
		 */
		console.log("🧮 Demonstrating Code Execution");
		console.log("-----------------------------------");

		const mathProblem =
			"Create a list of numbers from 1 to 5, square each number, and then find the sum of the squared numbers.";
		console.log(`📝 Problem: ${mathProblem}`);
		console.log("🤖 Agent Response:");

		// Create a simple runner.ask() equivalent for this specific runner
		const response = await askRunner(runner, session.id, mathProblem);
		console.log(response);

		console.log("\n✅ Code Executor example completed!");
	} catch (error) {
		console.error("❌ Error in code executor example:", error);
		process.exit(1);
	}
}

/**
 * Simple ask function that mimics AgentBuilder's runner.ask() pattern
 * @param runner The Runner instance
 * @param sessionId The session ID
 * @param message The message to send
 * @returns The agent's response as a string
 */
async function askRunner(
	runner: Runner,
	sessionId: string,
	message: string,
): Promise<string> {
	let response = "";

	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId,
		newMessage: { parts: [{ text: message }] },
	})) {
		if (event.author === "code_agent" && event.content?.parts) {
			const content = event.content.parts
				.map((part) => part.text || "")
				.join("");
			if (content) {
				response += content;
			}
		}
	}

	return response || "No response from agent";
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
