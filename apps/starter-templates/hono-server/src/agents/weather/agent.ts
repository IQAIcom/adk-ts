import { LlmAgent } from "@iqai/adk";
import { weatherTool } from "./tools/weather";

export const weatherAgent = new LlmAgent({
	name: "hono_weather_agent",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction: "Provide concise current weather summaries for API users.",
	tools: [weatherTool],
});
