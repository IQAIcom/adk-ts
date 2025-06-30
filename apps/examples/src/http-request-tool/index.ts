import { env } from "node:process";
import {
	HttpRequestTool,
	InMemorySessionService,
	LlmAgent,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "http-request-example";
const USER_ID = uuidv4();

/**
 * HTTP Request Tool Example
 *
 * This example demonstrates how to use the HttpRequestTool to enable an LLM agent
 * to make HTTP requests to APIs and web services. The agent can perform various
 * HTTP operations and process the responses intelligently.
 *
 * The example:
 * 1. Creates an agent with HttpRequestTool capabilities
 * 2. Demonstrates GET requests to public APIs
 * 3. Shows POST and PUT requests with JSON payloads
 * 4. Illustrates custom headers and status code handling
 * 5. Displays response data extraction and formatting
 *
 * Expected Output:
 * - Successful API interactions with JSONPlaceholder
 * - HTTP status code demonstrations
 * - JSON response parsing and presentation
 * - Custom header and request body examples
 *
 * Prerequisites:
 * - Node.js environment
 * - Internet connection for API calls
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 */

/**
 * Creates and configures the LLM agent with HTTP request capabilities
 * @returns Configured LlmAgent with HttpRequestTool
 */
function createHttpAgent(): LlmAgent {
	return new LlmAgent({
		name: "http_request_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"An agent that demonstrates HTTP request capabilities using Google Gemini",
		instruction: `You are a helpful assistant that can make HTTP requests to retrieve information.
Use the http_request tool to fetch data from APIs and web services.
Always examine the status code to ensure the request was successful.
For JSON responses, try to extract and present the most relevant information.
Be clear about the HTTP method and URL you're using.`,
		tools: [new HttpRequestTool()],
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
			if (event.author === "http_request_demo" && event.content?.parts) {
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
 * Runs comprehensive HTTP request tool demonstrations
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function runHttpRequestExamples(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	/**
	 * Example 1: Simple GET Request
	 * Demonstrates basic API data retrieval
	 */
	console.log("\n--- Example 1: GET request to JSONPlaceholder API ---");
	const postsResult = await runAgentTask(
		runner,
		sessionId,
		"Get a list of posts from https://jsonplaceholder.typicode.com/posts and show me the first 3 posts",
	);
	console.log("Agent response:", postsResult);

	/**
	 * Example 2: POST Request with JSON Body
	 * Shows how to send data to an API
	 */
	console.log("\n--- Example 2: POST request with JSON body ---");
	const postResult = await runAgentTask(
		runner,
		sessionId,
		"Send a POST request to https://jsonplaceholder.typicode.com/posts with a JSON body containing title: 'Agent Test' and body: 'This is a test post created by an AI agent'",
	);
	console.log("Agent response:", postResult);

	/**
	 * Example 3: GET Request with Path Parameters
	 * Demonstrates RESTful API patterns
	 */
	console.log("\n--- Example 3: GET request with path parameters ---");
	const userResult = await runAgentTask(
		runner,
		sessionId,
		"Get user information for user ID 1 from https://jsonplaceholder.typicode.com/users/1",
	);
	console.log("Agent response:", userResult);

	/**
	 * Example 4: HTTP Status Code Handling
	 * Shows status code awareness and handling
	 */
	console.log("\n--- Example 4: GET request with status code handling ---");
	const statusResult = await runAgentTask(
		runner,
		sessionId,
		"Make a GET request to https://httpstat.us/200 and tell me what the status code is",
	);
	console.log("Agent response:", statusResult);

	/**
	 * Example 5: PUT Request for Data Updates
	 * Demonstrates data modification via HTTP
	 */
	console.log("\n--- Example 5: PUT request to update data ---");
	const putResult = await runAgentTask(
		runner,
		sessionId,
		"Send a PUT request to https://jsonplaceholder.typicode.com/posts/1 to update the post with title: 'Updated Post' and body: 'This post has been updated'",
	);
	console.log("Agent response:", putResult);

	/**
	 * Example 6: Custom Headers
	 * Shows how to add custom headers to requests
	 */
	console.log("\n--- Example 6: GET request with custom headers ---");
	const headersResult = await runAgentTask(
		runner,
		sessionId,
		"Make a GET request to https://httpbin.org/headers with a custom header 'X-Custom-Header: ADK-Demo'",
	);
	console.log("Agent response:", headersResult);
}

async function main() {
	console.log("🌐 Starting HTTP Request Tool example...");

	try {
		/**
		 * Set up session management
		 * Creates a persistent session for the demonstration
		 */
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		/**
		 * Create agent with HTTP request capabilities
		 * The agent can now make HTTP calls to external APIs
		 */
		const agent = createHttpAgent();

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
		 * Run comprehensive HTTP request demonstrations
		 * Shows various HTTP methods and use cases
		 */
		await runHttpRequestExamples(runner, session.id);

		console.log("\n🎉 HTTP request tool example completed!");
	} catch (error) {
		console.error("❌ Error in HTTP request example:", error);
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
