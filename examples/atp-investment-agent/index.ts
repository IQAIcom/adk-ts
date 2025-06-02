import {
	type BaseTool,
	InvocationContext,
	LLMRegistry,
	OpenAILLM,
	ToolContext,
	type MessageRole,
} from "@adk";
import { McpError, McpToolset } from "@adk/tools/mcp";
import type { McpConfig } from "@adk/tools/mcp/types";
import * as dotenv from "dotenv";
import { AtpInvestmentAgent } from "./atp-investment-agent";
import { WalletService } from "./services";
import * as cron from "node-cron";

dotenv.config();
LLMRegistry.registerLLM(OpenAILLM);

const DEBUG = process.env.DEBUG === "true" || true;

// Top-level toolset and agent variables
let atpToolset: McpToolset | null = null;
let telegramToolset: McpToolset | null = null;
let atpInvestmentAgent: AtpInvestmentAgent | null = null;
let walletInfo: any = null;

// In-memory transaction log (last 10 runs)
const transactionLogs: string[] = [];
const MAX_LOGS = 10;

async function setup() {
	console.log("🤖 Starting ATP Investment Agent Demo");
	console.log("====================================");
	console.log(
		"💰 Real investments will be made with your IQ tokens (1% of balance)",
	);
	console.log("🔐 Using wallet private key from environment variables");
	console.log("====================================");

	// Check required environment variables
	const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
	const llmModel = process.env.LLM_MODEL;

	if (!walletPrivateKey) {
		console.error("❌ Error: WALLET_PRIVATE_KEY is required in .env file");
		console.log("Please add your wallet private key to the .env file.");
		process.exit(1);
	}

	if (!llmModel) {
		console.error("❌ Error: LLM_MODEL is required in .env file");
		console.log(
			"Please set LLM_MODEL to a supported model (e.g., gemini-2.0-flash) in your .env file.",
		);
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
				command: "npx",
				args: ["-y", "@iqai/mcp-atp"],
				env: {
					ATP_WALLET_PRIVATE_KEY: walletPrivateKey,
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
		if (
			process.env.TELEGRAM_BOT_TOKEN &&
			process.env.TELEGRAM_CHAT_ID &&
			process.env.TELEGRAM_SERVER_KEY
		) {
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
							process.env.TELEGRAM_SERVER_KEY,
							"--profile",
							"initial-halibut-wgJ0Py", // different profile goes here
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
				const invocationContext = new InvocationContext({
					userId: "123",
					appName: "atp-agent",
					sessionId: "123",
				});
				const toolContext = new ToolContext({
					invocationContext,
				});
				const sendMessageTool: BaseTool = await telegramTools.find(
					(tool) => tool.name === "send_message",
				);
				if (!sendMessageTool) {
					throw new Error("send_message tool not found");
				}
				await sendMessageTool.runAsync(
					{
						chatId: process.env.TELEGRAM_CHAT_ID,
						text: "Hello, world!",
					},
					toolContext,
				);

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
		walletInfo = await walletService.displayWalletStatus();

		// Create the ATP Investment Agent
		console.log("🤖 Initializing ATP Investment Agent...");
		atpInvestmentAgent = new AtpInvestmentAgent(
			atpTools,
			telegramTools,
			llmModel,
		);
	} catch (error) {
		console.error("❌ Setup failed:", error);
		process.exit(1);
	}
}

async function runAgentCycle() {
	if (!atpInvestmentAgent || !walletInfo) {
		console.error("❌ Agent or wallet info not initialized. Did setup() fail?");
		return;
	}
	try {
		// Prepare context message with last N transaction logs
		let contextMsg = "";
		if (transactionLogs.length > 0) {
			contextMsg = `Previous Transactions (last ${transactionLogs.length}):
			${transactionLogs.map((log, i) => `${i + 1}. ${log}`).join("\n")}
			---
			`;
		}
		console.log("prev txns", transactionLogs);
		const messages = [
			{
				role: "system" as MessageRole,
				content: contextMsg,
			},
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
						- Avoid over concentration in any single agent
						- Execute with real transactions
						- Also try to avoid buying the same agent twice in a row
					`,
			},
		];

		console.log("🚀 Starting ATP investment workflow...");
		console.log("==============================================");
		const result = await atpInvestmentAgent.run({ messages });
		console.log("\n🎯 ATP Investment Workflow Complete!");
		console.log("====================================");
		if (result.content) {
			console.log(`Final Result: ${result.content}`);
			// Extract a summary for the log (first line or up to 200 chars)
			const summary =
				result.content
					.split("\n")
					.find((line) => line.trim())
					?.slice(0, 200) || result.content.slice(0, 200);
			transactionLogs.push(summary);
			if (transactionLogs.length > MAX_LOGS) transactionLogs.shift();
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
	}
}

async function cleanup() {
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

(async () => {
	await setup();
	const cronSchedule = process.env.ATP_CRON_SCHEDULE || "*/5 * * * *";
	const runMode = process.argv[2];

	if (runMode === "--once" || runMode === "-1") {
		console.log("🏃 Running agent once...");
		await runAgentCycle();
		await cleanup();
		process.exit(0);
	} else {
		console.log(`⏰ Scheduling agent to run: ${cronSchedule}`);
		cron.schedule(
			cronSchedule,
			async () => {
				await runAgentCycle();
				await cleanup();
			},
			{ timezone: "UTC" },
		);
		await runAgentCycle();
		process.stdin.resume();
	}
})();

process.on("SIGINT", async () => {
	console.log("\n🛑 Received SIGINT, shutting down gracefully...");
	await cleanup();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
	await cleanup();
	process.exit(0);
});
