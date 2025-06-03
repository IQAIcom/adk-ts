import { LLMRegistry, OpenAILLM, type MessageRole } from "@adk";
import { McpError, McpToolset } from "@adk/tools/mcp";
import type { McpConfig } from "@adk/tools/mcp/types";
import * as dotenv from "dotenv";
import { AtpInvestmentAgent } from "./atp-investment-agent";
import { WalletService } from "./services";
import * as cron from "node-cron";
import { env } from "./env";

dotenv.config();
LLMRegistry.registerLLM(OpenAILLM);

const DEBUG = env.DEBUG;

// Top-level toolset and agent variables
let atpToolset: McpToolset | null = null;
let telegramToolset: McpToolset | null = null;
let atpInvestmentAgent: AtpInvestmentAgent | null = null;
let walletInfo: any = null;

// previous run results
const runOutputs: string[] = [];
const MAX_RUN_OUTPUTS = 10;

async function setup() {
	console.log("🤖 Starting ATP Investment Agent Demo");
	console.log("====================================");
	console.log(
		`💰 Real investments will be made with your IQ tokens (${env.ATP_INVESTMENT_PERCENTAGE * 100}% of balance)`,
	);
	console.log("🔐 Using wallet private key from environment variables");
	console.log("====================================");

	// Check required environment variables
	const walletPrivateKey = env.WALLET_PRIVATE_KEY;
	const llmModel = env.LLM_MODEL;

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
					PATH: process.env.PATH || "",
					ATP_USE_DEV: env.ATP_USE_DEV,
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
			env.TELEGRAM_BOT_TOKEN &&
			env.TELEGRAM_CHAT_ID &&
			env.TELEGRAM_SERVER_KEY
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
							env.TELEGRAM_SERVER_KEY,
							"--profile",
							env.TELEGRAM_PROFILE_ID,
						],
						env: {
							TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
							TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
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
		const minInvestment = env.ATP_MIN_INVESTMENT;
		const investmentPercentage = env.ATP_INVESTMENT_PERCENTAGE;
		const walletService = new WalletService(
			walletPrivateKey,
			minInvestment,
			investmentPercentage,
		);
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
		if (runOutputs.length > 0) {
			contextMsg = `Previous run outputs (last ${runOutputs.length}):
			${runOutputs.map((log, i) => `${i + 1}. ${log}`).join("\n")}
			---
			`;
		}
		console.log("prev run outputs", runOutputs);
		const messages = [
			{
				role: "system" as MessageRole,
				content: contextMsg,
			},
			{
				role: "user" as MessageRole,
				content: `
						Wallet Information:
						- Address: ${walletInfo.address}
						- IQ Balance: ${walletInfo.iqBalance} IQ
						- Investment Budget: ${walletInfo.investmentAmount} IQ
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
			runOutputs.push(result.content);
			if (runOutputs.length > MAX_RUN_OUTPUTS) runOutputs.shift();
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
	const cronSchedule = env.ATP_CRON_SCHEDULE;
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
