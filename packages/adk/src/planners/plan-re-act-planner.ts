import type { Part } from "@google/genai";
import type { CallbackContext } from "../agents/callback-context";
import type { ReadonlyContext } from "../agents/readonly-context";
import type { LlmRequest } from "../models/llm-request";
import { BasePlanner } from "./base-planner";

// Planning tags used for structured responses
const PLANNING_TAG = "/*PLANNING*/";
const REPLANNING_TAG = "/*REPLANNING*/";
const REASONING_TAG = "/*REASONING*/";
const ACTION_TAG = "/*ACTION*/";
const FINAL_ANSWER_TAG = "/*FINAL_ANSWER*/";

/**
 * Plan-Re-Act planner that constrains the LLM response to generate a plan before any action/observation.
 *
 * Note: this planner does not require the model to support built-in thinking
 * features or setting the thinking config.
 */
export class PlanReActPlanner extends BasePlanner {
	/**
	 * Builds the planning instruction for the Plan-Re-Act planner
	 */
	buildPlanningInstruction(
		readonlyContext: ReadonlyContext,
		llmRequest: LlmRequest,
	): string {
		return this._buildNlPlannerInstruction();
	}

	/**
	 * Processes the LLM response for planning
	 */
	processPlanningResponse(
		callbackContext: CallbackContext,
		responseParts: Part[],
	): Part[] | undefined {
		if (!responseParts || responseParts.length === 0) {
			return undefined;
		}

		const preservedParts: Part[] = [];
		let firstFcPartIndex = -1;

		for (let i = 0; i < responseParts.length; i++) {
			// Stop at the first (group of) function calls
			if (responseParts[i].functionCall) {
				// Ignore and filter out function calls with empty names
				if (!responseParts[i].functionCall?.name) {
					continue;
				}
				preservedParts.push(responseParts[i]);
				firstFcPartIndex = i;
				break;
			}

			// Split the response into reasoning and final answer parts
			this._handleNonFunctionCallParts(responseParts[i], preservedParts);
		}

		if (firstFcPartIndex > 0) {
			let j = firstFcPartIndex + 1;
			while (j < responseParts.length) {
				if (responseParts[j].functionCall) {
					preservedParts.push(responseParts[j]);
					j++;
				} else {
					break;
				}
			}
		}

		return preservedParts;
	}

	/**
	 * Splits the text by the last occurrence of the separator
	 */
	private _splitByLastPattern(
		text: string,
		separator: string,
	): [string, string] {
		const index = text.lastIndexOf(separator);
		if (index === -1) {
			return [text, ""];
		}
		return [
			text.substring(0, index + separator.length),
			text.substring(index + separator.length),
		];
	}

	/**
	 * Handles non-function-call parts of the response
	 */
	private _handleNonFunctionCallParts(
		responsePart: Part,
		preservedParts: Part[],
	): void {
		if (responsePart.text?.includes(FINAL_ANSWER_TAG)) {
			const [reasoningText, finalAnswerText] = this._splitByLastPattern(
				responsePart.text,
				FINAL_ANSWER_TAG,
			);

			if (reasoningText) {
				const reasoningPart: Part = { text: reasoningText };
				this._markAsThought(reasoningPart);
				preservedParts.push(reasoningPart);
			}

			if (finalAnswerText) {
				preservedParts.push({
					text: finalAnswerText,
				});
			}
		} else {
			const responseText = responsePart.text || "";
			// If the part is a text part with a planning/reasoning/action tag,
			// label it as reasoning
			if (
				responseText &&
				(responseText.startsWith(PLANNING_TAG) ||
					responseText.startsWith(REASONING_TAG) ||
					responseText.startsWith(ACTION_TAG) ||
					responseText.startsWith(REPLANNING_TAG))
			) {
				this._markAsThought(responsePart);
			}
			preservedParts.push(responsePart);
		}
	}

	/**
	 * Marks the response part as thought
	 */
	private _markAsThought(responsePart: Part): void {
		if (responsePart.text) {
			responsePart.thought = true;
		}
	}

	/**
	 * Builds the NL planner instruction for the Plan-Re-Act planner
	 */
	private _buildNlPlannerInstruction(): string {
		const highLevelPreamble = `
When answering the question, try to leverage the available tools to gather the information instead of your memorized knowledge.

Follow this process when answering the question: (1) first come up with a plan in natural language text format; (2) Then use tools to execute the plan and provide reasoning between tool usage to make a summary of current state and next step. Tool usage and reasoning should be interleaved with each other. (3) In the end, return one final answer.

Follow this format when answering the question: (1) The planning part should be under ${PLANNING_TAG}. (2) The tool usage should be under ${ACTION_TAG}, and the reasoning parts should be under ${REASONING_TAG}. (3) The final answer part should be under ${FINAL_ANSWER_TAG}.
`;

		const planningPreamble = `
Below are the requirements for the planning:
The plan is made to answer the user query if following the plan. The plan is coherent and covers all aspects of information from user query, and only involves the tools that are accessible by the agent. The plan contains the decomposed steps as a numbered list where each step should use one or multiple available tools. By reading the plan, you can intuitively know which tools to trigger or what actions to take.
If the initial plan cannot be successfully executed, you should learn from previous execution results and revise your plan. The revised plan should be be under ${REPLANNING_TAG}. Then use tools to follow the new plan.
`;

		const reasoningPreamble = `
Below are the requirements for the reasoning:
The reasoning makes a summary of the current trajectory based on the user query and tool outputs. Based on the tool outputs and plan, the reasoning also comes up with instructions to the next steps, making the trajectory closer to the final answer.
`;

		const finalAnswerPreamble = `
Below are the requirements for the final answer:
The final answer should be precise and follow query formatting requirements. Some queries may not be answerable with the available tools and information. In those cases, inform the user why you cannot process their query and ask for more information.
`;

		// Language-agnostic tool usage requirements
		const toolUsagePreamble = `
Below are the requirements for tool usage:

**Available Tools:** The available tools are described in the context and can be directly used.
- You can only use tools and parameters that are explicitly defined in the function declarations.
- You cannot use any parameters, fields, or capabilities that are not documented in the tool specifications.
- Tool usage should be clear, efficient, and directly relevant to the user query and reasoning steps.
- When using tools, reference them by their exact function names as provided in the context.
- Do not attempt to use external libraries, services, or capabilities beyond the provided tools.
- If the available tools are insufficient to fully answer a query, clearly explain the limitations.
`;

		const userInputPreamble = `
VERY IMPORTANT instruction that you MUST follow in addition to the above instructions:

You should ask for clarification if you need more information to answer the question.
You should prefer using the information available in the context instead of repeated tool use.
`;

		return [
			highLevelPreamble,
			planningPreamble,
			reasoningPreamble,
			finalAnswerPreamble,
			toolUsagePreamble,
			userInputPreamble,
		].join("\n\n");
	}
}
