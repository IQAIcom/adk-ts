import * as path from "node:path";
import { Agent, FileOperationsTool, GoogleLLM, LLMRegistry } from "@adk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Register LLM provider
LLMRegistry.registerLLM(GoogleLLM);

async function main() {
	// Create a temp directory for examples
	const tempDir = path.join(process.cwd(), "temp-examples");

	// Create file operations tool with base path set to temp directory
	const fileToolWithBasePath = new FileOperationsTool({ basePath: tempDir });

	// Create an agent with this tool
	const agent = new Agent({
		name: "file_operations_demo",
		model: process.env.LLM_MODEL || "gemini-2.0-flash",
		description:
			"An agent that demonstrates file operations capabilities using Google Gemini",
		instructions: `You are a helpful assistant that can perform file system operations.
    Use the file_operations tool to read, write, and manage files.
    Always verify operations success by checking the 'success' property in the response.
    For reading operations, the content will be in the 'data' property when successful.`,
		tools: [fileToolWithBasePath],
	});

	// Example 1: Write a file
	console.log("\n--- Example 1: Write a file ---");
	const writeResult = await agent.run({
		messages: [
			{
				role: "user",
				content: "Write 'Hello, world!' to a file named 'hello.txt'",
			},
		],
	});
	console.log("Agent response:", writeResult.content);

	// Example 2: Read a file
	console.log("\n--- Example 2: Read a file ---");
	const readResult = await agent.run({
		messages: [
			{ role: "user", content: "Read the contents of the file 'hello.txt'" },
		],
	});
	console.log("Agent response:", readResult.content);

	// Example 3: List directory contents
	console.log("\n--- Example 3: List directory contents ---");
	const listResult = await agent.run({
		messages: [
			{ role: "user", content: "List all files in the current directory" },
		],
	});
	console.log("Agent response:", listResult.content);

	// Example 4: Check if a file exists
	console.log("\n--- Example 4: Check if a file exists ---");
	const existsResult = await agent.run({
		messages: [
			{
				role: "user",
				content: "Check if a file named 'non-existent.txt' exists",
			},
		],
	});
	console.log("Agent response:", existsResult.content);

	// Example 5: Create a directory
	console.log("\n--- Example 5: Create a directory ---");
	const mkdirResult = await agent.run({
		messages: [
			{ role: "user", content: "Create a new directory called 'test-dir'" },
		],
	});
	console.log("Agent response:", mkdirResult.content);
}

// Run the example
main().catch((error) => console.error("Error:", error));
