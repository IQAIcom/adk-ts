import { LlmAgent } from "@iqai/adk";

export const agent = new LlmAgent({
	name: "hono_agent",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction: "You are a helpful HTTP API assistant.",
});
