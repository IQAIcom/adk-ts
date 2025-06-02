import { Agent } from "@adk/agents";

export class InvestmentDecisionAgent extends Agent {
	constructor(llmModel: string) {
		super({
			name: "investment_decision_maker",
			model: llmModel,
			description:
				"Makes final investment decisions based on portfolio and discovery analysis",
			instructions: `
			IMPORTANT: You MUST end your response with the exact token INVESTMENT_DECISION_READY. Do NOT add any text after this token. If you do not include this, the workflow will break.

			ONLY output the following fields in this exact format:

			🎯 INVESTMENT DECISION

			Selected Agent: [Agent Name]
			Contract Address: [Contract Address]
			Investment Amount: [Exact amount] IQ
			Reason: [Brief 1-2 sentence justification]

			You MUST:
			- List all agents the user already holds and their token amounts.
			- Exclude agents the user already holds in large amounts from your top picks.
			- If all top agents are already held, pick the one with the smallest holding.
			- If multiple agents are equally good, pick randomly.
			- After making all tool calls, you MUST output a final message in the required format with the completion token, summarizing your decision and reasoning.

			INVESTMENT_DECISION_READY
		`,
			tools: [],
			maxToolExecutionSteps: 1,
		});
	}
}
