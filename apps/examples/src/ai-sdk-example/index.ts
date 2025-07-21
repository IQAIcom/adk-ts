import { env } from "node:process";
import { google } from "@ai-sdk/google";
import { AgentBuilder, FunctionTool } from "@iqai/adk";

function getWeather(location: string): string {
	console.log(`🌤️ Getting weather for ${location}...`);
	const conditions = [
		{ temp: 22, condition: "sunny", humidity: 65, wind: 5 },
		{ temp: 15, condition: "cloudy", humidity: 80, wind: 12 },
		{ temp: 8, condition: "rainy", humidity: 90, wind: 18 },
	];
	const weather = conditions[Math.floor(Math.random() * conditions.length)];
	return `The weather in ${location} is ${weather.temp}°C and ${weather.condition}. Humidity: ${weather.humidity}%, Wind: ${weather.wind} km/h`;
}

async function demonstrateWeatherAgent() {
	console.log("🌤️ Weather Agent Demo - Using AI SDK (User brings provider)\n");

	if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
		console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY required for this example");
		console.log(
			"💡 Users can use any provider they want - just change the import!",
		);
		process.exit(1);
	}

	try {
		const weatherTool = new FunctionTool(getWeather, {
			name: "getWeather",
			description: "Gets current weather information for a specified location",
			parameterTypes: { location: "string" },
		});

		const { runner } = await AgentBuilder.create("weather_assistant")
			.withModel(google(env.LLM_MODEL || "gemini-2.0-flash"))
			.withDescription(
				"A helpful weather assistant that provides current weather information",
			)
			.withInstruction(`You are a helpful weather assistant. When asked about weather:
1. Use the getWeather tool to get current weather information
2. Provide a friendly, conversational response that includes the weather data
3. Format the response naturally and include helpful context`)
			.withTools(weatherTool)
			.build();

		const queries = [
			"What's the weather like in London?",
			"How's the weather in Tokyo today?",
			"Can you tell me the weather in New York?",
		];

		for (const query of queries) {
			console.log(`👤 User: ${query}`);
			console.log("🤖 Assistant:", await runner.ask(query));
			console.log();
		}
	} catch (error) {
		console.error("❌ Failed to run demo:", error.message);
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	demonstrateWeatherAgent().catch(console.error);
}
