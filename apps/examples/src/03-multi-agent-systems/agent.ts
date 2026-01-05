import {
	AgentBuilder,
	InMemoryMemoryService,
	LlmAgent,
	createTool,
} from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";

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

const jokeAgent = new LlmAgent({
	name: "joke_agent",
	description: "Specialized agent for programming jokes",
	instruction: dedent`
		You are a programming joke specialist. When asked for jokes,
		tell witty programming, tech, or computer science jokes.
		Keep them clean and clever.
	`,
	model: "gemini-2.5-flash",
});

const mathAgent = new LlmAgent({
	name: "math_agent",
	description: "Specialized agent for mathematical calculations",
	instruction: dedent`
		You are a math specialist. Use the calculator tool for calculations.
		Explain your work step by step and be precise.
	`,
	tools: [calculatorTool],
	model: "gemini-2.5-flash",
});

export async function agent() {
	const { runner } = await AgentBuilder.create("multi_agent_coordinator")
		.withModel("gemini-2.5-flash")
		.withDescription("Coordinates specialized sub-agents")
		.withInstruction(
			dedent`
			You coordinate specialized agents:
			- For jokes: delegate to joke_agent
			- For math problems: delegate to math_agent
			- For general questions: handle yourself
		`,
		)
		.withSubAgents([jokeAgent, mathAgent])
		.build();

	return runner;
}
