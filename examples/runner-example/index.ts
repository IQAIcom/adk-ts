import {
	Agent,
	LLMRegistry,
	OpenAILLM,
	StreamingMode,
	type Message,
	type MessageRole,
	RunConfig,
} from "@adk";
import * as dotenv from "dotenv";
import * as readline from "node:readline";
import chalk from "chalk";

// Load environment variables from .env file if it exists
dotenv.config();

// Register the OpenAI LLM
LLMRegistry.registerLLM(OpenAILLM);

// Create readline interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

// Promise-based prompt function
function prompt(question: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer);
		});
	});
}

async function runConversation() {
	console.log(
		chalk.blue.bold(
			"🤖 Starting a direct agent example with OpenAI's model...",
		),
	);

	// Initialize the agent with OpenAI's model
	const agent = new Agent({
		name: "direct_assistant",
		model: "gpt-3.5-turbo",
		description: "A direct assistant using OpenAI",
		instructions:
			"You are a helpful assistant. Answer questions accurately and concisely. Each response should be different and directly address the user's specific question.",
	});

	console.log(
		chalk.cyan(
			"\n💬 You can now chat with the assistant. Type 'exit' to quit.",
		),
	);

	// Store conversation history
	const messages: Message[] = [
		{
			role: "system" as MessageRole,
			content:
				"You are a helpful assistant. Answer questions accurately and concisely. Each response should be different and directly address the user's specific question.",
		},
	];

	let userInput = "";

	while (userInput.toLowerCase() !== "exit") {
		userInput = await prompt(chalk.yellow.bold("\n👤 You: "));

		if (userInput.toLowerCase() === "exit") {
			break;
		}

		if (userInput.trim() !== "") {
			// Add user message to history
			messages.push({
				role: "user" as MessageRole,
				content: userInput,
			});

			// Process with agent
			await processMessages(agent, messages);
		}
	}

	console.log(chalk.blue.bold("\n✅ Chat session ended. Goodbye!"));
	rl.close();
}

async function processMessages(agent: Agent, messages: Message[]) {
	console.log(chalk.cyan("🤖 Assistant: "));

	try {
		// Use streaming for a better experience
		let fullResponse = "";
		let streamContent = "";

		for await (const response of agent.runStreaming({
			messages,
			config: new RunConfig({
				streamingMode: StreamingMode.SSE,
			}),
		})) {
			if (response.is_partial) {
				process.stdout.write(chalk.green(response.content || ""));
				streamContent += response.content || "";
			} else {
				fullResponse = response.content || "";

				// If we haven't already streamed everything, show the full response
				if (streamContent.trim() !== fullResponse.trim()) {
					console.log(chalk.dim("\nFull response:"), chalk.green(fullResponse));
				} else {
					// We've already streamed the content, just add a newline
					console.log();
				}
			}
		}

		// Add assistant's response to history for next iteration
		messages.push({
			role: "assistant" as MessageRole,
			content: fullResponse,
		});
	} catch (error: any) {
		console.error(
			chalk.red("Error processing message:"),
			error?.message || String(error),
		);
	}
}

// Run the example
runConversation().catch((error) => {
	console.error(chalk.red("❌ Error in direct agent example:"), error);
});
