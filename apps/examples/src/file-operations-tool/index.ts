import * as path from "node:path";
import { env } from "node:process";
import {
	FileOperationsTool,
	InMemorySessionService,
	LlmAgent,
	Runner,
} from "@iqai/adk";
import { v4 as uuidv4 } from "uuid";

/**
 * Application configuration constants
 */
const APP_NAME = "file-operations-example";
const USER_ID = uuidv4();

/**
 * File Operations Tool Example
 *
 * This example demonstrates how to use the FileOperationsTool to enable
 * agents to perform file system operations such as reading, writing,
 * creating directories, and listing contents within a secure base path.
 *
 * The example:
 * 1. Creates a temporary directory for safe file operations
 * 2. Sets up an agent with FileOperationsTool capabilities
 * 3. Demonstrates file creation, reading, and directory operations
 * 4. Shows directory traversal and subdirectory operations
 * 5. Ensures all operations are confined to the specified base path
 *
 * Expected Output:
 * - File creation and writing operations
 * - File reading and content verification
 * - Directory listing and navigation
 * - Subdirectory creation and management
 * - Files created in the temp-examples directory
 *
 * Prerequisites:
 * - Node.js environment
 * - LLM_MODEL environment variable (optional, defaults to gemini-2.5-flash)
 * - Write permissions for creating temporary directories
 */
async function main() {
	console.log("📁 Starting File Operations Tool example...");

	try {
		/**
		 * Create a temporary directory for safe file operations
		 * All file operations will be confined to this directory
		 */
		const tempDir = path.join(process.cwd(), "temp-examples");

		/**
		 * Set up session management
		 * Provides conversation context for the agent
		 */
		const sessionService = new InMemorySessionService();
		const session = await sessionService.createSession(APP_NAME, USER_ID);

		/**
		 * Create agent with file operations capabilities
		 * The agent can safely perform file system operations within the base path
		 */
		const agent = createFileOperationsAgent(tempDir);

		/**
		 * Set up runner for agent execution
		 * Coordinates agent interactions and tool usage
		 */
		const runner = new Runner({
			appName: APP_NAME,
			agent,
			sessionService,
		});

		/**
		 * Run comprehensive file operations demonstrations
		 * Shows various file system operations through natural language
		 */
		await demonstrateFileOperations(runner, session.id);

		console.log("\n✅ File operations example completed!");
		console.log(
			`📁 Check the '${tempDir}' directory to see the created files.`,
		);
	} catch (error) {
		console.error("❌ Error in file operations example:", error);
		process.exit(1);
	}
}

/**
 * Creates and configures the LLM agent with file operations capabilities
 * @param tempDir The base directory for file operations
 * @returns Configured LlmAgent with FileOperationsTool
 */
function createFileOperationsAgent(tempDir: string): LlmAgent {
	const fileToolWithBasePath = new FileOperationsTool({ basePath: tempDir });

	return new LlmAgent({
		name: "file_operations_demo",
		model: env.LLM_MODEL || "gemini-2.5-flash",
		description:
			"An agent that demonstrates file operations capabilities using Google Gemini",
		instruction: `You are a helpful assistant that can perform file system operations.
Use the file_operations tool to read, write, and manage files.
Always verify operations success by checking the 'success' property in the response.
For reading operations, the content will be in the 'data' property when successful.
Provide clear feedback about what operations were performed.`,
		tools: [fileToolWithBasePath],
	});
}

/**
 * Runs comprehensive file operations demonstrations
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 */
async function demonstrateFileOperations(
	runner: Runner,
	sessionId: string,
): Promise<void> {
	/**
	 * Example 1: Write a simple file
	 * Demonstrates basic file creation and writing
	 */
	console.log("\n--- Example 1: Write a file ---");
	const writeResult = await runAgentTask(
		runner,
		sessionId,
		"Write 'Hello, world!' to a file named 'hello.txt'",
	);
	console.log("Agent response:", writeResult);

	/**
	 * Example 2: Read the created file
	 * Shows file content retrieval
	 */
	console.log("\n--- Example 2: Read a file ---");
	const readResult = await runAgentTask(
		runner,
		sessionId,
		"Read the contents of the file 'hello.txt'",
	);
	console.log("Agent response:", readResult);

	/**
	 * Example 3: List directory contents
	 * Demonstrates directory enumeration
	 */
	console.log("\n--- Example 3: List directory contents ---");
	const listResult = await runAgentTask(
		runner,
		sessionId,
		"List all files in the current directory",
	);
	console.log("Agent response:", listResult);

	/**
	 * Example 4: Check file existence
	 * Shows file existence verification
	 */
	console.log("\n--- Example 4: Check if a file exists ---");
	const existsResult = await runAgentTask(
		runner,
		sessionId,
		"Check if a file named 'non-existent.txt' exists",
	);
	console.log("Agent response:", existsResult);

	/**
	 * Example 5: Create a directory
	 * Demonstrates directory creation
	 */
	console.log("\n--- Example 5: Create a directory ---");
	const mkdirResult = await runAgentTask(
		runner,
		sessionId,
		"Create a new directory called 'test-dir'",
	);
	console.log("Agent response:", mkdirResult);

	/**
	 * Example 6: Write to subdirectory
	 * Shows file operations in subdirectories
	 */
	console.log("\n--- Example 6: Write to subdirectory ---");
	const subDirWriteResult = await runAgentTask(
		runner,
		sessionId,
		"Write 'Hello from subdirectory!' to 'test-dir/sub-hello.txt'",
	);
	console.log("Agent response:", subDirWriteResult);

	/**
	 * Example 7: List subdirectory contents
	 * Demonstrates subdirectory navigation and listing
	 */
	console.log("\n--- Example 7: List subdirectory contents ---");
	const subDirListResult = await runAgentTask(
		runner,
		sessionId,
		"List all files in the 'test-dir' directory",
	);
	console.log("Agent response:", subDirListResult);
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
			if (event.author === "file_operations_demo" && event.content?.parts) {
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
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
