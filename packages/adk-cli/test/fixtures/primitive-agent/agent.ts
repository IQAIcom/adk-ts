import { LlmAgent } from "@iqai/adk";

// Invalid primitive export named agent; real factory is elsewhere
export const agent = "NOT_AN_AGENT";

export function getPrimitiveAgent() {
	return new LlmAgent({
		name: "primitive_agent",
		description:
			"Agent produced by function when primitive agent export exists",
		model: "dummy-model",
		instruction: "Answer briefly.",
	});
}
