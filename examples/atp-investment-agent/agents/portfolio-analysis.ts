import { Agent } from "@adk/agents";

export class PortfolioAnalysisAgent extends Agent {
	constructor(atpTools: any[], llmModel: string) {
		super({
			name: "portfolio_analyzer",
			model: llmModel,
			description:
				"Analyzes current ATP portfolio and IQ wallet balance for investment planning",
			instructions: `
			 YOU ARE A SPECIALIST IN PORTFOLIO ANALYSIS PROCESS OF THE ATP INVESTMENT WORKFLOW.
				YOUR ONLY TASK IS TO ANALYZE THE PORTFOLIO AND RETURN THE ANALYSIS. FOR THAT YOU JUST NEED TO CALL THE ATP_GET_AGENT_POSITIONS TOOL AND
				RETURN ITS RESPONSE.
				IMPORTANT: You MUST end your response with the exact token PORTFOLIO_ANALYSIS_COMPLETE.

				ONLY output the following fields in this exact format:

				📊 PORTFOLIO ANALYSIS

				Wallet Balance: [from context] IQ
				Investment Amount: [from context] IQ
				Current Holdings: [tool response here]

				PORTFOLIO_ANALYSIS_COMPLETE
			`,
			tools: atpTools,
			maxToolExecutionSteps: 3,
		});
	}
}