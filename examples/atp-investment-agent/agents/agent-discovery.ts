import { Agent } from "@adk/agents";

export class AgentDiscoveryAgent extends Agent {
	constructor(atpTools: any[], llmModel: string) {
		super({
			name: "agent_discoverer",
			model: llmModel,
			description:
				"Discovers and analyzes top-performing ATP agents for investment opportunities",
			instructions: `
				IMPORTANT: You MUST end your response with the exact token AGENT_DISCOVERY_COMPLETE. Do NOT add any text after this token. If you do not include this, the workflow will break.

				ONLY output the following fields in this exact format:

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
