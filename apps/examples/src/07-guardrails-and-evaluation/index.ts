import { cwd } from "node:process";
import { AgentEvaluator } from "@iqai/adk";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function demonstrateGuardrails() {
	console.log("🛡️ Part 1: Guardrails Demo\n");

	const { runner } = await getRootAgent();

	console.log("✅ Normal request (allowed):");
	await ask(runner, "What is the weather in London?");

	console.log("\n🚫 Contains BLOCK keyword (blocked by beforeModel):");
	await ask(runner, "BLOCK this request - what's the weather in Tokyo?");

	console.log("\n🚫 Tool call blocked for Paris:");
	await ask(runner, "What's the weather in Paris?");

	console.log("\n✅ Another normal request (allowed):");
	await ask(runner, "How's the weather in New York?");
}

async function demonstrateEvaluation() {
	console.log("\n🧪 Part 2: Agent Evaluation\n");

	const { agent } = await getRootAgent();
	const dir = `${cwd()}/apps/examples/src/07-guardrails-and-evaluation`;

	try {
		await AgentEvaluator.evaluate(agent, dir, 1);
		console.log("✅ Evaluation passed\n");
	} catch (err) {
		console.error(
			"❌ Evaluation failed:",
			err instanceof Error ? err.message : err,
		);
	}
}

async function main() {
	console.log("🛡️ Guardrails and Evaluation\n");

	await demonstrateGuardrails();
	await demonstrateEvaluation();

	console.log("\n✅ Complete! Next: 08-observability-and-plugins\n");
}

main().catch(console.error);
