import { LlmAgent } from "@iqai/adk";

export const agent = new LlmAgent({
	name: "hono_agent",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	description: "Primary Hono server agent handling general user queries.",
	instruction: "You are a helpful HTTP API assistant.",
});
