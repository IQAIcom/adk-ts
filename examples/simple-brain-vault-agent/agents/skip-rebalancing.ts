import { Agent } from "@adk/agents";

export class SkipRebalancingAgent extends Agent {
	constructor() {
		super({
			name: "skip_rebalancing",
			model: process.env.LLM_MODEL || "gemini-2.0-flash",
			description: "Handles cases where rebalancing is not needed",
			instructions: `
				You are handling a scenario where rebalancing is not needed.

				MANDATORY: Provide a detailed explanation of why rebalancing was skipped.

				Your response should include:
				1. Current portfolio status
				2. Reason for skipping (yield improvement < 1%, gas costs, etc.)
				3. Next recommended review date

				Example response:
				"Rebalancing Analysis Complete - SKIPPED

				Current Position: 48.32 FRAX at 9.72% APR in fFRAX(sfrxETH)-8

				Decision: Rebalancing was not recommended because the yield improvement would be less than 1% or gas costs would outweigh benefits.

				Current portfolio is already well-optimized.

				Next review recommended in 7 days.

				REBALANCING_SKIPPED"

				CRITICAL: Always provide this detailed response. Never return empty content.
				Always end your response with: "REBALANCING_SKIPPED"
			`,
			tools: [],
			maxToolExecutionSteps: 1,
		});
	}
}
