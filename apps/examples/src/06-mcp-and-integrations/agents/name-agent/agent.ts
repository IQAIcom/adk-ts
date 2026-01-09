import { AgentBuilder } from "@iqai/adk";

export function getNameAgent() {
	return AgentBuilder.withModel(
		process.env.LLM_MODEL || "gemini-3-flash-preview",
	)
		.withInstruction("Your name is james")
		.build();
}
