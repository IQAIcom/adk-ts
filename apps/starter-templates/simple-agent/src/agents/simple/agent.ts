import { LlmAgent } from "@iqai/adk";

export const simpleAgent = new LlmAgent({
	name: "simple",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction:
		"You are a concise, helpful assistant answering general questions.",
});
