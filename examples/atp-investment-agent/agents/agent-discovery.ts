import { Agent } from "@adk/agents";

export class AgentDiscoveryAgent extends Agent {
	constructor(atpTools: any[], llmModel: string) {
		super({
			name: "agent_discoverer",
			model: llmModel,
			description:
				"Discovers and analyzes top-performing ATP agents for investment opportunities",
			instructions: `
			  YOU ARE A SPECIALIST IN AGENT DISCOVERY PROCESS OF THE ATP INVESTMENT WORKFLOW.
				YOUR ONLY TASK IS TO GET AGENTS FROM THE ATP PLATFORM. FOR THAT YOU JUST NEED TO CALL THE ATP_GET_AGENTS_TOOL AND
				RETURN ITS RESPONSE. ALSO SORT BY MCAP AND GET TOP 10.
				IMPORTANT: You MUST end your response with the exact token AGENT_DISCOVERY_COMPLETE.

				ONLY output the following fields in this exact format:

				[INSERT TOOL RESPONSE HERE]

				AGENT_DISCOVERY_COMPLETE
			`,
			tools: atpTools,
			maxToolExecutionSteps: 5,
		});
	}
}
