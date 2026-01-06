import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function main() {
	console.log("🤝 Multi-Agent Systems\n");

	const { runner } = await getRootAgent();

	await ask(
		runner,
		"I'd like something vegetarian, not too spicy, around $20. Maybe a salad or pasta?",
	);
	await ask(runner, "Can I get a burger with fries?");
	await ask(runner, "What desserts do you have?");

	console.log("\n✅ Complete! Next: 04-persistence-and-sessions\n");
}

main().catch(console.error);
