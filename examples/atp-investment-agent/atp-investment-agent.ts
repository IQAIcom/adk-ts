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

const DEBUG = process.env.DEBUG === "true" || true;

export class AtpInvestmentAgent extends LangGraphAgent {
	constructor(atpTools: any[], telegramTools: any[]) {
		const config: LangGraphAgentConfig = {
			name: "atp_investment_workflow",
			description:
				"Autonomous ATP agent investment workflow with discovery, analysis, and execution",
			nodes: [
				{
					name: "portfolio_analysis",
					agent: new PortfolioAnalysisAgent(atpTools),
					targets: ["agent_discovery"],
				},
				{
					name: "agent_discovery",
					agent: new AgentDiscoveryAgent(atpTools),
					targets: ["investment_decision"],
					condition: (result) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);

						// Proceed if portfolio analysis completed successfully
						const hasPortfolioComplete = content.includes(
							"PORTFOLIO_ANALYSIS_COMPLETE",
						);
						const hasAgentComplete = content.includes(
							"AGENT_DISCOVERY_COMPLETE",
						);
						const shouldExecute = hasPortfolioComplete || hasAgentComplete;

						if (DEBUG) {
							console.log("[LangGraph] agent_discovery condition check:");
							console.log(`  - Should execute: ${shouldExecute}`);
							console.log(
								`  - Has PORTFOLIO_ANALYSIS_COMPLETE: ${hasPortfolioComplete}`,
							);
							console.log(
								`  - Has AGENT_DISCOVERY_COMPLETE: ${hasAgentComplete}`,
							);
							console.log(`  - Content preview: "${content.slice(0, 300)}..."`);
						}

						return shouldExecute;
					},
				},
				{
					name: "investment_decision",
					agent: new InvestmentDecisionAgent(),
					targets: ["investment_execution"],
					condition: (result) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);

						// Proceed if agent discovery completed successfully
						const shouldExecute = content.includes("AGENT_DISCOVERY_COMPLETE");

						if (DEBUG) {
							console.log("[LangGraph] investment_decision condition check:");
							console.log(`  - Should execute: ${shouldExecute}`);
							console.log('  - Looking for: "AGENT_DISCOVERY_COMPLETE"');
							console.log(`  - Content preview: "${content.slice(0, 300)}..."`);
						}

						return shouldExecute;
					},
				},
				{
					name: "investment_execution",
					agent: new InvestmentExecutorAgent(atpTools),
					targets: ["telegram_notification"],
					condition: (result) => {
						const content =
							typeof result.content === "string"
								? result.content
								: JSON.stringify(result.content);

						// Proceed if investment decision is ready
						const shouldExecute = content.includes("INVESTMENT_DECISION_READY");

						if (DEBUG) {
							console.log("[LangGraph] investment_execution condition check:");
							console.log(`  - Should execute: ${shouldExecute}`);
							console.log('  - Looking for: "INVESTMENT_DECISION_READY"');
							console.log(`  - Content preview: "${content.slice(0, 300)}..."`);
						}

						return shouldExecute;
					},
				},
				{
					name: "telegram_notification",
					agent: new TelegramNotifierAgent(telegramTools),
				},
			],
			rootNode: "portfolio_analysis",
			maxSteps: 15,
		};

		super(config);
	}
}
