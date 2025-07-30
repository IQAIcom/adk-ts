import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";

/**
 * 01 - Simple Agent
 *
 * The simplest way to create and use an AI agent.
 *
 * Concepts covered:
 * - Basic AgentBuilder usage
 * - Model configuration
 * - Simple question-answer interaction
 */
async function main() {
	console.log("🤖 Simple agent:");
	const response = await AgentBuilder.withModel(
		env.LLM_MODEL || "gemini-2.5-flash",
	).ask("What is the capital of France?");
	console.log(response);
}

main().catch(console.error);
