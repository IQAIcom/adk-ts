import type { Event } from "../events/event";
import { BaseAgent } from "./base-agent";
import { InvocationContext } from "./invocation-context";

/**
 * Create isolated branch for every sub-agent.
 */
function createBranchContextForSubAgent(
	agent: BaseAgent,
	subAgent: BaseAgent,
	invocationContext: InvocationContext,
): InvocationContext {
	const branchSuffix = `${agent.name}.${subAgent.name}`;
	const branch = invocationContext.branch
		? `${invocationContext.branch}.${branchSuffix}`
		: branchSuffix;

	return new InvocationContext({
		artifactService: invocationContext.artifactService,
		sessionService: invocationContext.sessionService,
		memoryService: invocationContext.memoryService,
		invocationId: invocationContext.invocationId,
		branch: branch,
		agent: subAgent,
		userContent: invocationContext.userContent,
		session: invocationContext.session,
		endInvocation: invocationContext.endInvocation,
		liveRequestQueue: invocationContext.liveRequestQueue,
		activeStreamingTools: invocationContext.activeStreamingTools,
		transcriptionCache: invocationContext.transcriptionCache,
		runConfig: invocationContext.runConfig,
	});
}

/**
 * Merges the agent run event generator.
 *
 * This implementation guarantees for each agent, it won't move on until the
 * generated event is processed by upstream runner.
 */
async function* mergeAgentRun(
	agentRuns: AsyncGenerator<Event, void, unknown>[],
): AsyncGenerator<Event, void, unknown> {
	if (agentRuns.length === 0) {
		return;
	}

	// Create initial promises for each generator
	const promises = agentRuns.map(async (generator, index) => {
		try {
			const result = await generator.next();
			return { index, result };
		} catch (error) {
			return { index, result: { done: true, value: undefined }, error };
		}
	});

	let pendingPromises = [...promises];

	while (pendingPromises.length > 0) {
		// Wait for the first generator to produce an event
		const { index, result, error } = await Promise.race(pendingPromises);

		// Remove the completed promise
		pendingPromises = pendingPromises.filter((_, i) => i !== index);

		if (error) {
			console.error(`Error in parallel agent ${index}:`, error);
			continue;
		}

		if (!result.done) {
			// Yield the event
			yield result.value;

			// Create a new promise for the next event from this generator
			const nextPromise = (async () => {
				try {
					const nextResult = await agentRuns[index].next();
					return { index, result: nextResult };
				} catch (nextError) {
					return {
						index,
						result: { done: true, value: undefined },
						error: nextError,
					};
				}
			})();

			pendingPromises.push(nextPromise);
		}
		// If result.done is true, this generator is finished and we don't add it back
	}
}

/**
 * Configuration for ParallelAgent
 */
export interface ParallelAgentConfig {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * Sub-agents to execute in parallel
	 */
	subAgents?: BaseAgent[];
}

/**
 * A shell agent that run its sub-agents in parallel in isolated manner.
 *
 * This approach is beneficial for scenarios requiring multiple perspectives or
 * attempts on a single task, such as:
 *
 * - Running different algorithms simultaneously.
 * - Generating multiple responses for review by a subsequent evaluation agent.
 */
export class ParallelAgent extends BaseAgent {
	/**
	 * Constructor for ParallelAgent
	 */
	constructor(config: ParallelAgentConfig) {
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
		const agentRuns = this.subAgents.map((subAgent) =>
			subAgent.runAsync(createBranchContextForSubAgent(this, subAgent, ctx)),
		);

		for await (const event of mergeAgentRun(agentRuns)) {
			yield event;
		}
	}

	/**
	 * Core logic to run this agent via video/audio-based conversation
	 */
	protected async *runLiveImpl(
		_ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		throw new Error("This is not supported yet for ParallelAgent.");
		// biome-ignore lint/correctness/useYield: AsyncGenerator requires having at least one yield statement
	}
}
