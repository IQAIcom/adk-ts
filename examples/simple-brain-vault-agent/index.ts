import { Agent, GoogleLLM, LLMRegistry, type MessageRole } from "@adk";
import { McpError, McpToolset } from "@adk/tools/mcp";
import type { McpConfig } from "@adk/tools/mcp/types";
import { LangGraphAgent } from "@adk/agents/lang-graph-agent";
import type { LangGraphAgentConfig } from "@adk/agents/lang-graph-agent";
import * as dotenv from "dotenv";

dotenv.config();

LLMRegistry.registerLLM(GoogleLLM);

const DEBUG = process.env.DEBUG === "true" || true;

/**
 * Simple Portfolio Data Fetcher Agent
 */
class PortfolioDataAgent extends Agent {
	constructor(fraxlendTools: any[]) {
		super({
			name: "portfolio_data_collector",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description: "Fetches current portfolio data from Fraxlend",
			instructions: `
				You are a portfolio data collector for Brain Vault.

				Your job:
				1. Use FRAXLEND_GET_STATS tool to get current APY rates for available pairs
				2. Use other available Fraxlend tools to get portfolio positions
				3. Collect comprehensive data for yield analysis
				4. Return structured data summary

				IMPORTANT:
				- Execute the tools immediately, don't ask for permission
				- Use the actual tool names available to you
				- Provide specific data about yields and positions
				- Be thorough in data collection

				Always end your response with: "DATA_COLLECTION_COMPLETE"
			`,
			tools: fraxlendTools,
			maxToolExecutionSteps: 5,
		});
	}
}

/**
 * Yield Analysis Agent
 */
class YieldAnalysisAgent extends Agent {
	constructor() {
		super({
			name: "yield_analyzer",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description:
				"Analyzes yield opportunities and calculates potential improvements",
			instructions: `
				You are a yield analysis expert for Brain Vault.

				Based on the portfolio data collected, make a rebalancing decision.

				IMPORTANT: You MUST provide a detailed response with analysis.
				Empty or minimal responses are not acceptable.

				Your response format:
				1. Provide brief analysis of the data
				2. State your decision
				3. End with the exact trigger phrase

				Rebalancing Criteria:
				- Recommend rebalancing if yield improvement > 1%
				- Consider gas costs in your analysis
				- For this demo, if improvement is close to 1%, recommend rebalancing

				CRITICAL: Your response MUST end with exactly this phrase:
				"REBALANCING_RECOMMENDED"

				Example response:
				"Based on the portfolio data, I found opportunities for yield optimization. The current allocation can be improved through rebalancing.

				REBALANCING_RECOMMENDED"
			`,
			tools: [],
			maxToolExecutionSteps: 3,
		});
	}
}

/**
 * Rebalancing Executor Agent
 */
class RebalancingExecutorAgent extends Agent {
	constructor(odosTools: any[]) {
		super({
			name: "rebalancing_executor",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description: "Plans theoretical rebalancing transactions using Odos",
			instructions: `
				You are a rebalancing planner for Brain Vault.

				Your job:
				1. Based on the analysis from previous agents, plan optimal swaps
				2. Describe how you would use Odos tools to find best swap routes
				3. Outline the theoretical steps for executing the swaps
				4. Provide a detailed implementation plan

				IMPORTANT: This is a THEORETICAL exercise only. DO NOT actually execute any swaps.
				Instead, explain in detail:
				- Which tools you would use (ODOS_GET_QUOTE, ODOS_SWAP, etc.)
				- What parameters you would pass to each tool
				- How you would validate and verify the operations
				- What safety checks you would implement

				For example:
				"To rebalance from Pool A to Pool B, I would:
				1. First use ODOS_GET_QUOTE to check rates for swapping X tokens
				2. Validate the quote has acceptable slippage (<2%)
				3. Then use ODOS_SWAP with parameters {...}
				4. Finally, verify the transaction succeeded by..."

				Always end your response with: "REBALANCING_PLAN_COMPLETE"
			`,
			tools: odosTools,
			maxToolExecutionSteps: 8,
		});
	}
}

/**
 * Skip Rebalancing Agent
 */
class SkipRebalancingAgent extends Agent {
	constructor() {
		super({
			name: "skip_rebalancing",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description: "Handles cases where rebalancing is not needed",
			instructions: `
				You are handling a scenario where rebalancing is not needed.

				Your job:
				1. Summarize why rebalancing was skipped
				2. Provide current portfolio status
				3. Suggest next review date

				Explain that rebalancing was not recommended because:
				- The yield improvement was less than 1%, or
				- Gas costs would outweigh the benefits, or
				- Current positions are already optimized

				End your response with: "REBALANCING_SKIPPED"
			`,
			tools: [],
			maxToolExecutionSteps: 1,
		});
	}
}

/**
 * Portfolio Reporter Agent
 */
class PortfolioReporterAgent extends Agent {
	constructor() {
		super({
			name: "portfolio_reporter",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description: "Provides final portfolio status and summary",
			instructions: `
				You are a portfolio reporter for Brain Vault.

				Your job:
				1. Summarize the entire rebalancing analysis session
				2. Report current portfolio state
				3. Calculate theoretical performance metrics
				4. Provide recommendations for next steps

				Create a comprehensive report including:
				- What actions were analyzed (rebalancing plan or skipped)
				- Current portfolio allocation
				- Theoretical yield improvements (if any)
				- Next recommended review date

				IMPORTANT: This is a THEORETICAL analysis only. No actual swaps were executed.
				Focus on the analysis and planning aspects of the workflow.

				If a rebalancing plan was created:
				- Summarize the planned steps
				- Calculate the theoretical yield improvement
				- Estimate the potential ROI considering gas costs

				If rebalancing was skipped:
				- Explain why (less than 1% improvement, etc.)
				- Suggest conditions that would make rebalancing worthwhile

				IMPORTANT: Always provide a detailed summary even if previous steps had minimal output.
				If you don't have specific data, provide a general status report based on whatever information is available.

				CRITICAL: You MUST provide a non-empty response with meaningful content.
				Empty or minimal responses are not acceptable.

				End your response with: "PORTFOLIO_REPORT_COMPLETE"
			`,
			tools: [],
			maxToolExecutionSteps: 2,
		});
	}
}

/**
 * Simple Brain Vault LangGraph Agent
 */
class SimpleBrainVaultAgent extends LangGraphAgent {
	constructor(fraxlendTools: any[], odosTools: any[]) {
		const config: LangGraphAgentConfig = {
			name: "simple_brain_vault_workflow",
			description: "Simplified Brain Vault rebalancing workflow",
			nodes: [
				{
					name: "portfolio_data",
					agent: new PortfolioDataAgent(fraxlendTools),
					targets: ["yield_analysis"],
				},
				{
					name: "yield_analysis",
					agent: new YieldAnalysisAgent(),
					targets: ["rebalancing_execution", "skip_rebalancing"],
				},
				{
					name: "rebalancing_execution",
					agent: new RebalancingExecutorAgent(odosTools),
					targets: ["portfolio_report"],
					condition: (result) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);

						// Debug: Log the content we're checking
						if (DEBUG) {
							console.log("[DEBUG] Checking rebalancing_execution condition");
							console.log(`[DEBUG] Content type: ${typeof result.content}`);
							console.log(`[DEBUG] Content: ${content.slice(0, 200)}...`);
						}

						const shouldExecute = content.includes("REBALANCING_RECOMMENDED");

						if (DEBUG) {
							console.log(
								`[Condition] rebalancing_execution - Should execute: ${shouldExecute}`,
							);
						}

						return shouldExecute;
					},
				},
				{
					name: "skip_rebalancing",
					agent: new SkipRebalancingAgent(),
					targets: ["portfolio_report"],
					condition: (result) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);

						// Debug: Log the content we're checking
						if (DEBUG) {
							console.log("[DEBUG] Checking skip_rebalancing condition");
							console.log(`[DEBUG] Content type: ${typeof result.content}`);
							console.log(`[DEBUG] Content: ${content.slice(0, 200)}...`);
						}

						// If rebalancing wasn't recommended, we should skip
						const shouldExecute = !content.includes("REBALANCING_RECOMMENDED");

						if (DEBUG) {
							console.log(
								`[Condition] skip_rebalancing - Should execute: ${shouldExecute}`,
							);
						}

						return shouldExecute;
					},
				},
				{
					name: "portfolio_report",
					agent: new PortfolioReporterAgent(),
					condition: (result) => {
						// Check if we're coming from rebalancing_execution
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);

						// For portfolio_report, we always want to execute, but we'll check
						// if we're coming from rebalancing_execution for logging purposes
						const fromRebalancing = content.includes(
							"REBALANCING_PLAN_COMPLETE",
						);

						if (DEBUG) {
							console.log(
								`[Condition] portfolio_report - Coming from rebalancing: ${fromRebalancing}`,
							);
						}

						// Always execute this node
						return true;
					},
				},
			],
			rootNode: "portfolio_data",
			maxSteps: 10,
		};

		super(config);
	}
}

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
						Execute a complete Brain Vault rebalancing analysis for my wallet.

						INSTRUCTIONS:
						1. Immediately collect my current Fraxlend portfolio data using the available tools
						2. Analyze yield opportunities across all available pairs
						3. Determine if rebalancing would improve yields by >1%
						4. If beneficial, execute the rebalancing via Odos
						5. Provide a comprehensive final report

						Goals:
						- Maximize yield while maintaining reasonable risk
						- Only rebalance if improvement > 1%
						- Consider gas costs in decision making

						IMPORTANT: Each step must provide detailed output and reasoning.
						Do not provide empty or minimal responses.

						START IMMEDIATELY - do not ask for permission, just execute the workflow.
					`,
				},
			],
			// Set any config parameters here if needed in the future
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
