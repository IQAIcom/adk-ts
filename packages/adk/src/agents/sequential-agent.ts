import type { Event } from "../events/event";
import { BaseAgent } from "./base-agent";
import type { InvocationContext } from "./invocation-context";
import { LlmAgent } from "./llm-agent";

/**
 * Configuration for SequentialAgent
 */
export interface SequentialAgentConfig {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * Sub-agents to execute in sequence
	 */
	subAgents?: BaseAgent[];
}

/**
 * A shell agent that runs its sub-agents in sequence.
 */
export class SequentialAgent extends BaseAgent {
	/**
	 * Constructor for SequentialAgent
	 */
	constructor(config: SequentialAgentConfig) {
		super({
			name: config.name,
			description: config.description,
			subAgents: config.subAgents,
		});
	}

	/**
	 * Core logic to run this agent via text-based conversation
	 */
	protected async *runAsyncImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		for (const subAgent of this.subAgents) {
			for await (const event of subAgent.runAsync(ctx)) {
				yield event;
			}
		}
	}

	/**
	 * Core logic to run this agent via video/audio-based conversation
	 *
	 * Compared to the non-live case, live agents process a continuous stream of audio
	 * or video, so there is no way to tell if it's finished and should pass
	 * to the next agent or not. So we introduce a task_completed() function so the
	 * model can call this function to signal that it's finished the task and we
	 * can move on to the next agent.
	 */
	protected async *runLiveImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		// There is no way to know if it's using live during init phase so we have to init it here
		for (const subAgent of this.subAgents) {
			// add tool
			function taskCompleted(): string {
				/**
				 * Signals that the model has successfully completed the user's question
				 * or task.
				 */
				return "Task completion signaled.";
			}

			if (subAgent instanceof LlmAgent) {
				// Use function name to dedupe.
				const toolNames = subAgent.tools.map((tool) =>
					typeof tool === "function" ? tool.name : tool.name,
				);

				if (!toolNames.includes(taskCompleted.name)) {
					subAgent.tools.push(taskCompleted);
					subAgent.instruction += `If you finished the user's request
according to its description, call the ${taskCompleted.name} function
to exit so the next agents can take over. When calling this function,
do not generate any text other than the function call.`;
				}
			}
		}

		for (const subAgent of this.subAgents) {
			for await (const event of subAgent.runLive(ctx)) {
				yield event;
			}
		}
	}
}
