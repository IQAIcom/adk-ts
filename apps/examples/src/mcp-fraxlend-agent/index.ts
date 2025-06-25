import {
	Agent,
	GoogleLLM,
	LLMRegistry,
	type McpConfig,
	McpError,
	McpToolset,
	type MessageRole,
} from "@iqai/adk";
// Load environment variables from .env file

LLMRegistry.registerLLM(GoogleLLM);

/**
 * Demonstrates an agent using MCP tools from the @iqai/mcp-fraxlend server.
 */
async function main() {
	let toolset: McpToolset | null = null;

	console.log("🚀 Starting MCP Fraxlend Agent Example");

	// Retrieve required environment variables
	const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;

	if (!walletPrivateKey) {
		console.warn(
			"⚠️ Warning: WALLET_PRIVATE_KEY is not set. Some Fraxlend tools requiring a wallet will fail.",
		);
	}

	try {
		const mcpConfig: McpConfig = {
			name: "Fraxlend MCP Client",
			description: "Client for the @iqai/mcp-fraxlend server",
			debug: process.env.DEBUG === "true",
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
				args: ["dlx", "@iqai/mcp-fraxlend"],
				env: {
					...(process.env.WALLET_PRIVATE_KEY && {
						WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
					}),
					PATH: process.env.PATH || "", // important to pass PATH to child processes
				},
			},
		};

		// Create a toolset for the MCP server
		console.log("🔄 Connecting to @iqai/mcp-fraxlend server via MCP...");
		toolset = new McpToolset(mcpConfig);

		// Get tools from the toolset
		const mcpTools = await toolset.getTools();

		if (mcpTools.length === 0) {
			console.warn(
				"⚠️ No tools retrieved from the MCP server. Ensure the server is running correctly and accessible.",
			);
			// Attempt to proceed, but agent might not have tools
		}

		console.log(
			`✅ Retrieved ${mcpTools.length} tools from the @iqai/mcp-fraxlend server:"`,
		);
		mcpTools.forEach((tool) => {
			console.log(`   - ${tool.name}: ${tool.description}`);
		});

		// Create the agent with MCP Fraxlend tools
		const agent = new Agent({
			name: "mcp_fraxlend_assistant",
			model: process.env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
			description:
				"An assistant that can interact with the IQ AI Fraxlend via MCP using Google Gemini",
			instructions:
				"You are a helpful assistant that can interact with the IQ AI Fraxlend.",
			tools: mcpTools,
			maxToolExecutionSteps: 3,
		});

		console.log("🤖 Agent initialized with MCP Fraxlend tools.");
		console.log("-----------------------------------");

		// Example 1: Get Lending Stat
		const pairAddress = "0x1234567890abcdef1234567890abcdef12345678"; // Example pair address
		console.log(`
🌟 Example 1: Get the lending stat for this pair address ${pairAddress}`);
		const lendStatQuery = `Get the lending stat for this pair address ${pairAddress}.`;
		console.log(`💬 User Query: ${lendStatQuery}`);
		console.log("-----------------------------------");

		const lendStatResponse = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: lendStatQuery,
				},
			],
		});
		console.log(`💡 Agent Response: ${lendStatResponse.content}`);
		console.log("-----------------------------------");

		// Example 2: Borrow from the pool
		const tokensToSell = 1000; // Example number of tokens to sell
		console.log(`
🌟 Example 2: Borrow ${tokensToSell} FRAX using 2 ETH as collateral from the pool at ${pairAddress}`);
		const borrowQuery = `Borrow ${tokensToSell} FRAX using 2 ETH as collateral from the pool at ${pairAddress}.`;
		console.log(`💬 User Query: ${borrowQuery}`);
		console.log("-----------------------------------");

		const borrowResponse = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: borrowQuery,
				},
			],
		});
		console.log(`💡 Agent Response: ${borrowResponse.content}`);
		console.log("-----------------------------------");

		console.log("✅ MCP Fraxlend Agent examples complete!");
	} catch (error) {
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
	} finally {
		if (toolset) {
			console.log("🧹 Cleaning up MCP resources...");
			await toolset
				.close()
				.catch((err) =>
					console.error("   Error during MCP toolset cleanup:", err),
				);
		}
		// process.exit(0); // Commented out to see if it exits cleanly on its own
	}
}

main().catch((error) => {
	if (error instanceof McpError) {
		console.error(`💥 Fatal MCP Error (${error.type}): ${error.message}`);
	} else {
		console.error("💥 Fatal Error in main execution:", error);
	}
	process.exit(1);
});
