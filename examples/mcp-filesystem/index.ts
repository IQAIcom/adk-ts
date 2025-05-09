/**
 * MCP Filesystem Server Example
 *
 * This example shows how to use the Model Context Protocol (MCP) filesystem server
 * to create, write, and read files through MCP tools.
 */

import * as dotenv from "dotenv";
import { Agent, type MessageRole } from "../../src";
import { OpenAILLM } from "../../src/llm/providers/openai/OpenAILLM";
import { LLMRegistry } from "../../src/llm/registry/LLMRegistry";
import { getMcpTools } from "../../src/tools/mcp";
import type { McpConfig } from "../../src/tools/mcp/types";

// Load environment variables from .env file
dotenv.config();

// Register the OpenAI LLM
LLMRegistry.registerLLM(OpenAILLM);

// Enable debug mode for showing agent loop
const DEBUG = true;

// Specify the allowed path for file operations
const ALLOWED_PATH = "path/to/your/desktop";

/**
 * Demonstrates an agent using MCP filesystem tools
 */
async function main() {
	try {
		console.log("🚀 Starting MCP Filesystem Agent Example");

		// Configure the MCP client
		const mcpConfig: McpConfig = {
			name: "Filesystem Client",
			description: "Client for MCP Filesystem Server",
			debug: true,
			transport: {
				mode: "stdio",
				command: "npx",
				args: ["-y", "@modelcontextprotocol/server-filesystem", ALLOWED_PATH],
			},
		};

		// Get tools from the MCP server
		console.log("Connecting to MCP filesystem server...");
		const mcpTools = await getMcpTools(mcpConfig);

		console.log(`Retrieved ${mcpTools.length} tools from the MCP server:`);
		mcpTools.forEach((tool) => {
			console.log(`- ${tool.name}: ${tool.description}`);
		});

		// Create the agent with MCP filesystem tools
		const agent = new Agent({
			name: "filesystem_assistant",
			model: process.env.LLM_MODEL || "gpt-4o-mini",
			description: "An assistant that can manipulate files",
			instructions: `You are a helpful assistant that can manipulate files on the user's desktop.
				You have access to tools that let you write, read, and manage files.
				You can only access files in this path: ${ALLOWED_PATH}
				When asked to create a rhyme, be creative and write a short, original rhyme to a file.
				When reading files, summarize the content appropriately.`,
			tools: mcpTools,
			maxToolExecutionSteps: 5, // Limit the tool execution steps
		});

		console.log("Agent initialized with MCP filesystem tools");
		console.log("-----------------------------------");

		if (DEBUG) {
			// Add debug wrapper for agent.run
			const originalRun = agent.run.bind(agent);
			agent.run = async (options) => {
				console.log(
					"\n[DEBUG] Starting agent loop with query:",
					options.messages[options.messages.length - 1].content,
				);
				const result = await originalRun(options);
				console.log("[DEBUG] Agent loop completed");
				return result;
			};
		}

		// Example 1: Create a file with a rhyme
		console.log("\nExample 1: Creating a rhyme file");
		console.log(
			"Question: Create a short nursery rhyme about coding and save it to a file called coding_rhyme.txt",
		);
		console.log("-----------------------------------");

		const createResponse = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content:
						"Create a short nursery rhyme about coding and save it to a file called coding_rhyme.txt",
				},
			],
		});

		console.log("Final Response:", createResponse.content);
		console.log("-----------------------------------");

		// Example 2: Read the created file
		console.log("\nExample 2: Reading the rhyme file");
		console.log(
			"Question: Now read the coding_rhyme.txt file you just created and tell me what it says.",
		);
		console.log("-----------------------------------");

		const readResponse = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content:
						"Now read the coding_rhyme.txt file you just created and tell me what it says.",
				},
			],
		});

		console.log("Final Response:", readResponse.content);
		console.log("-----------------------------------");

		// Example 3: Multi-step conversation
		console.log("\nExample 3: Multi-step conversation");
		console.log("-----------------------------------");

		// Start a conversation
		const conversation = [
			{
				role: "user" as MessageRole,
				content:
					"Create a new file called desktop_report.txt with a list of 3 benefits of keeping your desktop organized.",
			},
		];

		// First turn: Create the file
		let response = await agent.run({ messages: [...conversation] });
		console.log(
			"User: Create a new file called desktop_report.txt with a list of 3 benefits of keeping your desktop organized.",
		);
		console.log("Assistant:", response.content);

		// Add response to conversation
		conversation.push({
			role: "assistant" as MessageRole,
			content: response.content || "",
		});

		// Second turn: Read the file
		conversation.push({
			role: "user" as MessageRole,
			content: "Read the desktop_report.txt file you just created.",
		});
		console.log("\nUser: Read the desktop_report.txt file you just created.");

		response = await agent.run({ messages: [...conversation] });
		console.log("Assistant:", response.content);

		// Add response to conversation
		conversation.push({
			role: "assistant" as MessageRole,
			content: response.content || "",
		});

		// Third turn: Modify the file
		conversation.push({
			role: "user" as MessageRole,
			content:
				"Update the desktop_report.txt file to include a fourth benefit about productivity.",
		});
		console.log(
			"\nUser: Update the desktop_report.txt file to include a fourth benefit about productivity.",
		);

		response = await agent.run({ messages: [...conversation] });
		console.log("Assistant:", response.content);

		console.log("\nMCP Filesystem Agent examples complete!");
		process.exit(0);
	} catch (error) {
		console.error("Error:", error);
	}
}

// Run the example
main().catch((error) => {
	console.error("Error:", error);
});
