import { env } from "node:process";
import { cancel, intro, isCancel, outro, text } from "@clack/prompts";
import {
	AgentBuilder,
	InMemoryMemoryService,
	InMemorySessionService,
	LlmAgent,
	createTool,
} from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";
import { ask } from "../utils";

/**
 * 04 - Agent Composition and Multi-Agent Systems
 *
 * Learn how to create multi-agent systems where agents work together
 * and share information.
 *
 * Concepts covered:
 * - Multi-agent coordination patterns
 * - Agent output keys for data passing
 * - Shared memory between agents
 * - Sub-agent delegation
 * - State sharing strategies
 */

// Shared tools for agents
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
	description: "Gets mock weather information for a city",
	schema: z.object({
		city: z.string().describe("City name"),
	}),
	fn: ({ city }) => ({
		city,
		temperature: Math.floor(Math.random() * 35) + 5,
		conditions: ["sunny", "cloudy", "rainy", "snowy"][
			Math.floor(Math.random() * 4)
		],
		humidity: Math.floor(Math.random() * 100),
	}),
});

async function demonstrateOutputKeys() {
	console.log("📝 Part 1: Agent Output Keys (Sequential Processing)");
	console.log("══════════════════════════════════════════════════\n");

	// Customer analyzer agent
	const customerAnalyzer = new LlmAgent({
		name: "customer_analyzer",
		description:
			"Analyzes customer restaurant orders for preferences and restrictions",
		instruction: dedent`
			You are a customer service agent that analyzes food orders.
			Extract the following information from the customer's request:
			- Items they want to order
			- Dietary restrictions (allergic, vegetarian, vegan, gluten-free, etc.)
			- Special preferences (spicy level, cooking style, etc.)
			- Budget constraints if mentioned

			Return only the extracted information in a clear, structured format.
		`,
		outputKey: "customer_preferences", // This data becomes available to subsequent agents
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Menu validator agent
	const menuValidator = new LlmAgent({
		name: "menu_validator",
		description: "Validates items against menu and suggests alternatives",
		instruction: dedent`
			You are a restaurant menu specialist. Based on the customer preferences: {customer_preferences}

			Our restaurant menu includes:
			- Burgers (beef, chicken, veggie, black bean)
			- Pizzas (margherita, pepperoni, veggie supreme, vegan cheese)
			- Salads (caesar, greek, quinoa power bowl)
			- Pasta (spaghetti, penne, gluten-free options available)
			- Desserts (cheesecake, chocolate cake, fruit sorbet)

			Check if requested items are available. If not available or if dietary restrictions conflict,
			suggest suitable alternatives from our menu. Consider their budget if mentioned.
		`,
		outputKey: "menu_validation",
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Order finalizer agent
	const orderFinalizer = new LlmAgent({
		name: "order_finalizer",
		description: "Finalizes the order with pricing and confirmation",
		instruction: dedent`
			You are the order finalizer. Based on:
			- Customer preferences: {customer_preferences}
			- Menu validation: {menu_validation}

			Create a final order summary with:
			- Final menu items selected
			- Individual prices (generate realistic prices $8-25 per item)
			- Total cost calculation
			- Estimated preparation time (15-45 minutes)
			- Special instructions for the kitchen

			Format as a clear order confirmation.
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Create runner with sequential agents
	const { runner } = await AgentBuilder.create("restaurant_order_system")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withSubAgents([customerAnalyzer, menuValidator, orderFinalizer])
		.build();

	console.log("🍽️ Restaurant order processing:");
	await ask(
		runner,
		"I'd like to order something vegetarian, not too spicy, around $20. Maybe a salad or pasta?",
	);
}

async function demonstrateSharedMemory() {
	const sharedMemory = new InMemoryMemoryService();

	// Helper function to create agents with shared memory
	async function createAgentWithSharedMemory(
		name: string,
		description: string,
		instruction: string,
	) {
		const { runner } = await AgentBuilder.create(name)
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription(description)
			.withInstruction(instruction)
			.withMemory(sharedMemory)
			.build();
		return runner;
	}

	// Agent Alice: Book expert
	const alice = await createAgentWithSharedMemory(
		"alice",
		"Alice is a book lover who can remember what Bob says about movies",
		dedent`
			You are Alice. Bob is your friend and movie enthusiast.
			You love books and answer questions about literature.
			You can recall what Bob has said about movies from your shared memory.
			Keep responses concise and attribute information to Bob when relevant.
		`,
	);

	// Agent Bob: Movie expert
	const bob = await createAgentWithSharedMemory(
		"bob",
		"Bob is a movie lover who can remember what Alice says about books",
		dedent`
			You are Bob. Alice is your friend and book enthusiast.
			You love movies and answer questions about cinema.
			You can recall what Alice has said about books from your shared memory.
			Keep responses concise and attribute information to Alice when relevant.
		`,
	);

	console.log("\n📚 Alice's favorite book:");
	const aliceResponse1 = await ask(
		alice.ask.bind(alice),
		"What's your favorite book and why?",
		true,
	);
	console.log(`🤖 Alice: ${aliceResponse1}\n`);

	console.log("🎬 Bob's favorite movie:");
	const bobQuery1 = "What's your favorite movie and why?";
	const bobResponse1 = await ask(bob.ask.bind(bob), bobQuery1, true);
	console.log(`🤖 Bob: ${bobResponse1}\n`);

	console.log("🤝 Alice recalls Bob's movie:");
	const aliceQuery2 = "What did Bob say was his favorite movie?";
	const aliceResponse2 = await ask(alice.ask.bind(alice), aliceQuery2, true);
	console.log(`🤖 Alice: ${aliceResponse2}\n`);

	console.log("🤝 Bob recalls Alice's book:");
	const bobResponse2 = await ask(
		bob.ask.bind(bob),
		"What did Alice say was her favorite book?",
		true,
	);
	console.log(`🤖 Bob: ${bobResponse2}\n`);
}

async function demonstrateSubAgents() {
	console.log("📝 Part 3: Sub-Agent Delegation");
	console.log("═══════════════════════════════════\n");

	// Specialized sub-agents
	const jokeAgent = new LlmAgent({
		name: "joke_agent",
		description: "Specialized agent for programming jokes",
		instruction: dedent`
			You are a programming joke specialist. When asked for jokes,
			tell witty programming, tech, or computer science jokes.
			Keep them clean and clever. Only respond with jokes when requested.
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const mathAgent = new LlmAgent({
		name: "math_agent",
		description: "Specialized agent for mathematical calculations",
		instruction: dedent`
			You are a math specialist. Use the calculator tool for any calculations.
			Explain your work step by step and be precise with mathematical operations.
		`,
		tools: [calculatorTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const weatherAgent = new LlmAgent({
		name: "weather_agent",
		description: "Specialized agent for weather information",
		instruction: dedent`
			You are a weather specialist. Use the weather tool for any weather queries.
			Provide detailed weather information and helpful context.
		`,
		tools: [weatherTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Main coordinator agent
	const coordinator = new LlmAgent({
		name: "coordinator",
		description: "Coordinates requests to specialized sub-agents",
		instruction: dedent`
			You are a helpful coordinator that delegates tasks to specialized agents:
			- For jokes: delegate to joke_agent
			- For math problems: delegate to math_agent
			- For weather queries: delegate to weather_agent
			- For general questions: handle yourself

			Always introduce the specialist and explain why you're delegating.
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	// Create the multi-agent system
	const { runner } = await AgentBuilder.create("specialized_assistant")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withSubAgents([coordinator, jokeAgent, mathAgent, weatherAgent])
		.build();

	// Test sub-agent delegation
	console.log("😄 Testing joke delegation:");
	await ask(runner, "Tell me a programming joke");

	console.log("🧮 Testing math delegation:");
	await ask(runner, "What's 127 multiplied by 43?");

	console.log("🌤️ Testing weather delegation:");
	await ask(runner, "What's the weather like in San Francisco?");

	console.log("💬 Testing general query (no delegation):");
	await ask(runner, "What's the capital of Australia?");
}

async function demonstrateInteractiveMultiAgent() {
	console.log("📝 Part 4: Interactive Multi-Agent System");
	console.log("════════════════════════════════════════\n");

	// Create a conversational multi-agent system
	const sessionService = new InMemorySessionService();

	const { runner } = await AgentBuilder.create("multi_agent_assistant")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("A multi-agent assistant with specialized capabilities")
		.withInstruction(
			dedent`
			You coordinate a team of specialists:
			- Math operations (with calculator tool)
			- Weather information (with weather tool)
			- General knowledge and conversation

			Determine which specialist to use based on user requests.
			Provide clear, helpful responses and explain your reasoning.
		`,
		)
		.withTools(calculatorTool, weatherTool)
		.withSessionService(sessionService)
		.build();

	intro("🤖 Multi-Agent Assistant");
	console.log("I coordinate a team of specialists to help you with:");
	console.log("• Mathematical calculations");
	console.log("• Weather information");
	console.log("• General questions and conversation\n");

	while (true) {
		const userInput = await text({
			message: "What can we help you with?",
			placeholder: "Ask about math, weather, or anything else...",
		});

		if (isCancel(userInput)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		if (userInput === "exit" || userInput === "quit") {
			outro("👋 Goodbye from the agent team!");
			break;
		}

		try {
			await ask(runner, userInput);
			console.log("─".repeat(50));
		} catch (error) {
			console.error("❌ Error:", error);
		}
	}
}

async function main() {
	console.log("🤝 Agent composition:");

	await demonstrateOutputKeys();
	await demonstrateSharedMemory();
	await demonstrateSubAgents();
	await demonstrateInteractiveMultiAgent();
}

main().catch(console.error);
