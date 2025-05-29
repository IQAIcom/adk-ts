import { GoogleLLM, LLMRegistry, type MessageRole } from "@adk";
import { McpError, McpToolset } from "@adk/tools/mcp";
import type { McpConfig } from "@adk/tools/mcp/types";
import * as dotenv from "dotenv";
import { SimpleBrainVaultAgent } from "./brain-vault-agent";

dotenv.config();

LLMRegistry.registerLLM(GoogleLLM);

const DEBUG = process.env.DEBUG === "true" || true;

/**
 * Main demonstration function
 */
async function main() {
	let fraxlendToolset: McpToolset | null = null;
	let odosToolset: McpToolset | null = null;

	console.log("🧠 Starting Simple Brain Vault Agent Demo");
	console.log("==========================================");

	// Check required environment variables
	const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
	if (!walletPrivateKey) {
		console.error("❌ Error: WALLET_PRIVATE_KEY is required in .env file");
		process.exit(1);
	}

	// Safety warning
	console.log("⚠️  WARNING: This agent will execute REAL transactions!");
	console.log("💰 Real swaps will be performed with your wallet funds");
	console.log("🔐 Using wallet private key from environment variables");
	console.log("==========================================");

	try {
		// Initialize Fraxlend MCP Toolset
		console.log("🔄 Connecting to Fraxlend MCP server...");

		const fraxlendConfig: McpConfig = {
			name: "Fraxlend MCP Client",
			description: "Client for Fraxlend lending protocol",
			debug: DEBUG,
			retryOptions: {
				maxRetries: 2,
				initialDelay: 200,
			},
			transport: {
				mode: "stdio",
				command: "pnpm",
				args: ["dlx", "@iqai/mcp-fraxlend"],
				env: {
					WALLET_PRIVATE_KEY: walletPrivateKey,
					PATH: process.env.PATH || "",
				},
			},
		};

		fraxlendToolset = new McpToolset(fraxlendConfig);
		const fraxlendTools = await fraxlendToolset.getTools();
		console.log(
			`✅ Connected to Fraxlend MCP (${fraxlendTools.length} tools available)`,
		);

		// Log available tools for debugging
		if (DEBUG) {
			console.log("📋 Available Fraxlend tools:");
			fraxlendTools.forEach((tool) => {
				console.log(`   - ${tool.name}: ${tool.description}`);
			});
		}

		// Initialize Odos MCP Toolset
		console.log("🔄 Connecting to Odos MCP server...");

		const odosConfig: McpConfig = {
			name: "Odos MCP Client",
			description: "Client for Odos DEX aggregator",
			debug: DEBUG,
			retryOptions: {
				maxRetries: 2,
				initialDelay: 200,
			},
			transport: {
				mode: "stdio",
				command: "pnpm",
				args: ["dlx", "@iqai/mcp-odos"],
				env: {
					ODOS_API_KEY: process.env.ODOS_API_KEY || "",
					WALLET_PRIVATE_KEY: walletPrivateKey,
					PATH: process.env.PATH || "",
				},
			},
		};

		odosToolset = new McpToolset(odosConfig);
		const odosTools = await odosToolset.getTools();
		console.log(
			`✅ Connected to Odos MCP (${odosTools.length} tools available)`,
		);

		// Log available tools for debugging
		if (DEBUG) {
			console.log("📋 Available Odos tools:");
			odosTools.forEach((tool) => {
				console.log(`   - ${tool.name}: ${tool.description}`);
			});
		}

		// Create the Simple Brain Vault Agent
		console.log("🤖 Initializing Simple Brain Vault Agent...");
		const brainVaultAgent = new SimpleBrainVaultAgent(fraxlendTools, odosTools);

		console.log("🚀 Starting Brain Vault rebalancing workflow...");
		console.log("==============================================");

		// Enable debug mode for LangGraph execution
		process.env.DEBUG = "true";

		console.log("📊 Starting workflow execution with debug logging enabled");

		// Execute the workflow
		const result = await brainVaultAgent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: `
						Execute a complete Brain Vault rebalancing for my wallet.

						INSTRUCTIONS:
						1. Collect my current Fraxlend portfolio data using the available tools
						2. Analyze yield opportunities across all available pairs
						3. Determine if rebalancing would improve yields by >1%
						4. If beneficial, EXECUTE REAL SWAPS via Odos to rebalance
						5. Provide a comprehensive final report with transaction details

						EXECUTION PARAMETERS:
						- Start with small amounts (10-20% of position) for safety
						- Use 2-3% slippage tolerance
						- Only rebalance if yield improvement > 1%
						- Consider gas costs in decision making

						IMPORTANT:
						- This will execute REAL transactions with your wallet
						- Each step must provide detailed output and reasoning
						- Do not provide empty or minimal responses
						- Report transaction hashes and gas costs

						START IMMEDIATELY - execute the full workflow including real swaps if beneficial.
					`,
				},
			],
		});

		console.log("\n🎯 Brain Vault Workflow Complete!");
		console.log("==================================");
		if (result.content) {
			console.log(`Final Result: ${result.content}`);
		} else {
			console.log("❌ Warning: Final result content is empty");
			console.log("Full result object:", JSON.stringify(result, null, 2));
		}
	} catch (error) {
		if (error instanceof McpError) {
			console.error(`❌ MCP Error (${error.type}): ${error.message}`);
			if (error.originalError) {
				console.error("   Original error:", error.originalError);
			}
		} else {
			console.error("❌ Unexpected error:", error);
		}
	} finally {
		// Cleanup
		console.log("\n🧹 Cleaning up MCP connections...");
		if (fraxlendToolset) {
			await fraxlendToolset
				.close()
				.catch((err) => console.error("Error closing Fraxlend toolset:", err));
		}
		if (odosToolset) {
			await odosToolset
				.close()
				.catch((err) => console.error("Error closing Odos toolset:", err));
		}
		console.log("✅ Cleanup complete");
	}
}

// Handle graceful shutdown
process.on("SIGINT", () => {
	console.log("\n🛑 Received SIGINT, shutting down gracefully...");
	process.exit(0);
});

main().catch((error) => {
	console.error("💥 Fatal error in main execution:", error);
	process.exit(1);
});
