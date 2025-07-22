import { env } from "node:process";
import { AgentBuilder, type EnhancedRunner, McpFilesystem } from "@iqai/adk";

async function main() {
	console.log("📁 Starting MCP Filesystem Agent example...");

	try {
		/**
		 * Create Filesystem MCP toolset and get individual tools
		 * Provides access to file system functionality
		 */
		const filesystemTools = await McpFilesystem().getTools();

		/**
		 * Create agent with filesystem capabilities using AgentBuilder
		 * The agent can interact with the file system
		 */
		const { runner } = await AgentBuilder.create("filesystem_assistant")
			.withModel(env.LLM_MODEL || "gemini-2.5-flash")
			.withDescription(
				"A file system assistant with MCP Filesystem capabilities",
			)
			.withInstruction(`You are a helpful assistant that can interact with the file system.
Use the filesystem tools to read files, list directories, and gather information from the file system.
Be careful and respectful when accessing files - only read what's necessary.
Provide helpful summaries and insights from the file content you access.
Always respect file permissions and security boundaries.`)
			.withTools(...filesystemTools)
			.build();

		/**
		 * Demonstrate filesystem integration capabilities
		 * Shows various ways to interact with the file system
		 */
		await demonstrateFileReading(runner);
		await demonstrateDirectoryOperations(runner);
		await demonstrateFileAnalysis(runner);

		console.log("\n✅ MCP Filesystem Agent example completed!");
	} catch (error) {
		console.error("❌ Error in MCP Filesystem example:", error);
		process.exit(1);
	}
}

/**
 * Demonstrates file reading capabilities
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateFileReading(runner: EnhancedRunner): Promise<void> {
	console.log("\n=== File Reading Operations ===");

	/**
	 * Read and analyze package.json file
	 */
	console.log("\n--- Reading Package Configuration ---");
	const packageAnalysis = await runner.ask(
		"Can you read and analyze the package.json file in the current directory? Tell me about the project dependencies and scripts.",
	);
	console.log(
		"👤 User: Can you read and analyze the package.json file in the current directory? Tell me about the project dependencies and scripts.",
	);
	console.log("📦 Package Analysis:", packageAnalysis);

	/**
	 * Read README file
	 */
	console.log("\n--- Reading Project Documentation ---");
	const readmeAnalysis = await runner.ask(
		"Please read the README.md file and give me a summary of what this project is about.",
	);
	console.log(
		"👤 User: Please read the README.md file and give me a summary of what this project is about.",
	);
	console.log("📖 README Summary:", readmeAnalysis);
}

/**
 * Demonstrates directory operations and navigation
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateDirectoryOperations(
	runner: EnhancedRunner,
): Promise<void> {
	console.log("\n=== Directory Operations ===");

	/**
	 * List current directory contents
	 */
	console.log("\n--- Directory Listing ---");
	const directoryList = await runner.ask(
		"List the contents of the current directory and tell me what types of files and folders are present.",
	);
	console.log(
		"👤 User: List the contents of the current directory and tell me what types of files and folders are present.",
	);
	console.log("📂 Directory Contents:", directoryList);

	/**
	 * Explore source code structure
	 */
	console.log("\n--- Source Code Exploration ---");
	const sourceExploration = await runner.ask(
		"Explore the src directory (if it exists) and tell me about the code structure and main files.",
	);
	console.log(
		"👤 User: Explore the src directory (if it exists) and tell me about the code structure and main files.",
	);
	console.log("🔍 Source Structure:", sourceExploration);

	/**
	 * Find configuration files
	 */
	console.log("\n--- Configuration Files ---");
	const configFiles = await runner.ask(
		"Look for configuration files in the project (like tsconfig.json, eslint config, etc.) and summarize what they configure.",
	);
	console.log(
		"👤 User: Look for configuration files in the project (like tsconfig.json, eslint config, etc.) and summarize what they configure.",
	);
	console.log("⚙️ Configuration Summary:", configFiles);
}

/**
 * Demonstrates file analysis and content understanding
 * @param runner The AgentBuilder runner for executing agent tasks
 */
async function demonstrateFileAnalysis(runner: EnhancedRunner): Promise<void> {
	console.log("\n=== File Analysis ===");

	/**
	 * Analyze TypeScript files
	 */
	console.log("\n--- Code Analysis ---");
	const codeAnalysis = await runner.ask(
		"Find and analyze some TypeScript or JavaScript files in the project. Tell me about the main functions, classes, or components you find.",
	);
	console.log(
		"👤 User: Find and analyze some TypeScript or JavaScript files in the project. Tell me about the main functions, classes, or components you find.",
	);
	console.log("💻 Code Analysis:", codeAnalysis);

	/**
	 * Project structure overview
	 */
	console.log("\n--- Project Structure Overview ---");
	const projectOverview = await runner.ask(
		"Give me an overall overview of this project structure. What kind of project is this, what technologies does it use, and how is it organized?",
	);
	console.log(
		"👤 User: Give me an overall overview of this project structure. What kind of project is this, what technologies does it use, and how is it organized?",
	);
	console.log("🏗️ Project Overview:", projectOverview);

	/**
	 * Security and best practices check
	 */
	console.log("\n--- Security Check ---");
	const securityCheck = await runner.ask(
		"Look for any security-related files (like .gitignore, security configs) and comment on the project's security practices.",
	);
	console.log(
		"👤 User: Look for any security-related files (like .gitignore, security configs) and comment on the project's security practices.",
	);
	console.log("🔒 Security Review:", securityCheck);
}

/**
 * Execute the main function and handle any errors
 */
main().catch((error) => {
	console.error("💥 Fatal error:", error);
	process.exit(1);
});
