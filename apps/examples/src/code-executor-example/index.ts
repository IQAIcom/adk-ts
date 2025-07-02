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
		model: env.LLM_MODEL || "gemini-2.0-flash",
		description: "A coder agent that can execute Python code",
		instruction: `You are a coder agent. When given a mathematical expression or problem, 
write and execute Python code to solve it. Always show your work with code.`,
		codeExecutor: new BuiltInCodeExecutor(),
		disallowTransferToParent: true,
		disallowTransferToPeers: true,
	});
}

/**
 * Demonstrates basic code execution
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function demonstrateCodeExecution(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	console.log("🧮 Demonstrating Code Execution");
	console.log("-----------------------------------");

	const mathRequest = {
		parts: [
			{
				text: `tool_code
# Data analysis example
import pandas as pd
import numpy as np

# Create sample data
data = {'name': ['Alice', 'Bob', 'Charlie'], 
        'age': [25, 30, 35], 
        'score': [85, 92, 78]}
df = pd.DataFrame(data)

print("Sample Data:")
print(df)
print(f"\nAverage age: {df['age'].mean()}")
print(f"Average score: {df['score'].mean()}")
`,
			},
		],
	};

	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId,
		newMessage: mathRequest,
	})) {
		if (event.author === "code_agent" && event.content?.parts) {
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

		await demonstrateCodeExecution(runner, session.id);

		console.log("\n✅ Code Executor example completed!");
	} catch (error) {
		console.error("❌ Error in code executor example:", error);
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
