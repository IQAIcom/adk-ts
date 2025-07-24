import type { Agent, BaseAgent } from "@adk/agents";
import dedent from "dedent";
import type { InvocationContext } from "../../agents/invocation-context";
import type { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import { TransferToAgentTool } from "../../tools/common/transfer-to-agent-tool";
import { ToolContext } from "../../tools/tool-context";
import { BaseLlmRequestProcessor } from "./base-llm-processor";

/**
 * Agent transfer request processor that enables agent transfer functionality
 * for AutoFlow by adding transfer instructions and tools to the LLM request
 */
class AgentTransferLlmRequestProcessor extends BaseLlmRequestProcessor {
	/**
	 * Processes agent transfer by adding transfer instructions and tools
	 * if the agent has transfer targets available
	 */
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const agent = invocationContext.agent as Agent;

		// Check if agent has LlmAgent-like structure
		if (!("subAgents" in agent) || typeof agent.subAgents !== "object") {
			return;
		}

		const transferTargets = getTransferTargets(agent);
		if (!transferTargets || transferTargets.length === 0) {
			return;
		}

		// Add transfer instructions to the LLM request
		const transferInstructions = buildTargetAgentsInstructions(
			agent,
			transferTargets,
		);

		llmRequest.appendInstructions([transferInstructions]);

		// Add transfer_to_agent tool to the request using TransferToAgentTool
		const transferToAgentTool = new TransferToAgentTool();
		const toolContext = new ToolContext(invocationContext);

		// Process the tool to add it to the LLM request
		await transferToAgentTool.processLlmRequest(toolContext, llmRequest);

		// This processor doesn't yield any events, but needs to satisfy AsyncGenerator
		// By having early returns, we ensure no events are yielded
		const shouldYield = false;
		if (shouldYield) {
			yield {} as Event;
		}
	}
}

/**
 * Builds information string for a target agent
 */
function buildTargetAgentsInfo(targetAgent: Agent): string {
	return dedent`
		Agent name: ${targetAgent.name}
		Agent description: ${targetAgent.description}
	`;
}

/**
 * Builds transfer instructions for the LLM request
 */
function buildTargetAgentsInstructions(
	agent: Agent,
	targetAgents: Agent[],
): string {
	const lineBreak = "\n";
	const transferFunctionName = "transfer_to_agent";

	let instructions = dedent`
		You have a list of other agents to transfer to:

		${targetAgents.map((targetAgent) => buildTargetAgentsInfo(targetAgent)).join(lineBreak)}

		If you are the best to answer the question according to your description, you
		can answer it.

		If another agent is better for answering the question according to its
		description, call \`${transferFunctionName}\` function to transfer the
		question to that agent. When transferring, do not generate any text other than
		the function call.
`;

	// Add parent agent transfer instructions if applicable
	if (agent.parentAgent && !agent.disallowTransferToParent) {
		instructions += dedent`
			Your parent agent is ${agent.parentAgent.name}. If neither the other agents nor
			you are best for answering the question according to the descriptions, transfer
			to your parent agent.
		`;
	}

	return instructions;
}

/**
 * Gets the list of agents this agent can transfer to
 * Includes sub-agents, parent agent, and peer agents based on permissions
 */
function getTransferTargets(agent: Agent): any[] {
	const targets: BaseAgent[] = [];

	// Add sub-agents
	if (agent.subAgents && Array.isArray(agent.subAgents)) {
		targets.push(...agent.subAgents);
	}

	// If no parent agent, return just sub-agents
	if (!agent.parentAgent || !("subAgents" in agent.parentAgent)) {
		return targets;
	}

	// Add parent agent if transfer to parent is allowed
	if (!agent.disallowTransferToParent) {
		targets.push(agent.parentAgent);
	}

	// Add peer agents if transfer to peers is allowed
	if (!agent.disallowTransferToPeers && agent.parentAgent.subAgents) {
		const peerAgents = agent.parentAgent.subAgents.filter(
			(peerAgent: any) => peerAgent.name !== agent.name,
		);
		targets.push(...peerAgents);
	}

	return targets;
}

/**
 * Exported request processor instance for use in AutoFlow
 */
export const requestProcessor = new AgentTransferLlmRequestProcessor();
