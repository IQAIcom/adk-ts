import { Agent } from "@adk/agents";

export class InvestmentDecisionAgent extends Agent {
	constructor(llmModel: string) {
		super({
			name: "investment_decision_maker",
			model: llmModel,
			description:
				"Makes final investment decisions based on portfolio and discovery analysis",
			instructions: `
			YOU ARE A SPECIALIST IN INVESTMENT DECISION MAKING PROCESS OF THE ATP INVESTMENT WORKFLOW.
			YOUR ONLY TASK IS TO MAKE A FINAL INVESTMENT DECISION BASED ON THE PORTFOLIO ANALYSIS AND AGENT DISCOVERY.
			THIS DATA WILL BE PROVIDED TO YOU IN THE CONTEXT.
			IMPORTANT: You MUST end your response with the exact token INVESTMENT_DECISION_READY.
			IMPORTANT: You will be provided with responses from previous runs. these contain successful transactions and failed ones as well.
			try to avoid buying the same agent twice in a row. And also try to avoid buying the same agent that failed in previous runs.
			Try to diversify your investment.
			ONLY output the following fields in this exact format:

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
