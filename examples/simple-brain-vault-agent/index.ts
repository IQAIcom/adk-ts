import {
	GoogleLLM,
	InvocationContext,
	LLMRegistry,
	ToolContext,
	type MessageRole,
} from "@adk";
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

		// Create the Simple Brain Vault Agent
		console.log("🤖 Initializing Simple Brain Vault Agent...");
		const brainVaultAgent = new SimpleBrainVaultAgent(fraxlendTools, odosTools);

		console.log("🚀 Starting Brain Vault rebalancing workflow...");
		console.log("==============================================");

		const invocationContext = new InvocationContext({
			userId: "123",
			appName: "brain-vault",
			sessionId: "123",
		});
		const toolContext = new ToolContext({
			invocationContext,
		});
		const fraxlendStats = await fraxlendTools.find(
			(tool) => tool.name === "FRAXLEND_GET_STATS",
		);
		if (!fraxlendStats) {
			throw new Error("FRAXLEND_GET_STATS tool not found");
		}

		const fraxlendStatsResult = await fraxlendStats.runAsync({}, toolContext);
		const fraxlendStatsData =
			typeof fraxlendStatsResult.content === "string"
				? fraxlendStatsResult
				: JSON.stringify(fraxlendStatsResult.content);
		const fraxlendPositions = await fraxlendTools.find(
			(tool) => tool.name === "FRAXLEND_GET_POSITIONS",
		);
		if (!fraxlendPositions) {
			throw new Error("FRAXLEND_GET_USER_POSITIONS tool not found");
		}
		const fraxlendPositionsResult = await fraxlendPositions.runAsync(
			{},
			toolContext,
		);
		const fraxlendPositionsData =
			typeof fraxlendPositionsResult.content === "string"
				? fraxlendPositionsResult
				: JSON.stringify(fraxlendPositionsResult.content);

		// Execute the workflow
		const result = await brainVaultAgent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: `
						Execute a complete Brain Vault rebalancing for my wallet.
						Here is my current fraxlend positions:
						${fraxlendPositionsData}
						Here are all the fraxlend pairs available:
						${fraxlendStatsData}
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
