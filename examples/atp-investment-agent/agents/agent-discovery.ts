import { Agent } from "@adk/agents";

export class AgentDiscoveryAgent extends Agent {
	constructor(atpTools: any[]) {
		super({
			name: "agent_discoverer",
			model: process.env.LLM_MODEL || "gemini-2.5-pro",
			description:
				"Discovers and analyzes top-performing ATP agents for investment opportunities",
			instructions: `
				You discover top-performing ATP agents for investment.

				STEPS:
				1. Use ATP_AGENT_STATS to fetch statistics for multiple agents
				2. Analyze performance metrics and trends
				3. Rank agents by performance
				4. Select top 3 candidates

				RESPONSE FORMAT:
				🔍 AGENT DISCOVERY

				Top 3 Agents:
				1. [Agent Name] - [Contract Address] - [Key metrics]
				2. [Agent Name] - [Contract Address] - [Key metrics]
				3. [Agent Name] - [Contract Address] - [Key metrics]

				Recommended: [Top choice with brief reason]

				AGENT_DISCOVERY_COMPLETE
			`,
			tools: atpTools,
			maxToolExecutionSteps: 5,
		});
	}
}
