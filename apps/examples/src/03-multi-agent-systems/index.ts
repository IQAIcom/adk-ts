import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 03. Multi agent systems
 *
 * In this example you can see more of our folder structure where each agent has its own folder inside agents folder.
 * these folders can hold agent.ts, tool.ts and others like plugins.ts, callbacks.ts where we will discuss further in this series of examples.
 *
 * in root agent.ts file, notice the new withSubAgents method, where we pass all our sub agents.
 * The root agent takes in user's questions and decide if it can be passed to any sub agents. once this transfer happens,
 * the responsibility of answering that questions falls to that agent.
 *
 */
async function main() {
	const { runner } = await getRootAgent();

	const questions = [
		"I'd like something vegetarian, not too spicy, around $20. Maybe a salad or pasta?",
		"Can I get a burger with fries?",
		"What desserts do you have?",
	];

	for (const question of questions) {
		await ask(runner, question);
	}
}

main().catch(console.error);
