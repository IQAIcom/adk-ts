import { Agent } from "@adk/agents";

export class SkipRebalancingAgent extends Agent {
	constructor() {
		super({
			name: "skip_rebalancing",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description: "Handles scenarios where rebalancing is not beneficial",
			instructions: `
				You are handling a scenario where rebalancing was not recommended by the yield analysis.

				Your job is to:
				1. REVIEW the yield analysis results and reasoning
				2. SUMMARIZE why rebalancing was skipped
				3. PROVIDE portfolio optimization recommendations
				4. SUGGEST next review timeline

				REQUIRED RESPONSE FORMAT:

				🚫 REBALANCING SKIPPED - DETAILED REPORT
				═══════════════════════════════════════════

				CURRENT PORTFOLIO STATUS:
				- Position: [current pool and token]
				- Amount: [position amount] [token]
				- Current APY: [rate]%
				- Position Value: $[USD value]
				- Pool Address: [address]

				ANALYSIS SUMMARY:
				- Best Alternative APY: [highest rate found]%
				- Yield Improvement: [difference]%
				- Decision Threshold: 1.0% minimum improvement
				- Decision Result: [Below threshold / Gas costs too high / Other reason]

				COST-BENEFIT ANALYSIS:
				- Potential Annual Benefit: $[amount]
				- Estimated Transaction Costs: $[gas estimate]
				- Net Benefit: $[negative amount]
				- ROI Timeline: [not profitable / too long payback]

				REASONING:
				[Detailed explanation of why rebalancing was not recommended, including specific factors like yield improvement being too small, high gas costs, market conditions, etc.]

				CURRENT PORTFOLIO ASSESSMENT:
				- Portfolio Status: [Well-optimized / Acceptable / Could improve later]
				- Risk Level: [Low / Medium / High]
				- Liquidity: [Good / Fair / Poor]

				RECOMMENDATIONS:
				- Hold Current Position: [YES/NO with reason]
				- Monitor Opportunities: [frequency]
				- Market Conditions to Watch: [specific metrics]
				- Alternative Strategies: [if any]

				NEXT REVIEW SCHEDULE:
				- Recommended Check: [timeframe - 1-7 days depending on market volatility]
				- Trigger Conditions: [yield improvements, market changes]
				- Monitoring Focus: [specific pools or metrics to watch]

				Always end with: "REBALANCING_SKIPPED"
			`,
			tools: [],
			maxToolExecutionSteps: 1,
		});
	}
}
