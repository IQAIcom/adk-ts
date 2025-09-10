import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentBuilder, AgentEvaluator } from "@iqai/adk";

/**
 * Minimal Evaluation Example
 *
 * Demonstrates how to:
 * 1. Create a simple agent
 * 2. Create a minimal evaluation dataset + config
 * 3. Run evaluation using AgentEvaluator (throws on failure)
 */
export async function main() {
	// Minimal logging: start + final status only
	console.log("🧪 Running evaluation...");

	const { agent } = await AgentBuilder.create("demo_agent")
		.withModel("gemini-2.5-flash")
		.withInstruction("Answer briefly and accurately.")
		.build();

	// Evaluate JSON dataset(s) in this directory (basic.test.json + test_config.json)
	const dir = dirname(fileURLToPath(import.meta.url));
	// (Files: basic.test.json + test_config.json)

	try {
		await AgentEvaluator.evaluate(agent, dir, 1);
		console.log("✅ Passed");
	} catch (err) {
		console.error("❌ Failed:", err instanceof Error ? err.message : err);
	}
}

if (require.main === module) {
	main().catch(console.error);
}
