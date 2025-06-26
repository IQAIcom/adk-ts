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
 * Demonstrates an agent using MCP tools from the @iqai/mcp-odos server.
 */
async function main() {
	let toolset: McpToolset | null = null;

	console.log("🚀 Starting MCP Odos Agent Example");

	// Retrieve required environment variables
	const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;

	if (!walletPrivateKey) {
		console.warn(
			"⚠️ Warning: WALLET_PRIVATE_KEY is not set. Some Odos tools requiring a wallet will fail.",
		);
	}

	try {
		const mcpConfig: McpConfig = {
			name: "Odos MCP Client",
			description: "Client for the @iqai/mcp-odos server",
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
				args: ["dlx", "@iqai/mcp-odos"],
				env: {
					...(process.env.WALLET_PRIVATE_KEY && {
						WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
					}),
					PATH: process.env.PATH || "", // important to pass PATH to child processes
				},
			},
		};

		// Create a toolset for the MCP server
		console.log("🔄 Connecting to @iqai/mcp-odos server via MCP...");
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
			`✅ Retrieved ${mcpTools.length} tools from the @iqai/mcp-odos server:"`,
		);
		mcpTools.forEach((tool) => {
			console.log(`   - ${tool.name}: ${tool.description}`);
		});

		// Create the agent with MCP Odos tools
		const agent = new Agent({
			name: "mcp_odos_assistant",
			model: process.env.LLM_MODEL || "gemini-2.5-flash-preview-05-20",
			description:
				"An assistant that can interact with the IQ AI Odos via MCP using Google Gemini",
			instructions:
				"You are a helpful assistant that can interact with the IQ AI Odos.",
			tools: mcpTools,
			maxToolExecutionSteps: 3,
		});

		console.log("🤖 Agent initialized with MCP Odos tools.");
		console.log("-----------------------------------");

		// Example 1: Get Swap Quote
		const tokensToSell = 1000000000000000000; // Example number of tokens to sell
		const fromToken = "0x4dBcC239b265295500D2Fe2d0900629BDcBBD0fB"; // Example token to sell
		const toToken = "0x6EFB84bda519726Fa1c65558e520B92b51712101"; // Example token to buy
		console.log(`
🌟 Example 1: Get me a quote for swapping ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal`);
		const quoteQuery = `Get me a quote for swapping ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal.`;
		console.log(`💬 User Query: ${quoteQuery}`);
		console.log("-----------------------------------");

		const quoteResponse = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: quoteQuery,
				},
			],
		});
		console.log(`💡 Agent Response: ${quoteResponse.content}`);
		console.log("-----------------------------------");

		// Example 2: Swap Tokens
		console.log(`
🌟 Example 2: Swap ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal`);
		const swapQuery = `Swap ${tokensToSell} from ${fromToken} to ${toToken} on Fraxtal.`;
		console.log(`💬 User Query: ${swapQuery}`);
		console.log("-----------------------------------");

		const swapResponse = await agent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: swapQuery,
				},
			],
		});
		console.log(`💡 Agent Response: ${swapResponse.content}`);
		console.log("-----------------------------------");

		console.log("✅ MCP Odos Agent examples complete!");
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
