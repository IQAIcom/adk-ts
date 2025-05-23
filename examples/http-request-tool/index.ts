import { Agent, GoogleLLM, HttpRequestTool, LLMRegistry } from "@adk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Register LLM provider
LLMRegistry.registerLLM(GoogleLLM);

async function main() {
	// Create HTTP request tool
	const httpTool = new HttpRequestTool();

	// Create an agent with this tool
	const agent = new Agent({
		name: "http_request_demo",
		model: process.env.LLM_MODEL || "gemini-2.0-flash",
		description:
			"An agent that demonstrates HTTP request capabilities using Google Gemini",
		instructions: `You are a helpful assistant that can make HTTP requests to retrieve information.
    Use the http_request tool to fetch data from APIs and web services.
    Always examine the status code to ensure the request was successful.
    For JSON responses, try to extract and present the most relevant information.`,
		tools: [httpTool],
	});

	// Example 1: Simple GET request to a public API
	console.log("\n--- Example 1: GET request to a public API ---");
	const weatherResult = await agent.run({
		messages: [
			{
				role: "user",
				content:
					"Get the current weather data from the OpenWeatherMap sample API for London",
			},
		],
	});
	console.log("Agent response:", weatherResult.content);

	// Example 2: POST request with JSON body
	console.log("\n--- Example 2: POST request with JSON body ---");
	const postResult = await agent.run({
		messages: [
			{
				role: "user",
				content:
					"Send a POST request to https://jsonplaceholder.typicode.com/posts with a JSON body containing title: 'Agent Test' and body: 'This is a test post'",
			},
		],
	});
	console.log("Agent response:", postResult.content);

	// Example 3: GET request with URL parameters
	console.log("\n--- Example 3: GET request with URL parameters ---");
	const searchResult = await agent.run({
		messages: [
			{
				role: "user",
				content: "Search for 'nodejs' repositories on GitHub API",
			},
		],
	});
	console.log("Agent response:", searchResult.content);
}

// Run the example
main().catch((error) => console.error("Error:", error));
