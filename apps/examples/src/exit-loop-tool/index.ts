import { env } from "node:process";
import {
	ExitLoopTool,
	InMemorySessionService,
	LlmAgent,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "exit-loop-example";
const USER_ID = uuidv4();
const MAX_ITERATIONS = 5;

/**
 * Exit Loop Tool Example
 *
 * This example demonstrates how to use the ExitLoopTool to allow an LLM agent
 * to break out of a programmatic loop when certain conditions are met or when
 * explicitly requested by the user.
 *
 * The example:
 * 1. Creates an agent with access to the ExitLoopTool
 * 2. Runs a controlled loop with multiple iterations
 * 3. Shows how the agent can exit the loop early using the tool
 * 4. Demonstrates loop control through natural language commands
 *
 * Expected Output:
 * - Loop iteration messages showing progress
 * - Agent responses for each iteration
 * - Early loop exit when the exit tool is called (on iteration 3)
 * - Final summary of loop execution
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */

/**
 * Creates and configures the LLM agent with exit loop tool
 * @returns Configured LlmAgent with ExitLoopTool
 */
function createExitLoopAgent(): LlmAgent {
	return new LlmAgent({
		name: "exit_loop_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"An agent that demonstrates the exit loop tool using Google Gemini",
		instruction: `You are a helpful assistant that can exit a loop when asked to do so.
Use the exit_loop tool when the user explicitly asks you to exit the loop.
Do not use the exit_loop tool unless specifically instructed.
Always mention the current iteration number provided in the user's message.
Be clear about whether you're continuing or exiting the loop.`,
		tools: [new ExitLoopTool()],
	});
}

/**
 * Generates a user message for the current loop iteration
 * @param iteration Current iteration number
 * @returns Message string for the agent
 */
function generateUserMessage(iteration: number): string {
	// Exit the loop on iteration 3 for demonstration
	return iteration === 3
		? `Currently on iteration ${iteration}. Please exit the loop now`
		: `Currently on iteration ${iteration}. Continue the loop and tell me which iteration we're on`;
}

/**
 * Processes a single loop iteration
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 * @param iteration Current iteration number
 * @returns True if the loop should exit, false otherwise
 */
async function processLoopIteration(
	runner: Runner,
	sessionId: string,
	iteration: number,
): Promise<boolean> {
	console.log(`\n--- Loop iteration ${iteration} of ${MAX_ITERATIONS} ---`);

	/**
	 * Generate and display user message
	 * Simulates user input for this iteration
	 */
	const userMessage = generateUserMessage(iteration);
	console.log(`User says: "${userMessage}"`);

	const newMessage = {
		parts: [{ text: userMessage }],
	};

	let agentResponse = "";
	let exitToolCalled = false;

	try {
		/**
		 * Process agent response and monitor for exit tool calls
		 * The agent will either continue the loop or call the exit tool
		 */
		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId,
			newMessage,
		})) {
			// Collect agent responses
			if (event.author === "exit_loop_demo" && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) {
					agentResponse += content;
				}
			}

			// Monitor for exit_loop tool calls
			const functionCalls = event.getFunctionCalls();
			if (functionCalls) {
				for (const functionCall of functionCalls) {
					if (functionCall.name === "exit_loop") {
						console.log("Exit loop tool was called. Exiting loop early.");
						exitToolCalled = true;
						break;
					}
				}
			}

			if (exitToolCalled) break;
		}

		if (agentResponse) {
			console.log("Agent response:", agentResponse);
		}
	} catch (error) {
		console.error(`❌ Error in loop iteration ${iteration}:`, error);
	}

	return exitToolCalled;
}

/**
 * Runs the main loop demonstration
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function runLoopDemo(runner: Runner, sessionId: string): Promise<void> {
	console.log(
		`Starting the loop example with ${MAX_ITERATIONS} iterations. The agent will exit early on iteration 3.`,
	);

	let loopCount = 0;
	let exitLoop = false;

	/**
	 * Main loop execution
	 * Continues until max iterations or exit tool is called
	 */
	while (loopCount < MAX_ITERATIONS && !exitLoop) {
		loopCount++;
		exitLoop = await processLoopIteration(runner, sessionId, loopCount);
	}

	/**
	 * Display final results
	 * Shows whether the loop completed naturally or was exited early
	 */
	console.log("\nLoop has finished. Final loop count:", loopCount);
	console.log(
		exitLoop
			? "Loop exited early via exit_loop tool."
			: "Loop completed all iterations.",
	);
}

async function main() {
	console.log("🔄 Starting Exit Loop Tool example...");

	try {
		/**
		 * Set up session management
		 * Creates a persistent session for the loop demonstration
		 */
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		/**
		 * Create agent with exit loop capability
		 * The agent can break out of loops when instructed
		 */
		const agent = createExitLoopAgent();

		/**
		 * Set up runner for agent execution
		 * Handles the communication and execution flow
		 */
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		/**
		 * Run the loop demonstration
		 * Shows controlled loop execution with agent-driven exit
		 */
		await runLoopDemo(runner, session.id);

		console.log("\n✅ Exit loop tool example completed!");
	} catch (error) {
		console.error("❌ Error in exit loop example:", error);
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
