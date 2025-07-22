import * as path from "node:path";
import { env } from "node:process";
import { AgentBuilder, FileOperationsTool } from "@iqai/adk";
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
		 * Create agent with file operations capabilities using AgentBuilder
		 * The agent can safely perform file system operations within the base path
		 */
		const fileToolWithBasePath = new FileOperationsTool({ basePath: tempDir });

		const { runner } = await AgentBuilder.create("file_operations_demo")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription(
				"An agent that demonstrates file operations capabilities using Google Gemini",
			)
			.withInstruction(`You are a helpful assistant that can perform file system operations.
Use the file_operations tool to read, write, and manage files.
Always verify operations success by checking the 'success' property in the response.
For reading operations, the content will be in the 'data' property when successful.
Provide clear feedback about what operations were performed.`)
			.withTools(fileToolWithBasePath)
			.build();

		/**
		 * Run comprehensive file operations demonstrations
		 * Shows various file system operations through natural language
		 */
		await demonstrateFileOperations(runner);

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
 * Runs comprehensive file operations demonstrations
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateFileOperations(runner: any): Promise<void> {
	/**
	 * Example 1: Write a simple file
	 * Demonstrates basic file creation and writing
	 */
	console.log("\n--- Example 1: Write a file ---");
	const writeResult = await runner.ask(
		"Write 'Hello, world!' to a file named 'hello.txt'",
	);
	console.log("Agent response:", writeResult);

	/**
	 * Example 2: Read the created file
	 * Shows file content retrieval
	 */
	console.log("\n--- Example 2: Read a file ---");
	const readResult = await runner.ask(
		"Read the contents of the file 'hello.txt'",
	);
	console.log("Agent response:", readResult);

	/**
	 * Example 3: List directory contents
	 * Demonstrates directory enumeration
	 */
	console.log("\n--- Example 3: List directory contents ---");
	const listResult = await runner.ask(
		"List all files in the current directory",
	);
	console.log("Agent response:", listResult);

	/**
	 * Example 4: Check file existence
	 * Shows file existence verification
	 */
	console.log("\n--- Example 4: Check if a file exists ---");
	const existsResult = await runner.ask(
		"Check if a file named 'non-existent.txt' exists",
	);
	console.log("Agent response:", existsResult);

	/**
	 * Example 5: Create a directory
	 * Demonstrates directory creation
	 */
	console.log("\n--- Example 5: Create a directory ---");
	const mkdirResult = await runner.ask(
		"Create a new directory called 'test-dir'",
	);
	console.log("Agent response:", mkdirResult);

	/**
	 * Example 6: Write to subdirectory
	 * Shows file operations in subdirectories
	 */
	console.log("\n--- Example 6: Write to subdirectory ---");
	const subDirWriteResult = await runner.ask(
		"Write 'Hello from subdirectory!' to 'test-dir/sub-hello.txt'",
	);
	console.log("Agent response:", subDirWriteResult);

	/**
	 * Example 7: List subdirectory contents
	 * Demonstrates subdirectory navigation and listing
	 */
	console.log("\n--- Example 7: List subdirectory contents ---");
	const subDirListResult = await runner.ask(
		"List all files in the 'test-dir' directory",
	);
	console.log("Agent response:", subDirListResult);
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
