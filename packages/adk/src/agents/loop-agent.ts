import type { Event } from "../events/event";
import { BaseAgent } from "./base-agent";
import type { InvocationContext } from "./invocation-context";

/**
 * Configuration for LoopAgent
 */
export interface LoopAgentConfig {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * Sub-agents to execute in a loop
	 */
	subAgents?: BaseAgent[];

	/**
	 * The maximum number of iterations to run the loop agent.
	 * If not set, the loop agent will run indefinitely until a sub-agent escalates.
	 */
	maxIterations?: number;
}

/**
 * A shell agent that run its sub-agents in a loop.
 *
 * When sub-agent generates an event with escalate or max_iterations are
 * reached, the loop agent will stop.
 */
export class LoopAgent extends BaseAgent {
	/**
	 * The maximum number of iterations to run the loop agent.
	 * If not set, the loop agent will run indefinitely until a sub-agent escalates.
	 */
	public maxIterations?: number;

	/**
	 * Constructor for LoopAgent
	 */
	constructor(config: LoopAgentConfig) {
		super({
			name: config.name,
			description: config.description,
			subAgents: config.subAgents,
		});

		this.maxIterations = config.maxIterations;
	}

	/**
	 * Core logic to run this agent via text-based conversation
	 */
	protected async *runAsyncImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		let timesLooped = 0;

		while (!this.maxIterations || timesLooped < this.maxIterations) {
			for (const subAgent of this.subAgents) {
				for await (const event of subAgent.runAsync(ctx)) {
					yield event;
					if (event.actions?.escalate) {
						return;
					}
				}
			}
			timesLooped++;
		}
	}

	/**
	 * Core logic to run this agent via video/audio-based conversation
	 */
	protected async *runLiveImpl(
		_ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		throw new Error("This is not supported yet for LoopAgent.");
		// biome-ignore lint/correctness/useYield: AsyncGenerator requires having at least one yield statement
	}
}
