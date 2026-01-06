import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function main() {
	const { runner } = await getRootAgent();

	const questions = [
		"Add 2 apples to my cart at $1.50 each",
		"Add 1 banana for $0.75",
		"Show me my complete cart with total",
	];

	for (const question of questions) {
		ask(runner, question);
	}
}

main().catch(console.error);
