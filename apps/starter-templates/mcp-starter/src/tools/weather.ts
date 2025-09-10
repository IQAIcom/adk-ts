import { z } from "zod";
import { WeatherService } from "../services/weather-service.js";
import dedent from "dedent";

/**
 * Zod schema for weather tool parameters.
 * Validates that the city parameter is a non-empty string.
 */
const weatherToolParams = z.object({
	city: z.string().min(1).describe("The name of the city to get weather for"),
});

type WeatherToolParams = z.infer<typeof weatherToolParams>;

/**
 * Weather tool for MCP (Model Context Protocol) server.
 *
 * This tool provides current weather conditions for any specified city using
 * the OpenWeather API. It returns formatted weather data including temperature,
 * conditions, humidity, and wind speed. Includes comprehensive error handling
 * for API key issues and network problems.
 */
export const weatherTool = {
	name: "GET_WEATHER",
	description: "Get the current weather conditions for a specified city",
	parameters: weatherToolParams,
	execute: async (params: WeatherToolParams) => {
		const weatherService = new WeatherService();

		try {
			const weatherData = await weatherService.getWeatherByCity(params.city);

			return dedent`
        Weather for ${weatherData.location}:

        Temperature: ${weatherData.temperature}°C
        Feels like: ${weatherData.feelsLike}°C
        Condition: ${weatherData.condition} (${weatherData.description})
        Humidity: ${weatherData.humidity}%
        Wind speed: ${weatherData.windSpeed} m/s
      `;
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes("API key")) {
					return "Error: Weather API key is not configured. Please set the OPENWEATHER_API_KEY environment variable.";
				}
				return `Error fetching weather data: ${error.message}`;
			}
			return "An unknown error occurred while fetching weather data";
		}
	},
} as const;
