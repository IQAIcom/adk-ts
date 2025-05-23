import { Agent, FunctionTool, GoogleLLM, LLMRegistry } from "@adk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Register LLM provider
LLMRegistry.registerLLM(GoogleLLM);

/**
 * Example function to calculate the sum of two numbers.
 *
 * @param a First number to add
 * @param b Second number to add
 * @returns The sum of a and b
 */
function calculateSum(a: number, b: number): number {
	return a + b;
}

/**
 * Example async function that fetches weather data for a city.
 *
 * @param city The city to fetch weather for
 * @returns A simulated weather report
 */
async function getWeather(city: string): Promise<Record<string, any>> {
	// In a real application, this would call a weather API
	console.log(`Fetching weather for ${city}...`);

	// Simulate API call
	await new Promise((resolve) => setTimeout(resolve, 1000));

	// Return simulated weather data
	return {
		city,
		temperature: Math.floor(Math.random() * 30) + 10,
		conditions: ["sunny", "cloudy", "rainy", "stormy"][
			Math.floor(Math.random() * 4)
		],
		humidity: Math.floor(Math.random() * 60) + 40,
		date: new Date().toISOString(),
	};
}

/**
 * Example of a function that requires a context parameter
 */
function getUserInfo(userName: string, toolContext: any): Record<string, any> {
	console.log(`Getting user info for ${userName} with context:`, toolContext);

	// In a real application, this might query a database using context credentials
	return {
		name: userName,
		id: Math.floor(Math.random() * 10000),
		membership: "premium",
		accessLevel: 3,
	};
}

async function main() {
	// Create function tools from our functions
	const calculatorTool = new FunctionTool(calculateSum, {
		name: "calculator",
		description: "Calculates the sum of two numbers",
	});

	const weatherTool = new FunctionTool(getWeather, {
		name: "get_weather",
		description: "Gets current weather information for a city",
		isLongRunning: true,
	});

	const userInfoTool = new FunctionTool(getUserInfo, {
		name: "get_user_info",
		description: "Gets information about a user by name",
	});

	// Create an agent with these tools
	const agent = new Agent({
		name: "function_tool_demo",
		model: process.env.LLM_MODEL || "gemini-2.0-flash",
		description:
			"An agent that demonstrates function tools using Google Gemini",
		instructions: `You are a helpful assistant that can perform calculations, fetch weather data, and retrieve user information.
    Use the calculator tool to solve math problems.
    Use the weather tool to get weather information for cities.
    Use the user info tool to retrieve information about a user.`,
		tools: [calculatorTool, weatherTool, userInfoTool],
	});

	// Example 1: Use the calculator
	console.log("\n--- Example 1: Using the calculator tool ---");
	const calcResult = await agent.run({
		messages: [{ role: "user", content: "What is 42 + 17?" }],
	});
	console.log("Agent response:", calcResult.content);

	// Example 2: Weather information
	console.log("\n--- Example 2: Using the weather tool ---");
	const weatherResult = await agent.run({
		messages: [
			{ role: "user", content: "What's the weather like in New York today?" },
		],
	});
	console.log("Agent response:", weatherResult.content);

	// Example 3: User info
	console.log("\n--- Example 3: Using the user info tool ---");
	const userResult = await agent.run({
		messages: [{ role: "user", content: "Get information about user Sarah" }],
	});
	console.log("Agent response:", userResult.content);
}

// Run the example
main().catch((error) => console.error("Error:", error));
