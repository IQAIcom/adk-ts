import { Agent } from "@adk/agents";

export class InvestmentExecutorAgent extends Agent {
	constructor(atpTools: any[], llmModel: string) {
		super({
			name: "investment_executor",
			model: llmModel,
			description:
				"Executes ATP agent purchases and logs transactions for audit trail",
			instructions: `
				YOU ARE A SPECIALIST IN INVESTMENT EXECUTION PROCESS OF THE ATP INVESTMENT WORKFLOW.
				YOUR ONLY TASK IS TO EXECUTE THE INVESTMENT DECISION. FOR THAT YOU JUST NEED TO CALL THE ATP_BUY_AGENT TOOL AND
				RETURN ITS RESPONSE.
				THE AGENT TOKEN ADDRESS, THE AMOUNT WILL BE PROVIDED TO YOU IN THE CONTEXT.
				IMPORTANT: You MUST end your response with the exact token INVESTMENT_EXECUTION_COMPLETE.
				IMPORTANT: DO NOT USE FAKE TXN HASHES. AFTER CALLING THE ATP_BUY_AGENT TOOL, YOU WILL BE PROVIDED WITH THE ACTUAL TXN HASH.

				ONLY output the following fields in this exact format:

				⚡ INVESTMENT EXECUTION

				[INSERT TOOL RESPONSE HERE]

				RESULT:
				Status: [SUCCESS/FAILED]
				Agent: [Agent Name]
				Amount: [IQ amount] IQ
				Transaction Hash: [actual hash from response, or N/A if failed]

				INVESTMENT_EXECUTION_COMPLETE
		`,
			tools: atpTools,
			maxToolExecutionSteps: 2,
		});
	}
}
