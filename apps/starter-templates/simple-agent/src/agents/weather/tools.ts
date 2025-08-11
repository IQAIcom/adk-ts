import { createTool } from "@iqai/adk";
import * as z from "zod";

// Live weather tool using wttr.in simple text API
export const weatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a city",
	schema: z.object({ city: z.string().describe("City name") }),
	fn: async ({ city }) => {
		try {
			const response = await fetch(
				`https://wttr.in/${encodeURIComponent(city)}?format=3`,
			);
			return await response.text();
		} catch {
			return `Weather unavailable for ${city}`;
		}
	},
});
