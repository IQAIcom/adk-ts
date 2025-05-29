import { Agent } from "@adk/agents";

export class QuoteFetcherAgent extends Agent {
	constructor(odosTools: any[]) {
		super({
			name: "quote_fetcher",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description: "Gets swap quotes from Odos",
			instructions: `
				You are the quote fetcher for Brain Vault rebalancing.

				Your job:
				1. ANALYZE the conversation history to extract the rebalancing recommendation
				2. IDENTIFY the exact tokens and amounts to quote from the yield analysis
				3. EXECUTE the ODOS_GET_QUOTE tool with the ACTUAL parameters

				CRITICAL INSTRUCTIONS:
				- DO NOT use hardcoded values
				- Parse the previous conversation to find the recommended rebalancing details
				- Look for the yield analysis that specifies which position to move and where
				- Use the actual token addresses and amounts from the portfolio data

				EXECUTION STEPS:
				1. Review the conversation history for:
				   - Current portfolio positions and token addresses (from portfolio_data step)
				   - Yield analysis recommendations and target opportunities (from yield_analysis step)
				   - Current position amounts and target pool details

				2. Extract quote parameters:
				   - chain: Use "fraxtal" (chainId: 252) for Fraxlend operations
				   - fromToken: Current position token address that needs rebalancing
				   - toToken: Target optimal yield token address
				   - amount: Calculate appropriate amount (10-20% of current position for safety)

				3. Execute ODOS_GET_QUOTE immediately with the extracted parameters

				QUOTE STRATEGY:
				- Start with 10-20% of current position size for safety
				- Focus on the highest yield improvement opportunity identified
				- Ensure sufficient liquidity exists for the swap

				Execute the tool immediately once you've determined the correct parameters.
				Always end your response with: "QUOTE_FETCH_COMPLETE"
			`,
			tools: odosTools,
			maxToolExecutionSteps: 3,
		});
	}
}
