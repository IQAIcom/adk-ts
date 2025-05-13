import * as dotenv from "dotenv";
import { Agent, type Message, type MessageRole } from "../../src";
import { OpenAILLM } from "../../src/llm/providers/openai/OpenAILLM";
import { LLMRegistry } from "../../src/llm/registry/LLMRegistry";
import { CalculatorTool } from "./calculator";
import { WeatherTool } from "./weather";
// Load environment variables from .env file
dotenv.config();

// Register the OpenAI LLM
LLMRegistry.registerLLM(OpenAILLM);

// Enable debug mode for showing agent loop
const DEBUG = true;

/**
 * Demonstrates the Agent loop with tool execution
 */
async function main() {
	try {
		// Create the agent with custom tools
		const agent = new Agent({
			name: "tool_assistant",
			model: process.env.LLM_MODEL || "gpt-4-turbo",
			description: "An assistant that demonstrates tool usage",
			instructions:
				"You are a helpful assistant that can perform calculations and check the weather. Use the appropriate tools when asked about math or weather.",
			tools: [new CalculatorTool(), new WeatherTool()],
			maxToolExecutionSteps: 5, // Limit the tool execution steps
		});

		console.log("Agent initialized with custom tools");
		console.log("-----------------------------------");

		if (DEBUG) {
			// Add debug wrapper for agent.run
			const originalRun = agent.run.bind(agent);
			agent.run = async (options) => {
				console.log(
					"\n[DEBUG] Starting agent loop with query:",
					options.messages[options.messages.length - 1].content,
				);
				const result = await originalRun(options);
				console.log("[DEBUG] Agent loop completed");
				return result;
			};
		}

		// Example 1: Calculator tool usage
		console.log("\nExample 1: Calculator Tool");
		console.log("Question: What is 24 multiplied by 7?");
		console.log("-----------------------------------");

		const calcResponse = await agent.run({
			messages: [
				{ role: "user" as MessageRole, content: "What is 24 multiplied by 7?" },
			],
		});

		console.log("Final Response:", calcResponse.content);
		console.log("-----------------------------------");

		// Example 2: Weather tool usage
		console.log("\nExample 2: Weather Tool");
		console.log("Question: What's the weather like in Stockholm today?");
		console.log("-----------------------------------");

		const weatherResponse = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: "What's the weather like in Stockholm today?",
				},
			],
		});

		console.log("Final Response:", weatherResponse.content);
		console.log("-----------------------------------");

		// Example 3: Multi-tool conversation
		console.log("\nExample 3: Multi-tool conversation");
		console.log(
			"Question: I need to know the weather in Paris and then calculate how many euros I need if I spend 25 euros per day for 7 days.",
		);
		console.log("-----------------------------------");

		const multiToolResponse = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content:
						"I need to know the weather in Paris and then calculate how many euros I need if I spend 25 euros per day for 7 days.",
				},
			],
		});

		console.log("Final Response:", multiToolResponse.content);
		console.log("-----------------------------------");

		// Example 4: Multi-turn conversation with tool use
		console.log("\nExample 4: Multi-turn conversation");
		console.log("-----------------------------------");

		const conversation: Message[] = [
			{
				role: "user" as MessageRole,
				content:
					"Hi, I'm planning a trip to New York. What's the weather like there?",
			},
		];

		// First turn
		let response = await agent.run({ messages: [...conversation] });
		console.log(
			"User: Hi, I'm planning a trip to New York. What's the weather like there?",
		);
		console.log("Assistant:", response.content);

		// Add response to conversation
		conversation.push({ role: "assistant", content: response.content || "" });

		// Second turn
		conversation.push({
			role: "user",
			content:
				"Great! If I stay for 5 days and hotels cost $200 per night, how much will I spend on accommodation?",
		});
		console.log(
			"\nUser: Great! If I stay for 5 days and hotels cost $200 per night, how much will I spend on accommodation?",
		);

		response = await agent.run({ messages: [...conversation] });
		console.log("Assistant:", response.content);

		// Add response to conversation
		conversation.push({ role: "assistant", content: response.content || "" });

		// Third turn
		conversation.push({
			role: "user",
			content:
				"And what will the total be if I also spend $100 per day on food and activities?",
		});
		console.log(
			"\nUser: And what will the total be if I also spend $100 per day on food and activities?",
		);

		response = await agent.run({ messages: [...conversation] });
		console.log("Assistant:", response.content);

		console.log("\nTool usage examples complete!");
	} catch (error) {
		console.error("Error:", error);
	}
}

// Run the example
main().catch((error) => {
	console.error("Error:", error);
});
