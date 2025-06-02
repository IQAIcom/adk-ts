import { Agent } from "@adk/agents";

export class PortfolioAnalysisAgent extends Agent {
	constructor(atpTools: any[], llmModel: string) {
		super({
			name: "portfolio_analyzer",
			model: llmModel,
			description:
				"Analyzes current ATP portfolio and IQ wallet balance for investment planning",
			instructions: `
				IMPORTANT: You MUST end your response with the exact token PORTFOLIO_ANALYSIS_COMPLETE. Do NOT add any text after this token. If you do not include this, the workflow will break.

				ONLY output the following fields in this exact format:

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