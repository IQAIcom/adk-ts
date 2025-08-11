import { LlmAgent } from "@iqai/adk";

export const discordSubAgent = new LlmAgent({
	name: "discord_core",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction: "You are a friendly and helpful Discord bot assistant.",
});
