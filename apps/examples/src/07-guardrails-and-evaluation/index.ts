import { cwd } from "node:process";
import { AgentEvaluator } from "@iqai/adk";
import { ask } from "../utils";
import { getRootAgent } from "./agents/agent";

/**
 * 07. Guardrails and Evaluation
 *
 * This example introduces two critical concepts for production-grade agents: Safety and Testing.
 *
 * 1. Guardrails (via Plugins):
 *    In `agents/plugins.ts`, we implement a `GuardrailsPlugin` extending `BasePlugin`.
 *    This allows us to intercept the agent's lifecycle hooks:
 *    - `beforeModelCallback`: Inspects user input before it reaches the LLM to block harmful keywords (e.g., "BLOCK").
 *    - `beforeToolCallback`: Intercepts tool execution to validate arguments (e.g., blocking "Paris").
 *
 * 2. Evaluation:
 *    We use `AgentEvaluator` to run the agent against a set of predefined test cases (stored in `test_cases.json`).
 *    This ensures the agent behaves as expected and doesn't regress as we modify it.
 *
 * This structure demonstrates how to enforce business rules and quality assurance in your agent's workflow.
 *
 */
async function main() {
	console.log("🛡️ Guardrails and Evaluation\n");

	await demonstrateGuardrails();
	await demonstrateEvaluation();

	console.log("\n✅ Complete! Next: 08-observability-and-plugins\n");
}

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

main().catch(console.error);
