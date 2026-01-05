import * as path from "node:path";
import { env } from "node:process";
import {
	AgentBuilder,
	FileOperationsTool,
	HttpRequestTool,
	McpToolset,
	createSamplingHandler,
	createTool,
} from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";
import { ask } from "../utils";

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

async function demonstrateMcpIntegration() {
	console.log("🔌 Part 1: MCP Integration\n");

	const { runner: samplingRunner } = await AgentBuilder.create(
		"sampling_assistant",
	)
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Provides user context for sampling requests")
		.withInstruction(
			'When asked for a user name, respond with "Alice Johnson".',
		)
		.build();

	const samplingHandler = createSamplingHandler(async (request) => {
		return ask(
			samplingRunner.ask.bind(samplingRunner),
			"What is the user's name for personalization?",
		);
	});

	const greetingToolset = new McpToolset({
		name: "Greeting Server",
		description: "Custom MCP server with sampling capabilities",
		samplingHandler,
		transport: {
			mode: "stdio",
			command: "npx",
			args: [
				"tsx",
				"apps/examples/new_src/06-mcp-and-integrations/greeting-server.ts",
			],
		},
	});

	try {
		const tools = await greetingToolset.getTools();

		const { runner } = await AgentBuilder.create("mcp_assistant")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription("Assistant with custom MCP server integration")
			.withInstruction(
				"Use MCP tools for personalized greetings and calculations.",
			)
			.withTools(...tools)
			.build();

		await ask(runner, "Please greet me using the greeting tool.");
		await ask(runner, "What's 25 multiplied by 8?");

		await greetingToolset.close();
	} catch (error) {
		console.error("❌ Error with MCP server:", error);
	}
}

async function demonstrateHttpIntegration() {
	console.log("\n🌐 Part 2: HTTP Integration\n");

	const { runner } = await AgentBuilder.create("http_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Agent that can make HTTP requests")
		.withInstruction("Make HTTP requests and explain responses clearly.")
		.withTools(new HttpRequestTool())
		.build();

	await ask(
		runner,
		"Make a GET request to https://httpbin.org/json and show what you received.",
	);
}

async function demonstrateFileIntegration() {
	console.log("\n📁 Part 3: File System Integration\n");

	const tempDir = path.join(process.cwd(), "temp-examples");

	const { runner } = await AgentBuilder.create("file_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Agent that can manage files and directories")
		.withInstruction("Create, read, and organize files safely.")
		.withTools(new FileOperationsTool({ basePath: tempDir }))
		.build();

	await ask(
		runner,
		"Create a simple project: make a src directory, add index.html and styles.css files with basic content.",
	);
}

async function demonstrateCompositeIntegration() {
	console.log("\n🔗 Part 4: Composite Integration\n");

	const tempDir = path.join(process.cwd(), "temp-integration");

	const { runner } = await AgentBuilder.create("integration_specialist")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription("Specialist combining multiple integrations")
		.withInstruction("Fetch data from APIs, process it, and save to files.")
		.withTools(
			new HttpRequestTool(),
			new FileOperationsTool({ basePath: tempDir }),
			weatherTool,
		)
		.build();

	await ask(
		runner,
		"Get weather for London, fetch a UUID from httpbin.org/uuid, then save a report as report.json",
	);
}

async function main() {
	console.log("🔌 MCP and Integrations\n");

	await demonstrateMcpIntegration();
	await demonstrateHttpIntegration();
	await demonstrateFileIntegration();
	await demonstrateCompositeIntegration();

	console.log("\n✅ Complete! Next: 07-guardrails-and-evaluation\n");
}

main().catch(console.error);
