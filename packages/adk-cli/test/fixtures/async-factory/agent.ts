import { LlmAgent } from "@iqai/adk";

export async function getAsyncAgent() {
	await new Promise((r) => setTimeout(r, 5));
	return new LlmAgent({
		name: "async_agent",
		description: "Agent from async factory",
		model: "dummy-model",
		instruction: "Act async.",
	});
}
