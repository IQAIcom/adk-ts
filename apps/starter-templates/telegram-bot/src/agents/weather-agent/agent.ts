import { LlmAgent } from "@iqai/adk";
import { env } from "../../env";
import { weatherTool } from "./tools";

/**
 * Creates and configures a weather agent specialized in providing weather information.
 *
 * This agent is equipped with weather-related tools to fetch current conditions,
 * forecasts, and weather data for specified cities. It uses the Gemini 2.5 Flash
 * model for natural language interaction with weather queries.
 *
 * @returns A configured LlmAgent instance specialized for weather information
 */
export const getWeatherAgent = () => {
	const weatherAgent = new LlmAgent({
		name: "weather_agent",
		description: "provides weather for a given city",
		model: env.LLM_MODEL,
		tools: [weatherTool],
	});

	return weatherAgent;
};
