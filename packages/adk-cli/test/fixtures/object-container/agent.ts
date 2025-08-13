import { LlmAgent } from "@iqai/adk";

export const container = {
	agent: new LlmAgent({
		name: "object_container_agent",
		description: "Agent inside object container",
		model: "dummy-model",
		instruction: "Container style.",
	}),
};
