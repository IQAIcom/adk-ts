import type { BaseAgent } from "../../agents/base-agent";
import { LlmAgent } from "../../agents/llm-agent";

/**
 * Recursively creates an empty state for all state variables
 * referenced in agent instructions
 *
 * @param agent The agent to process
 * @param allState Object to collect the state variables in
 */
function _createEmptyState(
	agent: BaseAgent,
	allState: Record<string, any>,
): void {
	// Process sub-agents first
	for (const subAgent of agent.subAgents) {
		_createEmptyState(subAgent, allState);
	}

	// If this is an LLM agent with an instruction that has variables, add them to the state
	if (
		agent instanceof LlmAgent &&
		agent.instruction &&
		typeof agent.instruction === "string"
	) {
		// Find all variables in the format {variableName}
		const matches = agent.instruction.match(/{([\w]+)}/g) || [];

		for (const match of matches) {
			// Extract the variable name without the braces
			const key = match.substring(1, match.length - 1);
			allState[key] = "";
		}
	}
}

/**
 * Creates empty strings for all non-initialized state variables
 * referenced in agent instructions
 *
 * @param agent The root agent to process
 * @param initializedStates Optional object with already initialized states
 * @returns An object with empty strings for all non-initialized state variables
 */
export function createEmptyState(
	agent: BaseAgent,
	initializedStates: Record<string, any> = {},
): Record<string, any> {
	const nonInitializedStates: Record<string, any> = {};

	// Find all state variables in the agent hierarchy
	_createEmptyState(agent, nonInitializedStates);

	// Remove any variables that are already initialized
	for (const key in initializedStates) {
		if (key in nonInitializedStates) {
			delete nonInitializedStates[key];
		}
	}

	return nonInitializedStates;
}
