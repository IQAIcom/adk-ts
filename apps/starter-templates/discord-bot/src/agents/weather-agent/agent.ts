import { LlmAgent } from "@iqai/adk";
import { weatherTool } from "./tools";

export function getWeatherAgent() {
	const agent = new LlmAgent({
		name: "discord_weather_agent",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"Provides concise current weather summaries for Discord users.",
		instruction: "Provide concise current weather summaries for Discord users.",
		tools: [weatherTool],
	});

	return agent;
}
