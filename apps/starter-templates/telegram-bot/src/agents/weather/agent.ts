import { LlmAgent } from "@iqai/adk";
import { weatherTool } from "./tools/weather";

export const weatherAgent = new LlmAgent({
	name: "telegram_weather_agent",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	description: "Provides concise current weather summaries for Telegram users.",
	instruction: "Provide concise current weather summaries for Telegram users.",
	tools: [weatherTool],
});
