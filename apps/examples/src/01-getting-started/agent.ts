import { LlmAgent } from "@iqai/adk";

export default new LlmAgent({
	name: "getting_started_agent",
	description: "A helpful assistant for getting started",
	model: "gemini-2.5-flash",
	instruction: "You are a helpful assistant that answers questions concisely.",
});
