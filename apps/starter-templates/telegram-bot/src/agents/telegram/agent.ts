import { LlmAgent } from "@iqai/adk";

export const telegramSubAgent = new LlmAgent({
	name: "telegram_core",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction: "You are a friendly and helpful Telegram bot assistant.",
});
