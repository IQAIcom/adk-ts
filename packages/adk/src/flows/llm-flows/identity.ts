import type { InvocationContext } from "../../agents/invocation-context";
import type { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import { BaseLlmRequestProcessor } from "./base-llm-processor";

/**
 * Identity LLM request processor that gives the agent identity from the framework.
 * This processor adds the agent's name and description to the system instructions.
 */
class IdentityLlmRequestProcessor extends BaseLlmRequestProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event, void, unknown> {
		const agent = invocationContext.agent;

		// Build system instructions for agent identity
		const instructions: string[] = [
			`You are an agent. Your internal name is "${agent.name}".`,
		];

		if (agent.description) {
			instructions.push(` The description about you is "${agent.description}"`);
		}

		// Append identity instructions to the request
		llmRequest.appendInstructions(instructions);

		// This processor doesn't yield any events, just configures the request
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}
}

/**
 * Exported instance of the identity request processor
 */
export const requestProcessor = new IdentityLlmRequestProcessor();
