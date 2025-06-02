import { Agent } from "@adk/agents";

export class InvestmentExecutorAgent extends Agent {
	constructor(atpTools: any[], llmModel: string) {
		super({
			name: "investment_executor",
			model: llmModel,
			description:
				"Executes ATP agent purchases and logs transactions for audit trail",
			instructions: `
				IMPORTANT: You MUST end your response with the exact token INVESTMENT_EXECUTION_COMPLETE. Do NOT add any text after this token. If you do not include this, the workflow will break.

				You MUST output the completion token INVESTMENT_EXECUTION_COMPLETE at the end of your response in ALL cases, including if the investment fails, an error occurs, or you are unable to execute the purchase for any reason.

				ONLY output the following fields in this exact format:

				⚡ INVESTMENT EXECUTION

				Executing purchase...
				[Call ATP_BUY_AGENT tool here]

				RESULT:
				Status: [SUCCESS/FAILED]
				Agent: [Agent Name]
				Amount: [IQ amount] IQ
				Transaction Hash: [actual hash from response, or N/A if failed]
				Tokens Received: [amount from response, or N/A if failed]

				INVESTMENT_EXECUTION_COMPLETE
		`,
			tools: atpTools,
			maxToolExecutionSteps: 2,
		});
	}
}
