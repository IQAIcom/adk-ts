import { env } from "node:process";
import { AgentBuilder, AgentTool, LlmAgent, createTool } from "@iqai/adk";
import * as z from "zod/v4";

/**
 * Agent Tool Example
 */
async function main() {
	console.log("═══════════════════════════════════════════");

	const weatherTool = createTool({
		name: "get_weather",
		description: "Gets current weather for a city",
		schema: z.object({
			city: z.string().describe("City name"),
		}),
		fn: ({ city }) => {
			// Mock weather data with random selection
			const weatherOptions = [
				{ temp: 72, condition: "sunny", humidity: 45 },
				{ temp: 68, condition: "cloudy", humidity: 60 },
				{ temp: 55, condition: "rainy", humidity: 85 },
				{ temp: 45, condition: "snowy", humidity: 70 },
				{ temp: 78, condition: "partly cloudy", humidity: 50 },
				{ temp: 82, condition: "hot and sunny", humidity: 35 },
			];

			const randomWeather =
				weatherOptions[Math.floor(Math.random() * weatherOptions.length)];

			return {
				city: city,
				temperature: `${randomWeather.temp}°F`,
				condition: randomWeather.condition,
				humidity: `${randomWeather.humidity}%`,
			};
		},
	});

	const weatherAgent = new LlmAgent({
		name: "weather_agent",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"Weather specialist that provides detailed weather information and advice",
		instruction: `You are a weather specialist. When someone asks about weather for a city, ALWAYS use the get_weather tool first to get the current conditions, then provide helpful advice based on those conditions.

		Example: If asked "What's the weather in Paris?", call get_weather with city="Paris", then tell them about the temperature and conditions and give relevant advice.`,
		tools: [weatherTool],
	});

	const weatherHelperTool = new AgentTool({
		name: "get_weather_info",
		description:
			"Gets detailed weather information with helpful advice and context",
		agent: weatherAgent,
	});

	const { runner } = await AgentBuilder.create("assistant")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Assistant with access to weather specialist")
		.withInstruction(`You are an assistant. You have access to:
		- get_weather_info: A weather specialist that provides detailed weather information and advice

		For ANY weather-related question, use the get_weather_info tool. The weather agent inside will get current conditions and provide helpful advice.`)
		.withTools(weatherHelperTool)
		.build();

	console.log("\n=== Example 1: Simple Weather Query ===");
	const weatherQuery1 = "What's the weather like in New York?";
	console.log(`🌤️ Query: ${weatherQuery1}`);
	const weatherResponse1 = await runner.ask(weatherQuery1);
	console.log(`🤖 Response: ${weatherResponse1}`);

	console.log("\n=== Example 2: Different City ===");
	const weatherQuery2 = "How's the weather in Tokyo?";
	console.log(`🌦️ Query: ${weatherQuery2}`);
	const weatherResponse2 = await runner.ask(weatherQuery2);
	console.log(`🤖 Response: ${weatherResponse2}`);

	console.log("\n=== Example 3: Contextual Weather Question ===");
	const weatherQuery3 =
		"Should I bring a jacket if I'm going out in London today?";
	console.log(`🧥 Query: ${weatherQuery3}`);
	const weatherResponse3 = await runner.ask(weatherQuery3);
	console.log(`🤖 Response: ${weatherResponse3}`);
}

main().catch(console.error);
