import { GoogleLLM, LLMRegistry, type MessageRole } from "@adk";
import { McpError, McpToolset } from "@adk/tools/mcp";
import type { McpConfig } from "@adk/tools/mcp/types";
import * as dotenv from "dotenv";
import { AtpInvestmentAgent } from "./atp-investment-agent";
import { WalletService } from "./services";

dotenv.config();

LLMRegistry.registerLLM(GoogleLLM);

const DEBUG = process.env.DEBUG === "true" || true;

/**
 * Main demonstration function for ATP Investment Agent
 */
async function main() {
	let atpToolset: McpToolset | null = null;
	let telegramToolset: McpToolset | null = null;

	console.log("🤖 Starting ATP Investment Agent Demo");
	console.log("====================================");
	console.log(
		"💰 Real investments will be made with your IQ tokens (1% of balance)",
	);
	console.log("🔐 Using wallet private key from environment variables");
	console.log("====================================");

	// Check required environment variables
	const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;

	if (!walletPrivateKey) {
		console.error("❌ Error: WALLET_PRIVATE_KEY is required in .env file");
		console.log("Please add your wallet private key to the .env file.");
		process.exit(1);
	}

	try {
		// Initialize ATP MCP Toolset
		console.log("🔄 Connecting to ATP MCP server...");

		const atpConfig: McpConfig = {
			name: "ATP MCP Client",
			description: "Client for ATP agent investments",
			debug: DEBUG,
			retryOptions: {
				maxRetries: 2,
				initialDelay: 200,
			},
			transport: {
				mode: "stdio",
				command: "pnpm",
				args: ["dlx", "@iqai/mcp-atp"],
				env: {
					WALLET_PRIVATE_KEY: walletPrivateKey,
					ATP_USE_DEV: "true",
					PATH: process.env.PATH || "",
				},
			},
		};

		atpToolset = new McpToolset(atpConfig);
		const atpTools = await atpToolset.getTools();

		if (atpTools.length === 0) {
			console.warn("⚠️ No ATP tools retrieved from MCP server.");
			process.exit(1);
		}

		console.log(`✅ Connected to ATP MCP (${atpTools.length} tools available)`);
		if (DEBUG) {
			atpTools.forEach((tool) => {
				console.log(`   - ${tool.name}: ${tool.description}`);
			});
		}

		// Initialize Telegram MCP Toolset (optional)
		console.log("🔄 Connecting to Telegram MCP server...");

		let telegramTools: any[] = [];
		if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
			try {
				const telegramConfig: McpConfig = {
					name: "Telegram MCP Client",
					description: "Client for Telegram notifications",
					debug: DEBUG,
					retryOptions: {
						maxRetries: 2,
						initialDelay: 200,
					},
					transport: {
						mode: "stdio",
						command: "npx",
						args: [
							"-y",
							"@smithery/cli@latest",
							"run",
							"@NexusX-MCP/telegram-mcp-server",
							"--key",
							"52d326a9-d38f-4a28-8f72-d505351c0d94",
							"--profile",
							"initial-halibut-wgJ0Py",
						],
						env: {
							TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
							TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
							PATH: process.env.PATH || "",
						},
					},
				};

				telegramToolset = new McpToolset(telegramConfig);
				telegramTools = await telegramToolset.getTools();

				console.log(
					`✅ Connected to Telegram MCP (${telegramTools.length} tools available)`,
				);
			} catch (error) {
				console.log(
					"⚠️  Telegram MCP connection failed, continuing without notifications",
				);
				if (DEBUG) {
					console.log("   Telegram error:", error);
				}
			}
		} else {
			console.log(
				"⚠️  Telegram configuration not found, continuing without notifications",
			);
		}

		// Initialize wallet service and validate conditions
		const minInvestment = Number.parseFloat(
			process.env.ATP_MIN_INVESTMENT || "10",
		);
		const walletService = new WalletService(walletPrivateKey, minInvestment);

		const walletInfo = await walletService.displayWalletStatus();

		// Create the ATP Investment Agent
		console.log("🤖 Initializing ATP Investment Agent...");
		const atpInvestmentAgent = new AtpInvestmentAgent(atpTools, telegramTools);

		console.log("🚀 Starting ATP investment workflow...");
		console.log("==============================================");

		// Execute the workflow
		const result = await atpInvestmentAgent.run({
			messages: [
				{
					role: "user" as MessageRole,
					content: `
						Execute a complete ATP investment analysis and purchase workflow.

						Wallet Information:
						- Address: ${walletInfo.address}
						- IQ Balance: ${walletInfo.iqBalance} IQ
						- Investment Budget: ${walletInfo.investmentAmount} IQ (1% of balance)

						Task:
						1. Analyze my current ATP portfolio and holdings
						2. Discover top-performing ATP agents on the platform
						3. Select the best agent for investment based on performance and diversification
						4. Execute the purchase using exactly 1% of my IQ balance
						5. Send a comprehensive report to Telegram with transaction details

						Investment Strategy:
						- Focus on diversification and risk management
						- Prioritize agents with strong performance metrics
						- Avoid overconcentration in any single agent
						- Execute with real transactions
					`,
				},
			],
		});

		console.log("\n🎯 ATP Investment Workflow Complete!");
		console.log("====================================");
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
		if (atpToolset) {
			await atpToolset
				.close()
				.catch((err) => console.error("Error closing ATP toolset:", err));
		}
		if (telegramToolset) {
			await telegramToolset
				.close()
				.catch((err) => console.error("Error closing Telegram toolset:", err));
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
