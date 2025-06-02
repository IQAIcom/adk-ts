import { Agent } from "@adk/agents";

export class InvestmentDecisionAgent extends Agent {
	constructor() {
		super({
			name: "investment_decision_maker",
			model: process.env.LLM_MODEL || "gemini-2.5-pro",
			description:
				"Makes final investment decisions based on portfolio and discovery analysis",
			instructions: `
				You make the final investment decision based on portfolio analysis and agent discovery.

				STEPS:
				1. Review portfolio analysis and agent discovery results
				2. Select the best agent considering diversification
				3. Confirm investment amount (exactly 1% of IQ balance)
				4. Make final decision

				DECISION CRITERIA:
				- Agent performance and potential
				- Portfolio diversification
				- Investment amount = exactly 1% of IQ balance
				- Avoid overconcentration in existing holdings

				RESPONSE FORMAT:
				🎯 INVESTMENT DECISION

				Selected Agent: [Agent Name]
				Contract Address: [Contract Address]
				Investment Amount: [Exact amount] IQ
				Reason: [Brief 1-2 sentence justification]

				INVESTMENT_DECISION_READY
			`,
			tools: [],
			maxToolExecutionSteps: 1,
		});
	}
}
