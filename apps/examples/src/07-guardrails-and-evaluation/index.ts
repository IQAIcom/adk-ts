import { cwd } from "node:process";
import { AgentEvaluator } from "@iqai/adk";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

async function demonstrateGuardrails() {
	console.log("🛡️ Part 1: Guardrails Demo\n");

	const { runner } = await getRootAgent();

	const questions = [
		{
			label: "✅ Normal request (allowed)",
			question: "What is the weather in London?",
		},
		{
			label: "🚫 Contains BLOCK keyword (blocked by beforeModel)",
			question: "BLOCK this request - what's the weather in Tokyo?",
		},
		{
			label: "🚫 Tool call blocked for Paris",
			question: "What's the weather in Paris?",
		},
		{
			label: "✅ Another normal request (allowed)",
			question: "How's the weather in New York?",
		},
	];

	for (const { label, question } of questions) {
		console.log(`\n${label}:`);
		await ask(runner, question);
	}
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
