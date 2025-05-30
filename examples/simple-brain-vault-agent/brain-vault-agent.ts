import {
	LangGraphAgent,
	type LangGraphAgentConfig,
} from "@adk/agents/lang-graph-agent";
import {
	YieldAnalysisAgent,
	FraxlendExecutorAgent,
	QuoteFetcherAgent,
	SwapExecutorAgent,
	SkipRebalancingAgent,
	PortfolioReporterAgent,
} from "./agents";

const DEBUG = process.env.DEBUG === "true" || true;

export class SimpleBrainVaultAgent extends LangGraphAgent {
	constructor(fraxlendTools: any[], odosTools: any[]) {
		const config: LangGraphAgentConfig = {
			name: "simple_brain_vault_workflow",
			description:
				"Simplified Brain Vault rebalancing workflow with specialized agents",
			nodes: [
				{
					name: "yield_analysis",
					agent: new YieldAnalysisAgent(fraxlendTools),
					targets: ["quote_fetcher", "skip_rebalancing"],
				},
				{
					name: "quote_fetcher",
					agent: new QuoteFetcherAgent(odosTools),
					targets: ["swap_executor", "fraxlend_executor"],
					condition: (result) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);

						// Check if rebalancing was recommended
						const shouldExecute = content.includes("REBALANCING_RECOMMENDED");

						if (DEBUG) {
							console.log("[LangGraph] quote_fetcher condition check:");
							console.log(`  - Should execute: ${shouldExecute}`);
							console.log('  - Looking for: "REBALANCING_RECOMMENDED"');
							console.log(`  - Content preview: "${content.slice(0, 300)}..."`);
						}

						return shouldExecute;
					},
				},
				{
					name: "swap_executor",
					agent: new SwapExecutorAgent(odosTools),
					targets: ["fraxlend_executor"],
					condition: (result) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);

						// Execute swap only if quote fetcher recommends proceeding with swap
						const needsSwap = content.includes("PROCEED_WITH_SWAP");

						if (DEBUG) {
							console.log("[LangGraph] swap_executor condition check:");
							console.log(`  - Should execute: ${needsSwap}`);
							console.log('  - Looking for: "PROCEED_WITH_SWAP"');
							console.log(`  - Content preview: "${content.slice(0, 300)}..."`);
						}

						return needsSwap;
					},
				},
				{
					name: "fraxlend_executor",
					agent: new FraxlendExecutorAgent(fraxlendTools),
					targets: ["portfolio_report"],
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

						// Check if rebalancing was NOT recommended
						const shouldExecute = content.includes(
							"REBALANCING_NOT_RECOMMENDED",
						);

						if (DEBUG) {
							console.log("[LangGraph] skip_rebalancing condition check:");
							console.log(`  - Should execute: ${shouldExecute}`);
							console.log('  - Looking for: "REBALANCING_NOT_RECOMMENDED"');
							console.log(`  - Content preview: "${content.slice(0, 300)}..."`);
						}

						return shouldExecute;
					},
				},
				{
					name: "portfolio_report",
					agent: new PortfolioReporterAgent(),
				},
			],
			rootNode: "yield_analysis",
			maxSteps: 20,
		};

		super(config);
	}
}
