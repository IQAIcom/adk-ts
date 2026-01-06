import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function main() {
	const { runner } = await getRootAgent();

	const questions = [
		"I'd like something vegetarian, not too spicy, around $20. Maybe a salad or pasta?",
		"Can I get a burger with fries?",
		"What desserts do you have?",
	];

	for (const question of questions) {
		ask(runner, question);
	}
}

main().catch(console.error);
