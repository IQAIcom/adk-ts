import { LlmAgent } from "@iqai/adk";

export const honoSubAgent = new LlmAgent({
	name: "hono_core",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	description: "Core reasoning agent for Hono server context.",
	instruction: "You answer API user questions and perform helpful reasoning.",
});
