// Simple tools for 15-agent-config example

import { createTool } from "@iqai/adk";
import { z } from "zod";

export const get_weather = createTool({
	name: "get_weather",
	description: "Return a simple mock current weather for a given location.",
	schema: z.object({
		location: z.string().min(1).describe("City or location name"),
	}),
	fn: async ({ location }) => {
		// Mocked weather response
		return {
			location,
			summary: "Sunny",
			temperature_c: 25,
			humidity_pct: 40,
		};
	},
});

export const tell_joke = createTool({
	name: "tell_joke",
	description: "Tell a short, clean joke. Optionally include a topic.",
	schema: z.object({
		topic: z.string().optional().describe("Optional joke topic"),
	}),
	fn: async ({ topic }) => {
		const jokes = [
			"Why did the developer go broke? Because he used up all his cache.",
			"I told my computer I needed a break, and it said 'No problem — I'll go to sleep.'",
			"There are 10 kinds of people in the world: those who understand binary and those who don't.",
		];
		const j = jokes[Math.floor(Math.random() * jokes.length)];
		return topic ? `${j} (topic: ${topic})` : j;
	},
});
