import { createTool } from "@iqai/adk";
import * as z from "zod";

export const getWeatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a city",
	schema: z.object({ city: z.string() }),
	fn: async ({ city }) => {
		return `The weather in ${city} is sunny and 72°F`;
	},
});
