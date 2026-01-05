import { env } from "node:process";
import {
	AgentBuilder,
	InMemoryMemoryService,
	LlmAgent,
	createTool,
} from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";
import { ask } from "../utils";

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

async function demonstrateOutputKeys() {
	console.log("📝 Part 1: Output Keys (Sequential Processing)\n");

	const customerAnalyzer = new LlmAgent({
		name: "customer_analyzer",
		description: "Analyzes customer restaurant orders",
		instruction: dedent`
			Extract order items, dietary restrictions, special preferences, and budget constraints.
			Return the extracted information in a clear, structured format.
		`,
		outputKey: "customer_preferences",
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const menuValidator = new LlmAgent({
		name: "menu_validator",
		description: "Validates items against menu",
		instruction: dedent`
			Based on customer preferences: {customer_preferences}

			Menu: Burgers (beef, chicken, veggie), Pizzas (margherita, pepperoni, veggie), Salads (caesar, greek, quinoa), Pasta (spaghetti, penne, gluten-free), Desserts (cheesecake, chocolate cake, fruit sorbet)

			Check availability and suggest alternatives if needed.
		`,
		outputKey: "menu_validation",
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const orderFinalizer = new LlmAgent({
		name: "order_finalizer",
		description: "Finalizes order with pricing",
		instruction: dedent`
			Based on:
			- Customer preferences: {customer_preferences}
			- Menu validation: {menu_validation}

			Create final order summary with items, prices ($8-25 per item), total, and prep time (15-45 min).
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const { runner } = await AgentBuilder.create("restaurant_order_system")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withSubAgents([customerAnalyzer, menuValidator, orderFinalizer])
		.build();

	await ask(
		runner,
		"I'd like something vegetarian, not too spicy, around $20. Maybe a salad or pasta?",
	);
}

async function demonstrateSharedMemory() {
	console.log("\n📚 Part 2: Shared Memory Between Agents\n");

	const sharedMemory = new InMemoryMemoryService();

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

	const alice = await createAgentWithSharedMemory(
		"alice",
		"Book expert who remembers Bob's movie opinions",
		dedent`
			You are Alice, a book lover. Bob is your friend and movie enthusiast.
			You can recall what Bob has said about movies from shared memory.
			Keep responses concise and attribute information to Bob when relevant.
		`,
	);

	const bob = await createAgentWithSharedMemory(
		"bob",
		"Movie expert who remembers Alice's book opinions",
		dedent`
			You are Bob, a movie lover. Alice is your friend and book enthusiast.
			You can recall what Alice has said about books from shared memory.
			Keep responses concise and attribute information to Alice when relevant.
		`,
	);

	console.log("📚 Alice's favorite book:");
	const aliceResponse1 = await ask(
		alice.ask.bind(alice),
		"What's your favorite book and why?",
		true,
	);
	console.log(`🤖 Alice: ${aliceResponse1}\n`);

	console.log("🎬 Bob's favorite movie:");
	const bobResponse1 = await ask(
		bob.ask.bind(bob),
		"What's your favorite movie and why?",
		true,
	);
	console.log(`🤖 Bob: ${bobResponse1}\n`);

	console.log("🤝 Alice recalls Bob's movie:");
	const aliceResponse2 = await ask(
		alice.ask.bind(alice),
		"What did Bob say was his favorite movie?",
		true,
	);
	console.log(`🤖 Alice: ${aliceResponse2}\n`);
}

async function demonstrateSubAgents() {
	console.log("🎭 Part 3: Sub-Agent Delegation\n");

	const jokeAgent = new LlmAgent({
		name: "joke_agent",
		description: "Specialized agent for programming jokes",
		instruction: dedent`
			You are a programming joke specialist. Tell witty programming, tech, or computer science jokes.
			Keep them clean and clever.
		`,
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const mathAgent = new LlmAgent({
		name: "math_agent",
		description: "Specialized agent for math calculations",
		instruction: dedent`
			You are a math specialist. Use the calculator tool for calculations.
			Explain your work step by step.
		`,
		tools: [calculatorTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const { runner } = await AgentBuilder.create("specialized_assistant")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withSubAgents([jokeAgent, mathAgent])
		.withInstruction(
			dedent`
			You coordinate specialized agents:
			- For jokes: delegate to joke_agent
			- For math problems: delegate to math_agent
			- For general questions: handle yourself
		`,
		)
		.build();

	await ask(runner, "Tell me a programming joke");
	await ask(runner, "What's 127 multiplied by 43?");
	await ask(runner, "What's the capital of Australia?");
}

async function demonstrateLangGraphWorkflow() {
	console.log("\n🔄 Part 4: LangGraph State Machine\n");

	const workflowStateTool = createTool({
		name: "update_workflow_state",
		description: "Update workflow state and progress",
		schema: z.object({
			stage: z.string().describe("Current workflow stage"),
			status: z
				.enum(["pending", "in_progress", "completed", "failed"])
				.describe("Stage status"),
			data: z
				.record(z.string(), z.any())
				.optional()
				.describe("Stage-specific data"),
		}),
		fn: ({ stage, status, data }, context) => {
			const workflow = context.state.get("workflow", {
				stages: {},
				progress: [],
			});
			workflow.stages[stage] = {
				status,
				data: data || {},
				timestamp: new Date().toISOString(),
			};
			workflow.progress.push({
				stage,
				status,
				timestamp: new Date().toISOString(),
			});
			context.state.set("workflow", workflow);
			return { success: true, workflow };
		},
	});

	const requirementsAgent = new LlmAgent({
		name: "requirements_gatherer",
		description: "Gathers and analyzes requirements",
		instruction: "Gather detailed requirements and assess completeness.",
		tools: [workflowStateTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const simpleProcessor = new LlmAgent({
		name: "simple_processor",
		description: "Handles simple tasks",
		instruction: "Handle simple tasks efficiently with direct solutions.",
		tools: [workflowStateTool],
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});

	const { runner } = await AgentBuilder.create("langgraph_workflow")
		.withDescription("LangGraph-based state machine workflow")
		.asLangGraph(
			[
				{
					name: "gather_requirements",
					agent: requirementsAgent,
					targets: ["simple_processing"],
				},
				{
					name: "simple_processing",
					agent: simpleProcessor,
					targets: [],
				},
			],
			"gather_requirements",
		)
		.build();

	await ask(
		runner,
		"Create a simple todo list feature. Gather requirements and process.",
	);
}

async function main() {
	console.log("🤝 Multi-Agent Systems\n");

	await demonstrateOutputKeys();
	await demonstrateSharedMemory();
	await demonstrateSubAgents();
	await demonstrateLangGraphWorkflow();

	console.log("\n✅ Complete! Next: 04-persistence-and-sessions\n");
}

main().catch(console.error);
