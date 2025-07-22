import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Simple Agent Example
 *
 * The simplest way to create and use an AI agent with AgentBuilder.
 */
async function main() {
	const question = "What is the capital of France?";

	console.log(`📝 Question: ${question}`);

	// The simplest possible usage - just model and ask!
	const response = await AgentBuilder.withModel(
		env.LLM_MODEL || "gemini-2.5-flash",
	).ask(question);

	console.log(`🤖 Response: ${response}`);
}

main().catch(console.error);
