import { env } from "node:process";
import {
	FunctionTool,
	InMemorySessionService,
	LlmAgent,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "function-tool-example";
const USER_ID = uuidv4();

/**
 * Function Tool Example
 *
 * This example demonstrates how to create and use custom function tools with the
 * ADK framework. Function tools allow you to wrap JavaScript functions and make
 * them available to LLM agents for execution.
 *
 * The example:
 * 1. Creates custom functions for calculations, weather, and user info
 * 2. Wraps these functions using FunctionTool
 * 3. Creates an agent with access to these tools
 * 4. Demonstrates various tool usage scenarios
 * 5. Shows tool chaining and complex interactions
 *
 * Expected Output:
 * - Agent responses using the calculator tool
 * - Simulated weather API calls
 * - User information retrieval
 * - Complex multi-tool interactions
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */

/**
 * Example function to calculate the sum of two numbers.
 * @param a First number to add
 * @param b Second number to add
 * @returns The sum of a and b
 */
function calculateSum(a: number, b: number): number {
	return a + b;
}

/**
 * Example async function that fetches weather data for a city.
 * @param city The city to fetch weather for
 * @returns A simulated weather report
 */
async function getWeather(city: string): Promise<Record<string, any>> {
	console.log(`Fetching weather for ${city}...`);

	// Simulate API call delay
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
 * @param userName The name of the user to get info for
 * @param toolContext Context provided by the tool execution environment
 * @returns User information object
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

/**
 * Creates function tools from JavaScript functions
 * @returns Array of configured FunctionTool instances
 */
function createFunctionTools() {
	const calculatorTool = new FunctionTool(calculateSum, {
		name: "calculator",
		description: "Calculates the sum of two numbers",
		parameterTypes: {
			a: "number",
			b: "number",
		},
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

	return [calculatorTool, weatherTool, userInfoTool];
}

/**
 * Creates and configures the LLM agent with function tools
 * @param tools Array of function tools to provide to the agent
 * @returns Configured LlmAgent instance
 */
function createFunctionAgent(tools: any[]): LlmAgent {
	return new LlmAgent({
		name: "function_tool_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"An agent that demonstrates function tools using Google Gemini",
		instruction: `You are a helpful assistant that can perform calculations, fetch weather data, and retrieve user information.
Use the calculator tool to solve math problems.
Use the weather tool to get weather information for cities.
Use the user info tool to retrieve information about a user.
Be clear and informative in your responses about the operations you perform.`,
		tools,
	});
}

/**
 * Executes a user message through the agent and returns the response
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 * @param userMessage The message to send to the agent
 * @returns The agent's response as a string
 */
async function runAgentTask(
	runner: Runner,
	sessionId: string,
	userMessage: string,
): Promise<string> {
	const newMessage = {
		parts: [{ text: userMessage }],
	};

	let agentResponse = "";

	try {
		for await (const event of runner.runAsync({
			userId: USER_ID,
			sessionId,
			newMessage,
		})) {
			if (event.author === "function_tool_demo" && event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) {
					agentResponse += content;
				}
			}
		}
	} catch (error) {
		return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
	}

	return agentResponse || "No response from agent";
}

/**
 * Runs demonstration examples of function tool usage
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function runFunctionToolExamples(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	/**
	 * Example 1: Calculator Tool Usage
	 * Demonstrates basic mathematical operations
	 */
	console.log("\n--- Example 1: Using the calculator tool ---");
	const calcResult = await runAgentTask(runner, sessionId, "What is 42 + 17?");
	console.log("Agent response:", calcResult);

	/**
	 * Example 2: Weather Information
	 * Shows async function tool execution
	 */
	console.log("\n--- Example 2: Using the weather tool ---");
	const weatherResult = await runAgentTask(
		runner,
		sessionId,
		"What's the weather like in New York today?",
	);
	console.log("Agent response:", weatherResult);

	/**
	 * Example 3: User Information
	 * Demonstrates context-aware function tools
	 */
	console.log("\n--- Example 3: Using the user info tool ---");
	const userResult = await runAgentTask(
		runner,
		sessionId,
		"Get information about user Sarah",
	);
	console.log("Agent response:", userResult);

	/**
	 * Example 4: Complex Calculations
	 * Shows multiple tool calls in sequence
	 */
	console.log("\n--- Example 4: Multiple calculations ---");
	const complexCalcResult = await runAgentTask(
		runner,
		sessionId,
		"Calculate 15 + 25, then tell me what that result plus 10 would be",
	);
	console.log("Agent response:", complexCalcResult);

	/**
	 * Example 5: Weather Comparison
	 * Demonstrates multiple calls to the same tool
	 */
	console.log("\n--- Example 5: Weather comparison ---");
	const weatherCompareResult = await runAgentTask(
		runner,
		sessionId,
		"Compare the weather between London and Tokyo",
	);
	console.log("Agent response:", weatherCompareResult);

	/**
	 * Example 6: Mixed Tool Usage
	 * Shows coordination between different types of tools
	 */
	console.log("\n--- Example 6: Mixed tool usage ---");
	const mixedResult = await runAgentTask(
		runner,
		sessionId,
		"Get info for user John and calculate what his access level plus 5 would be",
	);
	console.log("Agent response:", mixedResult);
}

async function main() {
	console.log("🛠️ Starting Function Tool example...");

	try {
		/**
		 * Set up session management
		 * Creates a persistent session for the conversation
		 */
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		/**
		 * Create function tools from JavaScript functions
		 * Wraps native functions to make them available to the agent
		 */
		const functionTools = createFunctionTools();

		/**
		 * Create agent with function tools
		 * The agent can now call the wrapped functions
		 */
		const agent = createFunctionAgent(functionTools);

		/**
		 * Set up runner for agent execution
		 * Handles the communication and execution flow
		 */
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		/**
		 * Run comprehensive function tool demonstrations
		 * Shows various scenarios and tool interactions
		 */
		await runFunctionToolExamples(runner, session.id);

		console.log("\n🎉 Function tool example completed!");
	} catch (error) {
		console.error("❌ Error in function tool example:", error);
		process.exit(1);
	}
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
