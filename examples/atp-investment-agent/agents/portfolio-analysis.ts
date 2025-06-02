import { Agent } from "@adk/agents";

export class PortfolioAnalysisAgent extends Agent {
	constructor(atpTools: any[]) {
		super({
			name: "portfolio_analyzer",
			model: process.env.LLM_MODEL || "gemini-2.5-pro",
			description:
				"Analyzes current ATP portfolio and IQ wallet balance for investment planning",
			instructions: `
				You analyze the current ATP portfolio and wallet balance.

				DEBUG: Check available tools first and report them.

				STEPS:
				1. Call ATP_GET_AGENT_POSITIONS to get current holdings
				2. Report wallet balance and calculate 1% investment amount
				3. Provide simple portfolio summary

				RESPONSE FORMAT:
				📊 PORTFOLIO ANALYSIS

				Wallet Balance: [from context] IQ
				Investment Amount: [1% of balance] IQ
				Current Holdings: [list from ATP_GET_AGENT_POSITIONS]

				PORTFOLIO_ANALYSIS_COMPLETE
			`,
			tools: atpTools,
			maxToolExecutionSteps: 3,
		});
	}
}