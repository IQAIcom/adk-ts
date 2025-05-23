import {
	Agent,
	BaseTool,
	type FunctionDeclaration,
	GoogleLLM,
	LLMRegistry,
	type Message,
	type MessageRole,
	type ToolContext,
} from "@adk";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Register Google LLM
LLMRegistry.registerLLM(GoogleLLM);

/**
 * Example demonstrating Anthropic Claude with native tool calling
 *
 * This example uses the latest Anthropic SDK with native tool calling capabilities
 * and works with Claude 3 models that support tool use.
 */

// Weather tool implementation
class WeatherTool extends BaseTool {
	constructor() {
		super({
			name: "get_weather",
			description: "Get current weather information for a location",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					location: {
						type: "string",
						description: "The city or location to get weather for",
					},
					unit: {
						type: "string",
						enum: ["celsius", "fahrenheit"],
						description: "Temperature unit (celsius or fahrenheit)",
					},
				},
				required: ["location"],
			},
		};
	}

	async runAsync(
		args: {
			location: string;
			unit?: string;
		},
		_context: ToolContext,
	): Promise<any> {
		console.log(
			`Getting weather for: ${args.location} in ${args.unit || "celsius"}`,
		);

		// Mock implementation with randomized weather data
		const conditions = [
			"sunny",
			"partly cloudy",
			"cloudy",
			"rainy",
			"stormy",
			"snowy",
		];
		const tempCelsius = Math.floor(Math.random() * 35) + -5; // -5 to 30°C

		// Convert to fahrenheit if requested
		const tempFahrenheit = Math.round((tempCelsius * 9) / 5 + 32);
		const temp = args.unit === "fahrenheit" ? tempFahrenheit : tempCelsius;
		const unit = args.unit === "fahrenheit" ? "°F" : "°C";

		const condition = conditions[Math.floor(Math.random() * conditions.length)];
		const humidity = Math.floor(Math.random() * 100);

		return {
			location: args.location,
			temperature: `${temp}${unit}`,
			condition: condition,
			humidity: `${humidity}%`,
			retrieved_at: new Date().toISOString(),
		};
	}
}

async function main() {
	try {
		// Create the agent with Gemini model and weather tool
		const agent = new Agent({
			name: "gemini_weather_assistant",
			model: "gemini-2.0-flash", // Using Gemini Flash with tool calling support
			description: "A weather assistant powered by Google Gemini",
			instructions: `You are a helpful assistant that can provide weather information.
When asked about weather for a location, use the get_weather tool to retrieve the data.
Be conversational and friendly in your responses.

IMPORTANT: You must use the get_weather tool whenever a user asks about weather.
For example, when asked "What's the weather in Tokyo?", you should call:
get_weather({"location": "Tokyo"})

Never make up weather information - always use the tool to get accurate data.
Always include the weather condition, temperature, and humidity in your response.`,
			tools: [new WeatherTool()],
			maxToolExecutionSteps: 3, // Allow more tool execution steps
		});

		// Enable debug logging
		process.env.DEBUG = "true";

		console.log("Google Gemini Agent initialized with weather tool");
		console.log("---------------------------------------------------");

		// Query example with explicit call to action
		console.log(
			"\nUser Query: Please tell me the current weather conditions in Tokyo, Japan.",
		);

		const response = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content:
						"Please tell me the current weather conditions in Tokyo, Japan.",
				},
			],
		});

		console.log("\nAssistant Response:");
		console.log(response.content);

		// Log tool calls if present
		if (response.tool_calls && response.tool_calls.length > 0) {
			console.log("\nTool Calls:");
			response.tool_calls.forEach((tool) => {
				console.log(`- ${tool.function.name}(${tool.function.arguments})`);
			});
		} else {
			console.log("\nNo tool calls were made in the response.");
		}

		console.log("---------------------------------------------------");

		// Multi-turn conversation example
		console.log("\nStarting multi-turn conversation:");
		const conversation: Message[] = [
			{
				role: "user" as MessageRole,
				content:
					"I need accurate weather information for Paris, France. What's the current temperature and conditions there?",
			},
		];

		// First turn
		let turnResponse = await agent.run({ messages: [...conversation] });
		console.log(
			"\nUser: I need accurate weather information for Paris, France. What's the current temperature and conditions there?",
		);
		console.log("Assistant:", turnResponse.content);

		// Log tool calls if present
		if (turnResponse.tool_calls && turnResponse.tool_calls.length > 0) {
			console.log("\nTool Calls:");
			turnResponse.tool_calls.forEach((tool) => {
				console.log(`- ${tool.function.name}(${tool.function.arguments})`);
			});
		} else {
			console.log("\nNo tool calls were made in the response.");
		}

		// Add response to conversation
		conversation.push({
			role: "assistant",
			content: turnResponse.content || "",
		});

		// Second turn
		conversation.push({
			role: "user",
			content:
				"Thanks! Now I also need the weather for Rome, but please show it in fahrenheit.",
		});
		console.log(
			"\nUser: Thanks! Now I also need the weather for Rome, but please show it in fahrenheit.",
		);

		turnResponse = await agent.run({ messages: [...conversation] });
		console.log("Assistant:", turnResponse.content);

		// Log tool calls if present
		if (turnResponse.tool_calls && turnResponse.tool_calls.length > 0) {
			console.log("\nTool Calls:");
			turnResponse.tool_calls.forEach((tool) => {
				console.log(`- ${tool.function.name}(${tool.function.arguments})`);
			});
		} else {
			console.log("\nNo tool calls were made in the response.");
		}

		console.log("\nGoogle Gemini tool calling example complete!");
	} catch (error) {
		console.error("Error:", error);
		if (error instanceof Error) {
			console.error("Details:", error.message);
			console.error("Stack:", error.stack);
		}
	}
}

// Run the example
main().catch((error) => {
	console.error("Error running example:", error);
});
