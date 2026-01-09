import { createTool } from "@iqai/adk";
import z from "zod";

export const getWeatherTool = createTool({
	name: "get_weather",
	description: "Get the weather for a given city",
	schema: z.object({
		city: z.string().describe("The city to get weather for"),
	}),
	fn: async ({ city }) => {
		const temperature = Math.floor(Math.random() * 30) + 10;
		return {
			status: "ok" as const,
			city,
			temperature,
			report: `${city}: ${temperature}°C, partly cloudy`,
		};
	},
});
