import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function main() {
	console.log("🛠️ Tools and State\n");

	const { runner } = await getRootAgent();

	await ask(runner, "Add 2 apples to my cart at $1.50 each");
	await ask(runner, "Add 1 banana for $0.75");
	await ask(runner, "Show me my complete cart with total");

	console.log("\n✅ Complete! Next: 03-multi-agent-systems\n");
}

main().catch(console.error);
