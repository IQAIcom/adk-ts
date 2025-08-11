import { LlmAgent } from "@iqai/adk";

export const agent = new LlmAgent({
	name: "telegram_bot",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	description: "Primary Telegram bot agent for general assistance.",
	instruction: "You are a friendly and helpful Telegram bot assistant.",
});
