import dedent from "dedent";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 05. Planning and Code Execution
 *
 * This example significantly expands the agent's autonomy and capabilities.
 *
 * In agent.ts, we introduce two powerful components:
 * 1. withPlanner: We attach a PlanReActPlanner. This allows the agent to break down complex user requests into steps and execute them logically, rather than trying to answer in one shot.
 * 2. withCodeExecutor: We add BuiltInCodeExecutor (compatible with Gemini 2.x models). This gives the agent a Python sandbox to write and run code to solve math problems, process data, or implement algorithms dynamically.
 *
 * This combination turns the agent from a simple conversationalist into a problem solver that can reason about a task, write code to verify its reasoning, and return the result.
 *
 */
async function main() {
	const { runner } = await getRootAgent();

	const question = dedent`
		Implement the quicksort algorithm and test it with:
			1. A random unsorted list of 20 numbers
			2. An already sorted list
			3. A list with duplicate elements`;

	await ask(runner, question);
}

main().catch(console.error);
