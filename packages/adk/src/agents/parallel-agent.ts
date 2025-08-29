import { Event } from "../events/event";
import { Logger } from "../logger";
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

	/**
	 * Output schema for validating the final response
	 */
	outputSchema?: import("zod").ZodSchema;
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
	 * Output schema for validating the final response
	 */
	outputSchema?: import("zod").ZodSchema;

	/**
	 * Logger for this agent
	 */
	private logger = new Logger({ name: "ParallelAgent" });

	/**
	 * Constructor for ParallelAgent
	 */
	constructor(config: ParallelAgentConfig) {
		super({
			name: config.name,
			description: config.description,
			subAgents: config.subAgents,
		});
		this.outputSchema = config.outputSchema;
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

		// Build a quick lookup for sub-agent by name to access outputKey when needed
		const nameToSubAgent: Record<string, BaseAgent> = {};
		for (const a of this.subAgents) {
			nameToSubAgent[a.name] = a;
		}

		const responses: string[] = [];
		const finalByName: Record<string, string> = {};
		let combinedResponse = "";
		let lastFinalResponseText = "";

		// Collect all events and responses from parallel agents
		for await (const event of mergeAgentRun(agentRuns)) {
			// Collect text content from the event
			if (event.content?.parts) {
				for (const part of event.content.parts) {
					if (part && typeof part === "object" && "text" in part && part.text) {
						const text = part.text;
						responses.push(text);
						combinedResponse += `${text} `;
					}
				}
			}

			// Track the last final response text from any sub-agent
			if (event.isFinalResponse() && event.content?.parts) {
				let text = "";
				for (const part of event.content.parts) {
					if (part && typeof part === "object" && "text" in part && part.text) {
						text += part.text;
					}
				}
				if (text.trim()) {
					lastFinalResponseText = text.trim();
					finalByName[event.author] = text.trim();

					// NEW: Ensure sub-agent final outputs are persisted to session state when outputKey is set
					const sub = nameToSubAgent[event.author];
					// Only handle LlmAgent-like instances that may have outputKey
					if (sub && "outputKey" in (sub as any)) {
						const ok = (sub as any).outputKey as string | undefined;
						if (ok) {
							// Attach state delta to this final event so Runner persists it
							if (!event.actions.stateDelta) {
								event.actions.stateDelta = {};
							}
							event.actions.stateDelta[ok] = text.trim();
						}
					}
				}
			}

			// Only yield the event AFTER any stateDelta has been attached
			yield event;
		}

		// Emit a final container event that consolidates any sub-agent outputs into session state
		try {
			const stateDelta: Record<string, any> = {};
			for (const sub of this.subAgents) {
				const maybe = sub as any;
				if (maybe && typeof maybe === "object" && "outputKey" in maybe) {
					const ok = maybe.outputKey as string | undefined;
					if (ok && finalByName[sub.name]) {
						stateDelta[ok] = finalByName[sub.name];
					}
				}
			}

			if (Object.keys(stateDelta).length > 0) {
				const consolidationEvent = new Event({
					invocationId: ctx.invocationId,
					author: this.name,
					branch: ctx.branch,
					content: { parts: [{ text: "" }] },
				});
				consolidationEvent.actions.stateDelta = stateDelta;
				yield consolidationEvent;
			}
		} catch (e) {
			this.logger.debug(
				`ParallelAgent ${this.name}: consolidation event failed: ${e instanceof Error ? e.message : String(e)}`,
			);
		}

		// If we have an output schema, validate the combined response
		if (this.outputSchema && (responses.length > 0 || lastFinalResponseText)) {
			try {
				let parsed: any;
				const candidate = lastFinalResponseText || combinedResponse.trim();
				// Prefer parsing the last final response text as JSON
				try {
					parsed = this.outputSchema.parse(JSON.parse(candidate));
				} catch {
					// Fallback to validating the raw string
					parsed = this.outputSchema.parse(candidate);
				}

				this.logger.debug(
					`Output schema validation successful for agent ${this.name}`,
				);

				// Yield a final event with the validated response
				const finalEvent = new Event({
					invocationId: ctx.invocationId,
					author: this.name,
					branch: ctx.branch,
					content: {
						parts: [
							{
								text:
									typeof parsed === "string" ? parsed : JSON.stringify(parsed),
							},
						],
					},
				});
				yield finalEvent;
			} catch (validationError) {
				this.logger.warn(
					`Output schema validation failed for agent ${this.name}: ${validationError}`,
				);
				// Still yield the original combined response if validation fails
				const finalEvent = new Event({
					invocationId: ctx.invocationId,
					author: this.name,
					branch: ctx.branch,
					content: {
						parts: [
							{ text: (lastFinalResponseText || combinedResponse).trim() },
						],
					},
				});
				yield finalEvent;
			}
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
