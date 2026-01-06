import { AgentBuilder } from "@iqai/adk";

export function getNameAgent() {
	return AgentBuilder.withModel("gemini-2.5-flash")
		.withInstruction("Your name is james")
		.build();
}
