import { AgentBuilder, InMemorySessionService, LlmAgent } from "@iqai/adk";
import * as dotenv from "dotenv";
import { agent } from "./agents/agent";

dotenv.config();

/**
 * Simple Agent Example (dual-mode)
 *
 * Dev (CLI): `adk run` detects src/agent.ts export automatically.
 * Programmatic / prod: this index builds a Runner with session services.
 */
async function main() {
	const question = "What is the capital of France?";
	console.log(`📝 Question: ${question}`);

	// Build runner from exported root agent.
	// Support older versions where AgentBuilder.fromAgent may not exist.
	const builder: any = (AgentBuilder as any).fromAgent
		? (AgentBuilder as any).fromAgent(agent)
		: // Manual population fallback (basic LLM agent only)
			agent instanceof LlmAgent
			? AgentBuilder.create(agent.name)
					.withModel((agent as any).model)
					.withInstruction((agent as any).instruction || "")
					.withDescription((agent as any).description || "")
			: AgentBuilder.create(agent.name);

	const { runner } = await builder
		.withSessionService(new InMemorySessionService())
		.build();

	const response = await runner.ask(question);
	console.log(`🤖 Response: ${response}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
