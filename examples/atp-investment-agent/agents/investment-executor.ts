import { Agent } from "@adk/agents";

export class InvestmentExecutorAgent extends Agent {
	constructor(atpTools: any[]) {
		super({
			name: "investment_executor",
			model: process.env.LLM_MODEL || "gemini-2.5-pro",
			description:
				"Executes ATP agent purchases and logs transactions for audit trail",
			instructions: `
				You execute the ATP agent purchase using the investment decision.

				STEPS:
				1. Review the investment decision details
				2. Execute ATP_BUY_AGENT with exact parameters
				3. Report transaction results

				ATP_BUY_AGENT PARAMETERS:
				- tokenContract: [contract address from decision]
				- amount: [exact IQ amount from decision]

				RESPONSE FORMAT:
				⚡ INVESTMENT EXECUTION

				Executing purchase...
				[Call ATP_BUY_AGENT tool here]

				RESULT:
				Status: [SUCCESS/FAILED]
				Agent: [Agent Name]
				Amount: [IQ amount] IQ
				Transaction Hash: [actual hash from response]
				Tokens Received: [amount from response]

				INVESTMENT_EXECUTION_COMPLETE
			`,
			tools: atpTools,
			maxToolExecutionSteps: 2,
		});
	}
}
