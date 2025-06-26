import * as path from "node:path";
import { env } from "node:process";
import {
	InMemorySessionService,
	LlmAgent,
	type McpConfig,
	McpError,
	McpToolset,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

const DEBUG = true;
const APP_NAME = "mcp-filesystem-example";
const USER_ID = uuidv4();

// Use a temp directory for allowed path, similar to file-operations-tool example
const ALLOWED_PATH = path.join(process.cwd(), "temp-examples");

async function main() {
	let toolset: McpToolset | null = null;

	try {
		console.log("🚀 Starting MCP Filesystem Agent Example", ALLOWED_PATH);

		const mcpConfig: McpConfig = {
			name: "Filesystem Client",
			description: "Client for MCP Filesystem Server",
			debug: true,
			retryOptions: {
				maxRetries: 2,
				initialDelay: 100,
			},
			cacheConfig: {
				enabled: true,
			},
			transport: {
				mode: "stdio",
				command: "npx",
				args: ["-y", "@modelcontextprotocol/server-filesystem", ALLOWED_PATH],
			},
		};

		console.log("Connecting to MCP filesystem server...");
		toolset = new McpToolset(mcpConfig);

		const mcpTools = await toolset.getTools();

		console.log(`Retrieved ${mcpTools.length} tools from the MCP server:`);
		mcpTools.forEach((tool) => {
			console.log(`- ${tool.name}: ${tool.description}`);
		});

		const agent = new LlmAgent({
			name: "filesystem_assistant",
			model: env.LLM_MODEL || "gemini-2.5-flash",
			description: "An assistant that can manipulate files using Google Gemini",
			instruction: `You are a helpful assistant that can manipulate files in the application's temp directory.
				You have access to tools that let you write, read, and manage files.
				When asked to create a rhyme, be creative and write a short, original rhyme to a file.
				When reading files, summarize the content appropriately.`,
			tools: mcpTools,
		});

		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		async function runAgentTask(userMessage: string): Promise<string> {
			const newMessage = {
				parts: [
					{
						text: userMessage,
					},
				],
			};

			let agentResponse = "";

			if (DEBUG) {
				console.log(`\n[DEBUG] Starting agent loop with query: ${userMessage}`);
			}

			try {
				for await (const event of runner.runAsync({
					userId: USER_ID,
					sessionId: session.id,
					newMessage,
				})) {
					if (event.author === agent.name && event.content?.parts) {
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

			if (DEBUG) {
				console.log("[DEBUG] Agent loop completed");
			}

			return agentResponse || "No response from agent";
		}

		console.log("Agent initialized with MCP filesystem tools");
		console.log("-----------------------------------");

		console.log("\nExample 1: Creating a rhyme file");
		console.log(
			"Question: Create a short nursery rhyme about coding and save it to a file called coding_rhyme.txt",
		);
		console.log("-----------------------------------");

		const createResponse = await runAgentTask(
			"Create a short nursery rhyme about coding and save it to a file called coding_rhyme.txt",
		);

		console.log("Final Response:", createResponse);
		console.log("-----------------------------------");

		console.log("\nExample 2: Reading the rhyme file");
		console.log(
			"Question: Now read the coding_rhyme.txt file you just created and tell me what it says.",
		);
		console.log("-----------------------------------");

		const readResponse = await runAgentTask(
			"Now read the coding_rhyme.txt file you just created and tell me what it says.",
		);

		console.log("Final Response:", readResponse);
		console.log("-----------------------------------");

		console.log("\nExample 3: Multi-step conversation");
		console.log("-----------------------------------");

		const createFileResponse = await runAgentTask(
			"Create a new file called desktop_report.txt with a list of 3 benefits of keeping your desktop organized.",
		);
		console.log(
			"User: Create a new file called desktop_report.txt with a list of 3 benefits of keeping your desktop organized.",
		);
		console.log("Assistant:", createFileResponse);

		console.log("\nUser: Read the desktop_report.txt file you just created.");
		const readFileResponse = await runAgentTask(
			"Read the desktop_report.txt file you just created.",
		);
		console.log("Assistant:", readFileResponse);

		console.log(
			"\nUser: Update the desktop_report.txt file to include a fourth benefit about productivity.",
		);
		const updateFileResponse = await runAgentTask(
			"Update the desktop_report.txt file to include a fourth benefit about productivity.",
		);
		console.log("Assistant:", updateFileResponse);

		console.log("\n🎉 MCP Filesystem Agent examples complete!");
		console.log("\n📊 What we demonstrated:");
		console.log("✅ Connecting to MCP filesystem server");
		console.log("✅ Creating and writing files through MCP tools");
		console.log("✅ Reading file contents through MCP tools");
		console.log("✅ Multi-step file operations with session persistence");
		console.log("✅ File modification and updates");
		console.log("✅ Proper error handling and resource cleanup");
	} catch (error) {
		if (error instanceof McpError) {
			console.error(`MCP Error (${error.type}): ${error.message}`);
			if (error.originalError) {
				console.error("Original error:", error.originalError);
			}
		} else {
			console.error("Error:", error);
		}
	} finally {
		if (toolset) {
			console.log("Cleaning up MCP resources...");
			await toolset
				.close()
				.catch((err) => console.error("Error during cleanup:", err));
		}
		process.exit(0);
	}
}

main().catch((error) => {
	if (error instanceof McpError) {
		console.error(`Fatal MCP Error (${error.type}): ${error.message}`);
	} else {
		console.error("Fatal Error:", error);
	}
	process.exit(1);
});
