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
						const matched = /portfolio_analysis_complete/i.test(content);
						console.log(
							"[Condition] portfolio_analysis: checking for PORTFOLIO_ANALYSIS_COMPLETE in:",
							content,
							"| result:",
							matched,
						);
						return matched;
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
						const matched = /portfolio_analysis_complete/i.test(content);
						console.log(
							"[Condition] agent_discovery: checking for PORTFOLIO_ANALYSIS_COMPLETE in:",
							content,
							"| result:",
							matched,
						);
						return matched;
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
						const matched = /agent_discovery_complete/i.test(content);
						console.log(
							"[Condition] investment_decision: checking for AGENT_DISCOVERY_COMPLETE in:",
							content,
							"| result:",
							matched,
						);
						return matched;
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
						const matched = /investment_decision_ready/i.test(content);
						console.log(
							"[Condition] investment_executor: checking for INVESTMENT_DECISION_READY in:",
							content,
							"| result:",
							matched,
						);
						return matched;
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
						const matched = /investment_execution_complete/i.test(content);
						console.log(
							"[Condition] telegram_notifier: checking for INVESTMENT_EXECUTION_COMPLETE in:",
							content,
							"| result:",
							matched,
						);
						return matched;
					},
				},
			],
			rootNode: "portfolio_analysis",
			maxSteps: 15,
		};

		super(config);
	}
}
