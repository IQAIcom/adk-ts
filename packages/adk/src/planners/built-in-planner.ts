import type { Part } from "@google/genai";
import type { CallbackContext } from "../agents/callback-context";
import type { ReadonlyContext } from "../agents/readonly-context";
import type { LlmRequest } from "../models/llm-request";
import type { ThinkingConfig } from "../models/thinking-config";
import { BasePlanner } from "./base-planner";

/**
 * The built-in planner that uses model's built-in thinking features.
 */
export class BuiltInPlanner extends BasePlanner {
	/**
	 * Config for model built-in thinking features. An error will be returned if this
	 * field is set for models that don't support thinking.
	 */
	thinkingConfig: ThinkingConfig;

	/**
	 * Initializes the built-in planner.
	 *
	 * @param options Configuration options
	 */
	constructor(options: { thinkingConfig: ThinkingConfig }) {
		super();
		this.thinkingConfig = options.thinkingConfig;
	}

	/**
	 * Applies the thinking config to the LLM request.
	 *
	 * @param llmRequest The LLM request to apply the thinking config to
	 */
	applyThinkingConfig(llmRequest: LlmRequest): void {
		if (this.thinkingConfig) {
			// Initialize config if it doesn't exist
			llmRequest.config = llmRequest.config || {};

			// Apply thinking config - this would need to be adapted based on
			// how thinking config is actually implemented in the LLM request
			(llmRequest.config as any).thinkingConfig = this.thinkingConfig;
		}
	}

	/**
	 * Builds the planning instruction (returns undefined for built-in planner)
	 */
	buildPlanningInstruction(
		readonlyContext: ReadonlyContext,
		llmRequest: LlmRequest,
	): string | undefined {
		// Built-in planner doesn't provide custom instructions
		// It relies on the model's built-in thinking capabilities
		return undefined;
	}

	/**
	 * Processes the planning response (returns undefined for built-in planner)
	 */
	processPlanningResponse(
		callbackContext: CallbackContext,
		responseParts: Part[],
	): Part[] | undefined {
		// Built-in planner doesn't process the response
		// It relies on the model's built-in thinking capabilities
		return undefined;
	}
}
