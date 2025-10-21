import { createTool } from "@iqai/adk";
import z from "zod";

/**
 * Tool for fetching current weather information for cities worldwide.
 *
 * Uses the wttr.in weather service to retrieve current weather conditions
 * in a concise format. Includes proper URL encoding for city names and
 * error handling for network issues or invalid locations.
 */
export const weatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a city",
	schema: z.object({
		city: z.string().describe("City name"),
	}),
	fn: async ({ city }) => {
		try {
			const response = await fetch(
				`https://wttr.in/${encodeURIComponent(city)}?format=3`,
			);

			if (!response.ok) {
				console.error(
					`Failed to fetch weather for ${city}: ${response.statusText}`,
				);
				return `Weather unavailable for ${city}`;
			}

			return await response.text();
		} catch (error) {
			console.error(`Error fetching weather for ${city}:`, error);
			return `Weather unavailable for ${city}`;
		}
	},
});
