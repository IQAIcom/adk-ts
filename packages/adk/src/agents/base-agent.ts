import type { Content } from "@google/genai";
import { Event } from "../events/event";
import { telemetryService } from "../telemetry";
import { CallbackContext } from "./callback-context";
import type { InvocationContext } from "./invocation-context";

/**
 * Single agent callback type
 */
export type SingleAgentCallback = (
	callbackContext: CallbackContext,
) => Promise<Content | undefined> | Content | undefined;

/**
 * Before agent callback type
 */
export type BeforeAgentCallback = SingleAgentCallback | SingleAgentCallback[];

/**
 * After agent callback type
 */
export type AfterAgentCallback = SingleAgentCallback | SingleAgentCallback[];

/**
 * Base class for all agents in Agent Development Kit.
 */
export abstract class BaseAgent {
	/**
	 * The agent's name.
	 * Agent name must be a valid identifier and unique within the agent tree.
	 * Agent name cannot be "user", since it's reserved for end-user's input.
	 */
	name: string;

	/**
	 * Description about the agent's capability.
	 * The model uses this to determine whether to delegate control to the agent.
	 * One-line description is enough and preferred.
	 */
	description = "";

	/**
	 * The parent agent of this agent.
	 * Note that an agent can ONLY be added as sub-agent once.
	 * If you want to add one agent twice as sub-agent, consider to create two agent
	 * instances with identical config, but with different name and add them to the
	 * agent tree.
	 */
	parentAgent?: BaseAgent;

	/**
	 * The sub-agents of this agent.
	 */
	subAgents: BaseAgent[] = [];

	/**
	 * Callback or list of callbacks to be invoked before the agent run.
	 * When a list of callbacks is provided, the callbacks will be called in the
	 * order they are listed until a callback does not return undefined.
	 *
	 * Args:
	 *   callbackContext: The callback context.
	 *
	 * Returns:
	 *   Content | undefined: The content to return to the user.
	 *     When the content is present, the agent run will be skipped and the
	 *     provided content will be returned to user.
	 */
	beforeAgentCallback?: BeforeAgentCallback;

	/**
	 * Callback or list of callbacks to be invoked after the agent run.
	 * When a list of callbacks is provided, the callbacks will be called in the
	 * order they are listed until a callback does not return undefined.
	 *
	 * Args:
	 *   callbackContext: The callback context.
	 *
	 * Returns:
	 *   Content | undefined: The content to return to the user.
	 *     When the content is present, the provided content will be used as agent
	 *     response and appended to event history as agent response.
	 */
	afterAgentCallback?: AfterAgentCallback;

	/**
	 * Constructor for BaseAgent
	 */
	constructor(config: {
		name: string;
		description?: string;
		subAgents?: BaseAgent[];
		beforeAgentCallback?: BeforeAgentCallback;
		afterAgentCallback?: AfterAgentCallback;
	}) {
		this.name = config.name;
		this.description = config.description || "";
		this.subAgents = config.subAgents || [];
		this.beforeAgentCallback = config.beforeAgentCallback;
		this.afterAgentCallback = config.afterAgentCallback;

		// Validate agent name
		this.validateName(this.name);

		// Set parent agent for sub-agents
		this.setParentAgentForSubAgents();
	}

	/**
	 * Entry method to run an agent via text-based conversation.
	 */
	async *runAsync(
		parentContext: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		yield* telemetryService.traceAsyncGenerator(
			`agent_run [${this.name}]`,
			this.runAsyncInternal(parentContext),
		);
	}

	/**
	 * Entry method to run an agent via video/audio-based conversation.
	 */
	async *runLive(
		parentContext: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		yield* telemetryService.traceAsyncGenerator(
			`agent_run_live [${this.name}]`,
			this.runLiveInternal(parentContext),
		);
	}

	/**
	 * Internal implementation for runAsync
	 */
	private async *runAsyncInternal(
		parentContext: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		const ctx = this.createInvocationContext(parentContext);

		const beforeEvent = await this.handleBeforeAgentCallback(ctx);
		if (beforeEvent) {
			yield beforeEvent;
		}

		if (ctx.endInvocation) {
			return;
		}

		for await (const event of this.runAsyncImpl(ctx)) {
			yield event;
		}

		if (ctx.endInvocation) {
			return;
		}

		const afterEvent = await this.handleAfterAgentCallback(ctx);
		if (afterEvent) {
			yield afterEvent;
		}
	}

	/**
	 * Internal implementation for runLive
	 */
	private async *runLiveInternal(
		parentContext: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		const ctx = this.createInvocationContext(parentContext);
		// TODO: support before/after_agent_callback

		for await (const event of this.runLiveImpl(ctx)) {
			yield event;
		}
	}

	/**
	 * Core logic to run this agent via text-based conversation.
	 *
	 * @param ctx - The invocation context for this agent.
	 * @yields Event - The events generated by the agent.
	 */

	// biome-ignore lint/correctness/useYield: This is a abstract method
	protected async *runAsyncImpl(
		_ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		throw new Error(
			`runAsyncImpl for ${this.constructor.name} is not implemented.`,
		);
	}

	/**
	 * Core logic to run this agent via video/audio-based conversation.
	 *
	 * @param ctx - The invocation context for this agent.
	 * @yields Event - The events generated by the agent.
	 */
	// biome-ignore lint/correctness/useYield: This is a abstract method
	protected async *runLiveImpl(
		_ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		throw new Error(
			`runLiveImpl for ${this.constructor.name} is not implemented.`,
		);
	}

	/**
	 * Gets the root agent of this agent.
	 */
	get rootAgent(): BaseAgent {
		let rootAgent: BaseAgent = this;
		while (rootAgent.parentAgent !== undefined) {
			rootAgent = rootAgent.parentAgent;
		}
		return rootAgent;
	}

	/**
	 * Finds the agent with the given name in this agent and its descendants.
	 *
	 * @param name - The name of the agent to find.
	 * @returns The agent with the matching name, or undefined if no such agent is found.
	 */
	findAgent(name: string): BaseAgent | undefined {
		if (this.name === name) {
			return this;
		}
		return this.findSubAgent(name);
	}

	/**
	 * Finds the agent with the given name in this agent's descendants.
	 *
	 * @param name - The name of the agent to find.
	 * @returns The agent with the matching name, or undefined if no such agent is found.
	 */
	findSubAgent(name: string): BaseAgent | undefined {
		for (const subAgent of this.subAgents) {
			const result = subAgent.findAgent(name);
			if (result) {
				return result;
			}
		}
		return undefined;
	}

	/**
	 * Creates a new invocation context for this agent.
	 */
	private createInvocationContext(
		parentContext: InvocationContext,
	): InvocationContext {
		return parentContext.createChildContext(this);
	}

	/**
	 * The resolved beforeAgentCallback field as a list of SingleAgentCallback.
	 * This method is only for use by Agent Development Kit.
	 */
	get canonicalBeforeAgentCallbacks(): SingleAgentCallback[] {
		if (!this.beforeAgentCallback) {
			return [];
		}
		if (Array.isArray(this.beforeAgentCallback)) {
			return this.beforeAgentCallback;
		}
		return [this.beforeAgentCallback];
	}

	/**
	 * The resolved afterAgentCallback field as a list of SingleAgentCallback.
	 * This method is only for use by Agent Development Kit.
	 */
	get canonicalAfterAgentCallbacks(): SingleAgentCallback[] {
		if (!this.afterAgentCallback) {
			return [];
		}
		if (Array.isArray(this.afterAgentCallback)) {
			return this.afterAgentCallback;
		}
		return [this.afterAgentCallback];
	}

	/**
	 * Runs the beforeAgentCallback if it exists.
	 *
	 * @returns An event if callback provides content or changed state.
	 */
	private async handleBeforeAgentCallback(
		ctx: InvocationContext,
	): Promise<Event | undefined> {
		let retEvent: Event | undefined;

		if (this.canonicalBeforeAgentCallbacks.length === 0) {
			return retEvent;
		}
		const callbackContext = new CallbackContext(ctx);

		for (const callback of this.canonicalBeforeAgentCallbacks) {
			let beforeAgentCallbackContent = callback(callbackContext);

			if (beforeAgentCallbackContent instanceof Promise) {
				beforeAgentCallbackContent = await beforeAgentCallbackContent;
			}

			if (beforeAgentCallbackContent) {
				retEvent = new Event({
					invocationId: ctx.invocationId,
					author: this.name,
					branch: ctx.branch,
					content: beforeAgentCallbackContent,
					actions: callbackContext.eventActions,
				});
				ctx.endInvocation = true;
				return retEvent;
			}
		}
		if (callbackContext.state.hasDelta()) {
			retEvent = new Event({
				invocationId: ctx.invocationId,
				author: this.name,
				branch: ctx.branch,
				actions: callbackContext.eventActions,
			});
		}

		return retEvent;
	}

	/**
	 * Runs the afterAgentCallback if it exists.
	 *
	 * @returns An event if callback provides content or changed state.
	 */
	private async handleAfterAgentCallback(
		invocationContext: InvocationContext,
	): Promise<Event | undefined> {
		let retEvent: Event | undefined;

		if (this.canonicalAfterAgentCallbacks.length === 0) {
			return retEvent;
		}

		const callbackContext = new CallbackContext(invocationContext);
		let afterAgentCallbackContent: Content | undefined;

		for (const callback of this.canonicalAfterAgentCallbacks) {
			afterAgentCallbackContent = await callback(callbackContext);

			if (afterAgentCallbackContent instanceof Promise) {
				afterAgentCallbackContent = await afterAgentCallbackContent;
			}

			if (afterAgentCallbackContent) {
				retEvent = new Event({
					invocationId: invocationContext.invocationId,
					author: this.name,
					branch: invocationContext.branch,
					content: afterAgentCallbackContent,
					actions: callbackContext.eventActions,
				});
				return retEvent;
			}
		}
		if (callbackContext.state.hasDelta()) {
			retEvent = new Event({
				invocationId: invocationContext.invocationId,
				author: this.name,
				branch: invocationContext.branch,
				content: afterAgentCallbackContent,
				actions: callbackContext.eventActions,
			});
		}

		return retEvent;
	}

	/**
	 * Validates the agent name.
	 */
	private validateName(value: string): void {
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
			throw new Error(
				`Found invalid agent name: \`${value}\`. Agent name must be a valid identifier. It should start with a letter (a-z, A-Z) or an underscore (_), and can only contain letters, digits (0-9), and underscores.`,
			);
		}

		if (value === "user") {
			throw new Error(
				"Agent name cannot be `user`. `user` is reserved for end-user's input.",
			);
		}
	}

	/**
	 * Sets parent agent for sub-agents.
	 */
	private setParentAgentForSubAgents(): void {
		for (const subAgent of this.subAgents) {
			if (subAgent.parentAgent !== undefined) {
				throw new Error(
					`Agent \`${subAgent.name}\` already has a parent agent, current` +
						` parent: \`${subAgent.parentAgent.name}\`, trying to add:` +
						` \`${this.name}\``,
				);
			}
			subAgent.parentAgent = this;
		}
	}
}
