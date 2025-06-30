import type { InvocationContext } from "../../agents/invocation-context";
import type { LlmAgent } from "../../agents/llm-agent";
import type { BaseAgent } from "../../agents/base-agent";
import type { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import { ReadonlyContext } from "../../agents/readonly-context";
import { injectSessionState } from "../../utils/instructions-utils";
import { BaseLlmRequestProcessor } from "./base-llm-processor";

/**
 * Instructions LLM request processor that handles instructions and global instructions.
 * This processor adds both global instructions (from root agent) and agent-specific instructions.
 */
class InstructionsLlmRequestProcessor extends BaseLlmRequestProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event, void, unknown> {
		const agent = invocationContext.agent;

		// Only process LlmAgent instances
		if (!this.isLlmAgent(agent)) {
			return;
		}

		const rootAgent: BaseAgent = agent.rootAgent;

		// Append global instructions if set
		if (this.isLlmAgent(rootAgent) && rootAgent.globalInstruction) {
			const [rawInstruction, bypassStateInjection] =
				await rootAgent.canonicalGlobalInstruction(
					new ReadonlyContext(invocationContext),
				);

			let instruction = rawInstruction;
			if (!bypassStateInjection) {
				instruction = await injectSessionState(
					rawInstruction,
					new ReadonlyContext(invocationContext),
				);
			}

			llmRequest.appendInstructions([instruction]);
		}

		// Append agent instructions if set
		if (agent.instruction) {
			const [rawInstruction, bypassStateInjection] =
				await agent.canonicalInstruction(
					new ReadonlyContext(invocationContext),
				);

			let instruction = rawInstruction;
			if (!bypassStateInjection) {
				instruction = await injectSessionState(
					rawInstruction,
					new ReadonlyContext(invocationContext),
				);
			}

			llmRequest.appendInstructions([instruction]);
		}

		// This processor doesn't yield any events, just configures the request
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}

	/**
	 * Type guard to check if agent is an LlmAgent
	 */
	private isLlmAgent(agent: any): agent is LlmAgent {
		return agent && typeof agent === "object" && "canonicalModel" in agent;
	}
}

/**
 * Exported instance of the instructions request processor
 */
export const requestProcessor = new InstructionsLlmRequestProcessor();
