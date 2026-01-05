import { env } from "node:process";
import {
	AgentBuilder,
	BuiltInCodeExecutor,
	BuiltInPlanner,
	FileOperationsTool,
	PlanReActPlanner,
} from "@iqai/adk";
import dedent from "dedent";
import { ask } from "../utils";

async function demonstrateBuiltInPlanner() {
	console.log("🧠 Part 1: Built-In Planner\n");

	const { runner } = await AgentBuilder.create("thinking_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withPlanner(
			new BuiltInPlanner({ thinkingConfig: { includeThinking: true } }),
		)
		.build();

	await ask(
		runner,
		"Plan a $300 birthday party for 20 people who love pizza and games.",
	);
}

async function demonstratePlanReActPlanner() {
	console.log("\n📋 Part 2: PlanReAct Planner\n");

	const { runner } = await AgentBuilder.create("strategic_planner")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withTools(new FileOperationsTool({ basePath: "temp-project" }))
		.withPlanner(new PlanReActPlanner())
		.build();

	await ask(
		runner,
		"Create a Node.js project with README.md, package.json, and main.js files",
	);
}

async function demonstrateBasicCodeExecution() {
	console.log("\n💻 Part 3: Basic Code Execution\n");

	const { runner } = await AgentBuilder.create("code_executor")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Agent with code execution capabilities")
		.withInstruction(
			dedent`
			You are a code execution assistant. Execute Python code to solve problems.
			Write clean, well-commented code and explain your results.
		`,
		)
		.withCodeExecutor(new BuiltInCodeExecutor())
		.build();

	await ask(
		runner,
		"Calculate the sum of squares of all prime numbers less than 100",
	);
}

async function demonstrateDataAnalysis() {
	console.log("\n📊 Part 4: Data Analysis with Code\n");

	const { runner } = await AgentBuilder.create("data_analyst")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Data analysis specialist with code execution")
		.withInstruction(
			dedent`
			You are a data analysis specialist. Write Python code for data tasks.
			Perform statistical analysis and provide clear insights.
		`,
		)
		.withCodeExecutor(new BuiltInCodeExecutor())
		.build();

	await ask(
		runner,
		dedent`
		Create a dataset of 100 random sales figures (between 1000 and 10000),
		then calculate mean, median, and standard deviation.
	`,
	);
}

async function demonstratePlanningWithCode() {
	console.log("\n🎯 Part 5: Planning + Code Execution\n");

	const { runner } = await AgentBuilder.create("algorithm_expert")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Algorithm implementation specialist")
		.withInstruction(
			dedent`
			You are an algorithm implementation specialist.
			Explain the algorithm's approach, implement it in Python, and test it.
		`,
		)
		.withPlanner(new PlanReActPlanner())
		.withCodeExecutor(new BuiltInCodeExecutor())
		.build();

	await ask(
		runner,
		dedent`
		Implement the quicksort algorithm and test it with:
		1. A random unsorted list of 20 numbers
		2. An already sorted list
		3. A list with duplicate elements
	`,
	);
}

async function main() {
	console.log("🌊 Planning and Code Execution\n");

	await demonstrateBuiltInPlanner();
	await demonstratePlanReActPlanner();
	await demonstrateBasicCodeExecution();
	await demonstrateDataAnalysis();
	await demonstratePlanningWithCode();

	console.log("\n✅ Complete! Next: 06-mcp-and-integrations\n");
}

main().catch(console.error);
