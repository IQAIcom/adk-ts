import { CallbackContext } from "../../agents/callback-context";
import type { InvocationContext } from "../../agents/invocation-context";
import { ReadonlyContext } from "../../agents/readonly-context";
import { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import type { LlmResponse } from "../../models/llm-response";
import type { BasePlanner } from "../../planners/base-planner";
import { BuiltInPlanner } from "../../planners/built-in-planner";
import { PlanReActPlanner } from "../../planners/plan-re-act-planner";
import {
	BaseLlmRequestProcessor,
	BaseLlmResponseProcessor,
} from "./base-llm-processor";

/**
 * Request processor for Natural Language Planning
 * Applies planning instructions and configurations to LLM requests
 */
class NlPlanningRequestProcessor extends BaseLlmRequestProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const planner = getPlanner(invocationContext);
		if (!planner) {
			return;
		}

		// Apply thinking config for built-in planners
		if (planner instanceof BuiltInPlanner) {
			planner.applyThinkingConfig(llmRequest);
		}

		// Build and append planning instructions
		const planningInstruction = planner.buildPlanningInstruction(
			new ReadonlyContext(invocationContext),
			llmRequest,
		);
		if (planningInstruction) {
			if (llmRequest.appendInstructions) {
				llmRequest.appendInstructions([planningInstruction]);
			} else {
				// Fallback for LlmRequest implementations without appendInstructions
				const existingInstructions = (llmRequest as any).instructions || "";
				(llmRequest as any).instructions =
					`${existingInstructions}\n\n${planningInstruction}`;
			}
		}

		// Remove thought content from request
		removeThoughtFromRequest(llmRequest);

		// This processor doesn't yield any events, just configures the request
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}
}

/**
 * Response processor for Natural Language Planning
 * Processes LLM responses to handle planning content and state updates
 */
class NlPlanningResponseProcessor extends BaseLlmResponseProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
	): AsyncGenerator<Event> {
		// Check if response has content to process
		if (
			!llmResponse ||
			!llmResponse.content ||
			!llmResponse.content.parts ||
			llmResponse.content.parts.length === 0
		) {
			return;
		}

		const planner = getPlanner(invocationContext);
		if (!planner) {
			return;
		}

		// Process the LLM response through the planner
		const callbackContext = new CallbackContext(invocationContext);
		const processedParts = planner.processPlanningResponse(
			callbackContext,
			llmResponse.content.parts,
		);

		// Update response parts if processing returned new parts
		if (processedParts) {
			llmResponse.content.parts = processedParts;
		}

		// Generate state update event if callback context has changes
		if (callbackContext.state.hasDelta()) {
			const stateUpdateEvent = new Event({
				id: Event.newId(),
				invocationId: invocationContext.invocationId,
				author: invocationContext.agent.name,
				branch: invocationContext.branch,
				actions: callbackContext._eventActions,
			});
			yield stateUpdateEvent;
		}
	}
}

/**
 * Gets the planner from the invocation context agent
 * Returns null if no planner is available or agent doesn't support planning
 */
function getPlanner(invocationContext: InvocationContext): BasePlanner | null {
	const agent = invocationContext.agent;

	// Check if agent has planner property (duck typing)
	if (!("planner" in agent) || !agent.planner) {
		return null;
	}

	// If planner is already a BasePlanner instance, return it
	if (
		typeof agent.planner === "object" &&
		"buildPlanningInstruction" in agent.planner &&
		"processPlanningResponse" in agent.planner
	) {
		return agent.planner as BasePlanner;
	}

	// Default fallback to PlanReActPlanner
	return new PlanReActPlanner();
}

/**
 * Removes thought content from LLM request parts
 * This ensures thought content doesn't get sent to the model
 */
function removeThoughtFromRequest(llmRequest: LlmRequest): void {
	if (!llmRequest.contents) {
		return;
	}

	for (const content of llmRequest.contents) {
		if (!content.parts) {
			continue;
		}
		for (const part of content.parts) {
			// Remove thought property from parts
			if ("thought" in part) {
				part.thought = undefined;
			}
		}
	}
}

/**
 * Exported request processor instance for use in flow configurations
 */
export const requestProcessor = new NlPlanningRequestProcessor();

/**
 * Exported response processor instance for use in flow configurations
 */
export const responseProcessor = new NlPlanningResponseProcessor();
