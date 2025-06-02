import {
	LangGraphAgent,
	type LangGraphAgentConfig,
} from "@adk/agents/lang-graph-agent";
import {
	PortfolioAnalysisAgent,
	AgentDiscoveryAgent,
	InvestmentDecisionAgent,
	InvestmentExecutorAgent,
	TelegramNotifierAgent,
} from "./agents";

export class AtpInvestmentAgent extends LangGraphAgent {
	constructor(atpTools: any[], telegramTools: any[], llmModel: string) {
		const config: LangGraphAgentConfig = {
			name: "atp_investment_workflow",
			description:
				"Autonomous ATP agent investment workflow with discovery, analysis, and execution",
			nodes: [
				{
					name: "portfolio_analysis",
					agent: new PortfolioAnalysisAgent(atpTools, llmModel),
					targets: ["agent_discovery"],
					condition: (result, _context) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);
						return /portfolio_analysis_complete/i.test(content);
					},
				},
				{
					name: "agent_discovery",
					agent: new AgentDiscoveryAgent(atpTools, llmModel),
					targets: ["investment_decision"],
					condition: (result, _context) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);
						return /agent_discovery_complete/i.test(content);
					},
				},
				{
					name: "investment_decision",
					agent: new InvestmentDecisionAgent(llmModel),
					targets: ["investment_executor"],
					condition: (result, _context) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);
						return /investment_decision_ready/i.test(content);
					},
				},
				{
					name: "investment_executor",
					agent: new InvestmentExecutorAgent(atpTools, llmModel),
					targets: ["telegram_notifier"],
					condition: (result, _context) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);
						return /investment_execution_complete/i.test(content);
					},
				},
				{
					name: "telegram_notifier",
					agent: new TelegramNotifierAgent(telegramTools, llmModel),
					targets: [],
					condition: (result, _context) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);
						return /telegram_notification_complete/i.test(content);
					},
				},
			],
			rootNode: "portfolio_analysis",
			maxSteps: 15,
		};

		super(config);
	}
}
