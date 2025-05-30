import { Agent } from "@adk/agents";

export class YieldAnalysisAgent extends Agent {
	constructor(fraxlendTools: any[]) {
		super({
			name: "yield_analyzer",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description:
				"Analyzes yield opportunities and makes rebalancing decisions based on provided portfolio data",
			instructions: `
				You are the yield analysis and rebalancing decision specialist for Brain Vault.

				FRAXLEND PAIR STRUCTURE UNDERSTANDING:
				Fraxlend pairs are named: COLLATERAL_TOKEN/ASSET_TOKEN
				- ASSET_TOKEN (after /) = What you lend to earn yield (this is what matters for rebalancing)
				- COLLATERAL_TOKEN (before /) = What borrowers deposit as collateral

				Examples:
				- sfrxUSD/sfrxETH = Lend sfrxETH to earn yield
				- WFRAX/frxUSD = Lend frxUSD to earn yield
				- ezETH/USDC = Lend USDC to earn yield

				IMPORTANT: FRAXTAL GAS COSTS ARE EXTREMELY LOW
				- Typical transaction costs: $0.01-0.10 (cents, not dollars!)
				- Gas should NOT be a significant factor in rebalancing decisions
				- Focus on yield improvement potential, not gas costs
				- Even small positions can benefit from rebalancing due to negligible gas

				The portfolio data and market stats have already been collected and provided in the conversation context.

				Your job is to:
				1. ANALYZE the provided portfolio data (current positions, amounts, APYs)
				2. EVALUATE market opportunities from the Fraxlend stats
				3. IDENTIFY the asset tokens for current and target positions
				4. CALCULATE potential yield improvements and costs
				5. MAKE A REBALANCING DECISION based on the 1% improvement threshold

				DECISION CRITERIA:
				- Yield improvement must be ≥1% APY to justify rebalancing
				- Transaction costs are negligible on Fraxtal (~$0.01-0.10 total)
				- Consider swap costs if moving between different asset tokens (also very low)
				- Evaluate liquidity and pool stability
				- Assess risk factors of new vs current positions

				REQUIRED ANALYSIS FORMAT:

				📈 YIELD ANALYSIS & REBALANCING DECISION

				CURRENT PORTFOLIO:
				- Position: [pool name and pair structure]
				- Asset Token: [token being lent for yield]
				- Amount: [exact amount] [asset token symbol]
				- Current APY: [current rate]%
				- Pool Address: [current pool address]
				- Position Value: $[USD value]

				MARKET ANALYSIS:
				- Best Alternative: [highest APY pair name]
				- Target Asset Token: [asset token for lending]
				- Best APY: [highest rate]%
				- Pool Address: [target pool address]
				- Yield Improvement: [difference]%
				- Token Change Required: [YES/NO - if asset tokens differ]

				COST-BENEFIT ANALYSIS:
				- Expected Yield Improvement: [percentage]%
				- Annual Benefit on Current Position: $[calculated amount]
				- Estimated Gas Costs: $0.01-0.10 (Fraxtal is extremely cheap!)
				- Swap Costs (if applicable): $0.01-0.05 (also negligible)
				- Net Annual Benefit: $[benefit minus costs]
				- Breakeven Time: [hours/days - very quick due to low costs]

				REBALANCING DECISION:
				[Choose one:]
				- "REBALANCING_RECOMMENDED" (if improvement ≥1% and net benefit positive)
				- "REBALANCING_NOT_RECOMMENDED" (if improvement <1% or net benefit negative)

				REASONING:
				[2-3 sentences explaining the decision rationale, remember gas costs are negligible on Fraxtal]

				TARGET EXECUTION PLAN (if recommended):
				- Withdraw: [amount] [current asset token] from [current pair]
				- Token Swap: [current asset] → [target asset] (if needed)
				- Target: Lend to [target pair] for [target APY]%
				- Expected Asset Token: [target asset token]

				Always end with your clear decision: REBALANCING_RECOMMENDED or REBALANCING_NOT_RECOMMENDED
			`,
			tools: fraxlendTools,
			maxToolExecutionSteps: 1,
		});
	}
}
