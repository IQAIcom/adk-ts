import * as path from "node:path";
import { env } from "node:process";
import {
	InMemorySessionService,
	LlmAgent,
	McpToolset,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "mcp-filesystem-example";
const USER_ID = uuidv4();
const ALLOWED_PATH = path.join(process.cwd());

/**
 * MCP Filesystem Example
 *
 * This example demonstrates how to use the Model Context Protocol (MCP) filesystem server
 * with the ADK framework to create an AI agent capable of file operations.
 *
 * The example:
 * 1. Connects to an MCP filesystem server via stdio transport
 * 2. Creates an LLM agent with filesystem tools
 * 3. Demonstrates file creation through natural language commands
 *
 * Expected Output:
 * - Connection status and available tools
 * - Agent responses showing file creation process
 * - A hello.txt file created in the current working directory
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 * - Network access for downloading MCP filesystem server
 */
async function main() {
	console.log("🚀 Starting MCP Filesystem Example");

	/**
	 * Initialize MCP filesystem toolset
	 * Connects to the filesystem server using stdio transport
	 */
	const toolset = new McpToolset({
		name: "Filesystem Client",
		description: "Client for MCP Filesystem Server",
		transport: {
			mode: "stdio",
			command: "npx",
			args: ["-y", "@modelcontextprotocol/server-filesystem", ALLOWED_PATH],
		},
	});
	const tools = await toolset.getTools();

	console.log(
		`Connected! Available tools: ${tools.map((t) => t.name).join(", ")}`,
	);

	/**
	 * Create LLM agent with filesystem capabilities
	 * The agent is configured to handle file operations through natural language
	 */
	const agent = new LlmAgent({
		name: "filesystem_assistant",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description: "An assistant that can work with files",
		instruction:
			"You are a helpful assistant that can read and write files. Be concise in your responses.",
		tools,
	});

	/**
	 * Set up session management for the conversation
	 */
	const sessionService = new InMemorySessionService();
	const session = await sessionService.createSession(APP_NAME, USER_ID);

	const runner = new Runner({
		appName: APP_NAME,
		agent,
		sessionService,
	});

	/**
	 * Demonstrate file creation through natural language
	 * The agent will interpret the request and use appropriate filesystem tools
	 */
	console.log("\n📝 Creating a simple text file...");

	const userMessage = {
		parts: [
			{
				text: "Create a file called hello.txt with the message 'Hello from MCP!'",
			},
		],
	};

	/**
	 * Stream the agent's response and display it in real-time
	 * The agent will process the request and show its progress
	 */
	for await (const event of runner.runAsync({
		userId: USER_ID,
		sessionId: session.id,
		newMessage: userMessage,
	})) {
		if (event.author === agent.name && event.content?.parts) {
			const response = event.content.parts.map((part) => part.text).join("");
			if (response) {
				console.log("Agent:", response);
			}
		}
	}

	/**
	 * Clean up resources and close the toolset connection
	 */
	await toolset.close();
	console.log("\n✅ Example complete!");
}

/**
 * Execute the main function and handle any errors
 */
main().catch(console.error);
