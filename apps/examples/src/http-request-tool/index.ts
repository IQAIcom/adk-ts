import { env } from "node:process";
import { AgentBuilder, HttpRequestTool } from "@iqai/adk";

async function main() {
	console.log("🌐 Starting HTTP Request Tool example...");

	try {
		/**
		 * Create agent with HTTP request capabilities using AgentBuilder
		 * The agent can now make HTTP calls to external APIs
		 */
		const { runner } = await AgentBuilder.create("http_request_demo")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription(
				"An agent that demonstrates HTTP request capabilities using Google Gemini",
			)
			.withInstruction(`You are a helpful assistant that can make HTTP requests to retrieve information.
Use the http_request tool to fetch data from APIs and web services.
Always examine the status code to ensure the request was successful.
For JSON responses, try to extract and present the most relevant information.
Be clear about the HTTP method and URL you're using.`)
			.withTools(new HttpRequestTool())
			.build();

		/**
		 * Run comprehensive HTTP request demonstrations
		 * Shows various HTTP methods and use cases
		 */
		await runHttpRequestExamples(runner);

		console.log("\n🎉 HTTP request tool example completed!");
	} catch (error) {
		console.error("❌ Error in HTTP request example:", error);
		process.exit(1);
	}
}

/**
 * Runs comprehensive HTTP request tool demonstrations
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function runHttpRequestExamples(runner: any): Promise<void> {
	/**
	 * Example 1: Simple GET Request
	 * Demonstrates basic API data retrieval
	 */
	console.log("\n--- Example 1: GET request to JSONPlaceholder API ---");
	const postsResult = await runner.ask(
		"Get a list of posts from https://jsonplaceholder.typicode.com/posts and show me the first 3 posts",
	);
	console.log("Agent response:", postsResult);

	/**
	 * Example 2: POST Request with JSON Body
	 * Shows how to send data to an API
	 */
	console.log("\n--- Example 2: POST request with JSON body ---");
	const postResult = await runner.ask(
		"Send a POST request to https://jsonplaceholder.typicode.com/posts with a JSON body containing title: 'Agent Test' and body: 'This is a test post created by an AI agent'",
	);
	console.log("Agent response:", postResult);

	/**
	 * Example 3: GET Request with Path Parameters
	 * Demonstrates RESTful API patterns
	 */
	console.log("\n--- Example 3: GET request with path parameters ---");
	const userResult = await runner.ask(
		"Get user information for user ID 1 from https://jsonplaceholder.typicode.com/users/1",
	);
	console.log("Agent response:", userResult);

	/**
	 * Example 4: HTTP Status Code Handling
	 * Shows status code awareness and handling
	 */
	console.log("\n--- Example 4: GET request with status code handling ---");
	const statusResult = await runner.ask(
		"Make a GET request to https://httpstat.us/200 and tell me what the status code is",
	);
	console.log("Agent response:", statusResult);

	/**
	 * Example 5: PUT Request for Data Updates
	 * Demonstrates data modification via HTTP
	 */
	console.log("\n--- Example 5: PUT request to update data ---");
	const putResult = await runner.ask(
		"Send a PUT request to https://jsonplaceholder.typicode.com/posts/1 to update the post with title: 'Updated Post' and body: 'This post has been updated'",
	);
	console.log("Agent response:", putResult);

	/**
	 * Example 6: Custom Headers
	 * Shows how to add custom headers to requests
	 */
	console.log("\n--- Example 6: GET request with custom headers ---");
	const headersResult = await runner.ask(
		"Make a GET request to https://httpbin.org/headers with a custom header 'X-Custom-Header: ADK-Demo'",
	);
	console.log("Agent response:", headersResult);
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
