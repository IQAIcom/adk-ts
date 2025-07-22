import { env } from "node:process";
import {
	AgentBuilder,
	type BuiltAgent,
	type EnhancedRunner,
	type McpConfig,
	McpError,
	McpToolset,
} from "@iqai/adk";

let runner: EnhancedRunner;
async function main() {
	let toolset: McpToolset | null = null;

	console.log("🚀 Starting MCP ATP Agent Example");

	/**
	 * Validate required environment variables
	 * The example requires at least the token contract address to demonstrate features
	 */
	const { isValid, exampleTokenContract } = validateEnvironmentVariables();
	if (!isValid) {
		process.exit(1);
	}

	try {
		/**
		 * Initialize MCP ATP toolset
		 * Connects to the @iqai/mcp-atp server using stdio transport with proper environment setup
		 */
		console.log("🔄 Connecting to @iqai/mcp-atp server via MCP...");
		toolset = await initializeMcpToolset();

		/**
		 * Retrieve and display available tools
		 * The server provides tools for agent statistics, logs, and trading operations
		 */
		const mcpTools = await toolset.getTools();
		displayAvailableTools(mcpTools);

		/**
		 * Create LLM agent with ATP capabilities
		 * The agent is configured to understand and execute ATP-related operations
		 */
		runner = (await createAtpAgent(mcpTools)).runner;
		/**
		 * Execute demonstration examples
		 * Shows various ATP operations through natural language interactions
		 */
		await runAtpExamples(exampleTokenContract!);

		console.log("\n🎉 MCP ATP agent example completed!");
	} catch (error) {
		handleError(error);
	} finally {
		await cleanupResources(toolset);
	}
}

/**
 * Validates required environment variables and displays appropriate warnings
 * @returns Object containing validation status and token contract address
 */
function validateEnvironmentVariables(): {
	isValid: boolean;
	exampleTokenContract: string | undefined;
} {
	const exampleTokenContract =
		env.EXAMPLE_ATP_TOKEN_CONTRACT ||
		"0x4dBcC239b265295500D2Fe2d0900629BDcBBD0fB"; // Defaults to Sophia's token contract
	const walletPrivateKey = env.WALLET_PRIVATE_KEY;
	const atpApiKey = env.ATP_API_KEY;

	if (!exampleTokenContract) {
		console.error(
			"❌ Error: EXAMPLE_ATP_TOKEN_CONTRACT is not set in the .env file.",
		);
		console.log(
			"Please add EXAMPLE_ATP_TOKEN_CONTRACT to your .env file to run this example.",
		);
		return { isValid: false, exampleTokenContract: undefined };
	}

	if (!walletPrivateKey) {
		console.warn(
			"⚠️ Warning: WALLET_PRIVATE_KEY is not set. Some ATP tools requiring a wallet will fail.",
		);
	}

	if (!atpApiKey) {
		console.warn(
			"⚠️ Warning: ATP_API_KEY is not set. Some ATP tools requiring an API key might fail.",
		);
	}

	return { isValid: true, exampleTokenContract };
}

/**
 * Initializes the MCP toolset with proper configuration for the ATP server
 * @returns Configured McpToolset instance
 */
async function initializeMcpToolset(): Promise<McpToolset> {
	const mcpConfig: McpConfig = {
		name: "ATP MCP Client",
		description: "Client for the @iqai/mcp-atp server",
		debug: env.DEBUG === "true",
		retryOptions: {
			maxRetries: 2,
			initialDelay: 200,
		},
		cacheConfig: {
			enabled: false,
		},
		transport: {
			mode: "stdio",
			command: "pnpm",
			args: ["dlx", "@iqai/mcp-atp"],
			env: {
				...(env.WALLET_PRIVATE_KEY && {
					WALLET_PRIVATE_KEY: env.WALLET_PRIVATE_KEY,
				}),
				...(env.ATP_API_KEY && {
					ATP_API_KEY: env.ATP_API_KEY,
				}),
				...(env.ATP_USE_DEV && {
					ATP_USE_DEV: env.ATP_USE_DEV,
				}),
				PATH: env.PATH || "", // Important for child process execution
			},
		},
	};

	return new McpToolset(mcpConfig);
}

/**
 * Displays the available tools retrieved from the MCP server
 * @param mcpTools Array of tools provided by the ATP server
 */
function displayAvailableTools(mcpTools: any[]): void {
	if (mcpTools.length === 0) {
		console.warn(
			"⚠️ No tools retrieved from the MCP server. Ensure the server is running correctly and accessible.",
		);
		return;
	}

	console.log(
		`✅ Retrieved ${mcpTools.length} tools from the @iqai/mcp-atp server:`,
	);
	mcpTools.forEach((tool) => {
		console.log(`   - ${tool.name}: ${tool.description}`);
	});
}

/**
 * Creates and configures the LLM agent with ATP tools
 * @param mcpTools Array of tools to be used by the agent
 * @returns Configured LlmAgent instance
 */
async function createAtpAgent(mcpTools: any[]): Promise<BuiltAgent> {
	return await AgentBuilder.create("mcp_atp_assistant")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription(
			"Helpful assistant that can interact with the IQ AI Agent Tokenization Platform (ATP). ",
		)
		.withInstruction(
			"You are a helpful assistant that can interact with the IQ AI Agent Tokenization Platform (ATP). " +
				"You can retrieve agent statistics, manage logs, and perform token trading operations. " +
				"Be clear and informative in your responses about the operations you perform.",
		)
		.withTools(...mcpTools)
		.build();
}

/**
 * Runs comprehensive ATP demonstration examples
 * @param runner The Runner instance for executing agent tasks
 * @param sessionId The current session identifier
 * @param exampleTokenContract The token contract address to use in examples
 */
async function runAtpExamples(exampleTokenContract: string): Promise<void> {
	console.log("-----------------------------------");

	/**
	 * Example 1: Retrieve Agent Statistics
	 * Demonstrates how to get comprehensive statistics for an agent token
	 */
	await runExample({
		title: "Get Agent Statistics",
		description: `Retrieving comprehensive statistics for ${exampleTokenContract}`,
		query: `Get the agent statistics for token contract ${exampleTokenContract}`,
	});

	/**
	 * Example 2: Retrieve Agent Logs
	 * Shows how to fetch paginated logs for an agent
	 */
	await runExample({
		title: "Get Agent Logs",
		description: `Fetching recent logs for ${exampleTokenContract}`,
		query: `Retrieve the first page of logs for agent token contract ${exampleTokenContract}, with a limit of 5.`,
	});

	/**
	 * Example 3: Add Agent Log Entry
	 * Demonstrates adding a custom log entry to an agent
	 */
	const logMessage = "This is a test log added by the ADK example agent.";
	await runExample({
		title: "Add Agent Log",
		description: `Adding a custom log entry to ${exampleTokenContract}`,
		query: `Add the following log message to agent token contract ${exampleTokenContract}: "${logMessage}"`,
	});

	/**
	 * Example 4: Buy Agent Tokens
	 * Shows how to purchase agent tokens using IQ
	 */
	const iqAmountToBuy = 1000;
	await runExample({
		title: `Buy ${iqAmountToBuy} IQ worth of Agent Tokens`,
		description: `Purchasing agent tokens for ${exampleTokenContract}`,
		query: `Buy ${iqAmountToBuy} IQ worth of agent tokens for token contract ${exampleTokenContract}.`,
	});

	/**
	 * Example 5: Sell Agent Tokens
	 * Demonstrates how to sell agent tokens back to IQ
	 */
	const tokensToSell = 1000;
	await runExample({
		title: `Sell ${tokensToSell} Agent Tokens`,
		description: `Selling agent tokens for ${exampleTokenContract}`,
		query: `Sell ${tokensToSell} agent tokens for token contract ${exampleTokenContract}.`,
	});

	console.log("✅ MCP ATP Agent examples complete!");
}

/**
 * Executes a single demonstration example with consistent formatting
 * @param config Configuration object for the example
 */
async function runExample(config: {
	title: string;
	description: string;
	query: string;
}): Promise<void> {
	const { title, description, query } = config;

	console.log(`\n🌟 Example: ${title}`);
	console.log(`📋 ${description}`);
	console.log(`💬 User Query: ${query}`);
	console.log("-----------------------------------");

	const response = await runner.ask(query);
	console.log(`💡 Agent Response: ${response}`);
	console.log("-----------------------------------");
}

/**
 * Handles various types of errors that may occur during execution
 * @param error The error that occurred
 */
function handleError(error: unknown): void {
	if (error instanceof McpError) {
		console.error(`❌ MCP Error (${error.type}): ${error.message}`);
		if (error.originalError) {
			console.error("   Original error:", error.originalError);
			// Check for the specific ENOENT error for npx
			if (
				error.originalError instanceof Error &&
				error.originalError.message.includes("spawn npx ENOENT")
			) {
				console.error(
					"   Hint: This often means 'npx' was not found. Ensure Node.js and npm are correctly installed and their bin directory is in your system's PATH.",
				);
			}
		}
	} else {
		console.error("❌ An unexpected error occurred:", error);
	}
}

/**
 * Cleans up MCP resources and handles any cleanup errors
 * @param toolset The McpToolset instance to clean up
 */
async function cleanupResources(toolset: McpToolset | null): Promise<void> {
	if (toolset) {
		console.log("🧹 Cleaning up MCP resources...");
		try {
			await toolset.close();
		} catch (err) {
			console.error("   Error during MCP toolset cleanup:", err);
		}
	}
}

/**
 * Execute the main function and handle any fatal errors
 */
main().catch((error) => {
	if (error instanceof McpError) {
		console.error(`💥 Fatal MCP Error (${error.type}): ${error.message}`);
	} else {
		console.error("💥 Fatal Error in main execution:", error);
	}
	process.exit(1);
});
