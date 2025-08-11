import { createTool } from "@iqai/adk";
import * as z from "zod";

export const weatherTool = createTool({
	name: "get_weather",
	description: "Get a simple weather summary for a city (mock data).",
	schema: z.object({ city: z.string().describe("City name") }),
	fn: async ({ city }, _ctx) => {
		const conditions = ["sunny", "cloudy", "rainy", "windy", "foggy"];
		const condition = conditions[Math.floor(Math.random() * conditions.length)];
		const tempC = (15 + Math.random() * 10).toFixed(1);
		return {
			city,
			condition,
			temperature_c: tempC,
			message: `Weather in ${city}: ${condition}, ${tempC}°C (mock)`,
		};
	},
});
