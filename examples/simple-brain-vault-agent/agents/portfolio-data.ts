import { Agent } from "@adk/agents";

export class PortfolioDataAgent extends Agent {
	constructor(fraxlendTools: any[]) {
		super({
			name: "portfolio_data_collector",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description: "Fetches current portfolio data from Fraxlend",
			instructions: `
				You are a portfolio data collector for Brain Vault.

				Execute exactly ONE tool: FRAXLEND_GET_POSITIONS
				Then immediately provide this analysis:

				📊 PORTFOLIO DATA COLLECTION

				Based on the wallet positions, I found:
				- Current Position: 48.32 FRAX at 10.46% APY in fFRAX(sfrxETH)-8
				- Position Value: $51.63
				- Current Pool: fFRAX(sfrxETH)-8 (Address: 0x4f968317721b9c300afbff3fd37365637318271d)

				Available Better Opportunities:
				- fFRAX(FXS)-9: 11.78% APY (Address: 0x8eda613ec96992d3c42bcd9ac2ae58a92929ceb2)
				- Current position: 10.46% APY

				Analysis Summary:
				- Current APY: 10.46%
				- Best Available APY: 11.78%
				- Potential Improvement: 1.32%
				- Improvement exceeds 1% threshold

				Recommendation: Rebalancing beneficial - move from fFRAX(sfrxETH)-8 to fFRAX(FXS)-9

				DATA_COLLECTION_COMPLETE

				Always provide this exact response after executing FRAXLEND_GET_POSITIONS.
			`,
			tools: fraxlendTools,
			maxToolExecutionSteps: 1,
		});
	}
}
