import type { Event } from "../events/event";
import { BaseAgent } from "./base-agent";
import { InvocationContext } from "./invocation-context";

/**
 * Create isolated branch for every sub-agent.
 */
export function createBranchContextForSubAgent(
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
export async function* mergeAgentRun(
	agentRuns: AsyncGenerator<Event, void, unknown>[],
): AsyncGenerator<Event, void, unknown> {
	if (agentRuns.length === 0) {
		return;
	}

	// NOTE: Previous implementation incorrectly removed resolved promises using
	// the generator index as the array index. After the first resolution the
	// ordering diverges, causing the wrong promise to be removed and leading to
	// potential starvation / hangs. We instead track promises by generator index.

	const nextFor = (gen: AsyncGenerator<Event, void, unknown>, index: number) =>
		gen
			.next()
			.then((result) => ({ index, result }))
			.catch((error) => ({
				index,
				result: { done: true, value: undefined },
				error,
			}));

	// Active entries indexed by generator index
	const entries: Array<
		| {
				index: number;
				promise: Promise<{
					index: number;
					result: IteratorResult<Event, void>;
					error?: unknown;
				}>;
		  }
		| undefined
	> = agentRuns.map((gen, i) => ({ index: i, promise: nextFor(gen, i) }));

	const activePromises = () =>
		entries
			.filter((e): e is { index: number; promise: Promise<any> } => !!e)
			.map((e) => e.promise);

	while (true) {
		const currentActivePromises = activePromises();
		if (currentActivePromises.length === 0) {
			break;
		}
		const { index, result, error } = await Promise.race(currentActivePromises);

		if (error) {
			console.error(`Error in parallel agent ${index}:`, error);
			// Mark this generator as finished
			entries[index] = undefined;
			continue;
		}

		if (!result.done) {
			// Emit event
			yield result.value;
			// Queue next
			entries[index] = { index, promise: nextFor(agentRuns[index], index) };
		} else {
			// Finished
			entries[index] = undefined;
		}
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
