import { LlmAgent } from "@iqai/adk";
import { weatherTool } from "./tools";

export const weatherAgent = new LlmAgent({
	name: "weather_agent",
	description: "Provides current weather summaries using tools.",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction:
		"You provide concise current weather summaries and simple forecasts.",
	tools: [weatherTool],
});
