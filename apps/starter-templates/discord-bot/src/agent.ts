import { LlmAgent } from "@iqai/adk";

export const agent = new LlmAgent({
	name: "discord_bot",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	description:
		"A Discord bot assistant that provides concise and engaging responses.",
	instruction:
		"You are a friendly and helpful Discord bot assistant. Keep responses concise and engaging.",
});
