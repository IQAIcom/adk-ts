import { LlmAgent } from "@iqai/adk";

export function agent() {
	return new LlmAgent({
		name: "function_agent",
		description: "Agent exported as plain function",
		model: "dummy-model",
		instruction: "Be concise.",
	});
}
