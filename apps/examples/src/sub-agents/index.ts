import { env } from "node:process";
import { cancel, intro, isCancel, outro, text } from "@clack/prompts";
import { AgentBuilder, LlmAgent, createTool } from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod/v4";

/**
 * Sub-Agents Example
 *
 * A fun example with specialized sub-agents:
 * - Joke Agent: Tells random programming jokes
 * - Weather Agent: Gets weather info with a tool
 * - Calculator Agent: Does math with a tool
 */

// Create tools for the specialized agents
const calculatorTool = createTool({
	name: "calculate",
	description: "Performs basic math operations",
	schema: z.object({
		operation: z.enum(["add", "subtract", "multiply", "divide"]),
		a: z.number().describe("First number"),
		b: z.number().describe("Second number"),
	}),
	fn: ({ operation, a, b }) => {
		let result: number;
		switch (operation) {
			case "add":
				result = a + b;
				break;
			case "subtract":
				result = a - b;
				break;
			case "multiply":
				result = a * b;
				break;
			case "divide":
				result = b !== 0 ? a / b : Number.NaN;
				break;
		}
		return { operation, a, b, result };
	},
});

const weatherTool = createTool({
	name: "get_weather",
	description: "Gets current weather for a city",
	schema: z.object({
		city: z.string().describe("City name"),
	}),
	fn: ({ city }) => {
		// Mock weather data
		const conditions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
		const temps = [15, 18, 22, 25, 28, 30];

		return {
			city,
			temperature: temps[Math.floor(Math.random() * temps.length)],
			conditions: conditions[Math.floor(Math.random() * conditions.length)],
			humidity: Math.floor(Math.random() * 100),
		};
	},
});

async function createSubAgents() {
	// Joke Agent with built-in jokes
	const jokeAgent = new LlmAgent({
		name: "joke_agent",
		description: "Tells programming jokes",
		instruction: dedent`
			You are a comedian who specializes in programming jokes. Here are some jokes you know:

			- Why do programmers prefer dark mode? Because light attracts bugs!
			- How many programmers does it take to change a light bulb? None, that's a hardware problem.
			- Why do Java developers wear glasses? Because they can't C#!
			- What's a programmer's favorite hangout place? Foo Bar!
			- Why did the programmer quit his job? He didn't get arrays!
			- How do you comfort a JavaScript bug? You console it!

			When someone asks for a joke, pick one randomly or make up a similar programming joke. Be fun and enthusiastic!
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Weather Agent with weather tool
	const weatherAgent = new LlmAgent({
		name: "weather_agent",
		description: "Provides weather information",
		instruction: dedent`
			You are a friendly weather reporter. Use your weather tool to get current conditions
			and provide helpful weather updates.
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		tools: [weatherTool],
	});

	// Calculator Agent with math tool
	const calculatorAgent = new LlmAgent({
		name: "calculator_agent",
		description: "Performs calculations",
		instruction: dedent`
			You are a helpful calculator assistant. Use your calculation tool for any math
			operations and explain the results clearly.
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
		tools: [calculatorTool],
	});

	return { jokeAgent, weatherAgent, calculatorAgent };
}

async function createManagerAgent(subAgents: LlmAgent[]) {
	const { agent: managerAgent, runner } = await AgentBuilder.create(
		"agent_manager",
	)
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Coordinates specialized sub-agents")
		.withInstruction(dedent`
			You coordinate these specialist agents:

			- joke_agent: For programming jokes and humor
			- weather_agent: For weather information
			- calculator_agent: For math calculations

			When users ask questions, determine which agent can help and delegate appropriately.
			If the request doesn't match any specialist, handle it yourself.
		`)
		.build();

	// Set up sub-agent relationships
	managerAgent.subAgents = subAgents;
	subAgents.forEach((agent) => {
		agent.parentAgent = managerAgent;
	});

	return { managerAgent, runner };
}

async function main() {
	intro("🤖 Sub-Agents Example");

	// Create specialized sub-agents
	const { jokeAgent, weatherAgent, calculatorAgent } = await createSubAgents();
	const subAgents = [jokeAgent, weatherAgent, calculatorAgent];

	// Create manager agent
	const { runner } = await createManagerAgent(subAgents);

	console.log("Available agents: Joke 😄, Weather 🌤️, Calculator 🧮");
	console.log(
		"You can ask for jokes, weather, calculations, or anything else!",
	);

	while (true) {
		const userInput = await text({
			message: "What would you like to do?",
			placeholder:
				"e.g., 'tell me a joke', 'weather in Paris', 'what's 15 + 27?'",
		});

		if (isCancel(userInput)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		if (userInput === "exit" || userInput === "quit") {
			outro("👋 Thanks for trying sub-agents!");
			break;
		}

		try {
			console.log("\n🤖 Response:");
			const response = await runner.ask(userInput);
			console.log(response);
			console.log("---");
		} catch (error) {
			console.error("❌ Error:", error);
		}
	}
}

main().catch(console.error);
