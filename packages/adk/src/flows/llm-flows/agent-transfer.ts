import type { InvocationContext } from "../../agents/invocation-context";
import type { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import { ToolContext } from "../../tools/tool-context";
import { TransferToAgentTool } from "../../tools/common/transfer-to-agent-tool";
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
	// eslint-disable-next-line @typescript-eslint/require-yield
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event> {
		const agent = invocationContext.agent;

		// Check if agent has LlmAgent-like structure
		if (!("subAgents" in agent) || typeof agent.subAgents !== "object") {
			return;
		}

		const transferTargets = getTransferTargets(agent as any);
		if (!transferTargets || transferTargets.length === 0) {
			return;
		}

		// Add transfer instructions to the LLM request
		const transferInstructions = buildTargetAgentsInstructions(
			agent as any,
			transferTargets,
		);

		if (llmRequest.appendInstructions) {
			llmRequest.appendInstructions([transferInstructions]);
		} else {
			// Fallback if appendInstructions doesn't exist
			const existingInstructions = (llmRequest as any).instructions || "";
			(llmRequest as any).instructions =
				`${existingInstructions}\n\n${transferInstructions}`;
		}

		// Add transfer_to_agent tool to the request
		const transferToAgentTool = new TransferToAgentTool();
		const toolContext = new ToolContext(invocationContext);

		// Type cast due to LlmRequest interface differences between modules
		await transferToAgentTool.processLlmRequest(toolContext, llmRequest as any);

		// This processor doesn't yield any events, just configures the request
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}
}

/**
 * Builds information string for a target agent
 */
function buildTargetAgentsInfo(targetAgent: any): string {
	return `
Agent name: ${targetAgent.name}
Agent description: ${targetAgent.description}
`;
}

/**
 * Builds transfer instructions for the LLM request
 */
function buildTargetAgentsInstructions(
	agent: any,
	targetAgents: any[],
): string {
	const lineBreak = "\n";
	const transferFunctionName = "transfer_to_agent";

	let instructions = `
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
		instructions += `
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
function getTransferTargets(agent: any): any[] {
	const result: any[] = [];

	// Add sub-agents
	if (agent.subAgents && Array.isArray(agent.subAgents)) {
		result.push(...agent.subAgents);
	}

	// If no parent agent, return just sub-agents
	if (!agent.parentAgent || !("subAgents" in agent.parentAgent)) {
		return result;
	}

	// Add parent agent if transfer to parent is allowed
	if (!agent.disallowTransferToParent) {
		result.push(agent.parentAgent);
	}

	// Add peer agents if transfer to peers is allowed
	if (!agent.disallowTransferToPeers && agent.parentAgent.subAgents) {
		const peerAgents = agent.parentAgent.subAgents.filter(
			(peerAgent: any) => peerAgent.name !== agent.name,
		);
		result.push(...peerAgents);
	}

	return result;
}

/**
 * Exported request processor instance for use in AutoFlow
 */
export const requestProcessor = new AgentTransferLlmRequestProcessor();
