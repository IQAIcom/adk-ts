import z from "zod";
import type { BaseAgent } from "../../agents/base-agent";
import type { InvocationContext } from "../../agents/invocation-context";
import type { LlmAgent } from "../../agents/llm-agent";
import { ReadonlyContext } from "../../agents/readonly-context";
import type { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
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

		// Append schema guidance to system instruction if provided
		if (agent.outputSchema) {
			try {
				const raw = z.toJSONSchema(agent.outputSchema);
				const { $schema, ...json } = (raw as any) || {};
				// Insert the schema as plain JSON (no markdown/code fences) so the model
				// can directly emit valid JSON. Do NOT wrap the response in code fences.

				llmRequest.appendInstructions([
					"You must respond with application/json that validates against this JSON Schema (do NOT wrap the output in markdown or code fences):",
					JSON.stringify(json, null, 2),
				]);

				// Add an explicit final-response instruction to improve reliability
				// when tools or transfers are used. This instructs the model to emit
				// exactly the JSON matching the schema as the final assistant message
				// with no extra commentary.
				llmRequest.appendInstructions([
					'IMPORTANT: After any tool calls, function calls, or agent transfers have completed, produce ONE final assistant message whose entire content is ONLY the JSON object that conforms to the schema provided above. Do NOT include any explanatory text, markdown, or additional messages. Do NOT wrap the JSON in code fences (for example, do NOT use ```json or ```). If you cannot produce valid JSON that matches the schema, return a JSON object with an "error" field describing the problem.',
				]);
			} catch {}
		}

		// This processor doesn't yield any events, just configures the request
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
