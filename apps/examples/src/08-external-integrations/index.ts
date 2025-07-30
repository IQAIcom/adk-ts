import * as path from "node:path";
import { env } from "node:process";
import { google } from "@ai-sdk/google";
import {
	AgentBuilder,
	FileOperationsTool,
	HttpRequestTool,
	createTool,
} from "@iqai/adk";
import * as z from "zod";

/**
 * 08 - External Integrations
 *
 * Learn how to integrate agents with external systems including AI SDK
 * providers, HTTP APIs, and file systems. This example demonstrates
 * various integration patterns for building connected AI applications.
 *
 * Concepts covered:
 * - AI SDK integration (Google, OpenAI, Anthropic, etc.)
 * - HTTP API integration and web scraping
 * - File system operations and management
 * - External service authentication
 * - Error handling for external dependencies
 * - Rate limiting and retry strategies
 */

// Simple weather tool using wttr.in (free, no API key)
const weatherTool = createTool({
	name: "get_weather",
	description: "Get current weather for a city",
	schema: z.object({
		city: z.string().describe("City name"),
	}),
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

async function demonstrateAiSdkIntegration() {
	console.log("🤖 AI SDK Integration\n");

	const modelConfig = env.GOOGLE_GENERATIVE_AI_API_KEY
		? google("gemini-2.5-flash")
		: env.LLM_MODEL || "gemini-2.5-flash";

	const { runner } = await AgentBuilder.create("ai_sdk_agent")
		.withModel(modelConfig)
		.withDescription("An agent demonstrating AI SDK integration")
		.withInstruction(
			"You can explain AI model capabilities and get weather data.",
		)
		.withTools(weatherTool)
		.build();

	const response = await runner.ask("Get the weather for Tokyo");
	console.log(`Response: ${response}\n`);
}

async function demonstrateHttpIntegration() {
	console.log("🌐 HTTP API Integration\n");

	const { runner } = await AgentBuilder.create("http_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("An agent that can make HTTP requests")
		.withInstruction("Make HTTP requests and explain the responses clearly.")
		.withTools(new HttpRequestTool())
		.build();

	const response = await runner.ask(
		"Make a GET request to https://httpbin.org/json and show what you received.",
	);
	console.log(`Response: ${response}\n`);
}

async function demonstrateFileSystemIntegration() {
	console.log("� File System Integration\n");

	const tempDir = path.join(process.cwd(), "temp-examples");

	const { runner } = await AgentBuilder.create("file_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("An agent that can manage files and directories")
		.withInstruction("Create, read, and organize files clearly and safely.")
		.withTools(new FileOperationsTool({ basePath: tempDir }))
		.build();

	const response = await runner.ask(
		"Create a simple project: make a src directory, add index.html and styles.css files with basic content, then list the structure.",
	);
	console.log(`Response: ${response}\n`);
}

async function demonstrateCompositeIntegration() {
	console.log("� Composite Integration\n");

	const tempDir = path.join(process.cwd(), "temp-integration");

	const { runner } = await AgentBuilder.create("integration_specialist")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("A specialist that combines multiple integrations")
		.withInstruction(
			"Fetch data from APIs, process it, and save results to files.",
		)
		.withTools(
			new HttpRequestTool(),
			new FileOperationsTool({ basePath: tempDir }),
			weatherTool,
		)
		.build();

	const response = await runner.ask(
		"Get weather for London and Tokyo, fetch a UUID from httpbin.org/uuid, then save a weather report as both JSON and markdown files.",
	);
	console.log(`Response: ${response}\n`);
}

async function main() {
	console.log(" External Integrations Example\n");

	await demonstrateAiSdkIntegration();
	await demonstrateHttpIntegration();
	await demonstrateFileSystemIntegration();
	await demonstrateCompositeIntegration();

	console.log("✅ All integrations completed!");
}

main().catch(console.error);
