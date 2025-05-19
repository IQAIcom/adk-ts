import type { Message } from "../models/llm-request";
import type { RunConfig } from "./run-config";
import type { InvocationContext } from "./invocation-context";
import type { Event } from "../events/event";

/**
 * Base class for all agents in the Agent Development Kit
 */
export abstract class BaseAgent {
	/**
	 * The agent's name
	 * Agent name must be a unique identifier within the agent tree
	 */
	name: string;

	/**
	 * Description about the agent's capability
	 * The LLM uses this to determine whether to delegate control to the agent
	 */
	description: string;

	/**
	 * The parent agent of this agent
	 * Note that an agent can ONLY be added as sub-agent once
	 */
	parentAgent?: BaseAgent;

	/**
	 * The sub-agents of this agent
	 */
	subAgents: BaseAgent[];

	/**
	 * Constructs a new BaseAgent
	 */
	constructor(config: {
		name: string;
		description: string;
	}) {
		this.name = config.name;
		this.description = config.description;
		this.subAgents = [];

		// Validate agent name
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.name)) {
			throw new Error(
				`Invalid agent name: ${this.name}. Agent name must be a valid identifier.`,
			);
		}

		if (this.name === "user") {
			throw new Error(
				"Agent name cannot be \"user\", since it's reserved for end-user's input.",
			);
		}
	}

	/**
	 * Gets the root agent of the agent tree
	 */
	get rootAgent(): BaseAgent {
		return this.parentAgent ? this.parentAgent.rootAgent : this;
	}

	/**
	 * Adds a sub-agent to this agent
	 */
	addSubAgent(agent: BaseAgent): BaseAgent {
		if (agent.parentAgent) {
			throw new Error(
				`Agent ${agent.name} already has a parent agent ${agent.parentAgent.name}. An agent can only be added as a sub-agent once.`,
			);
		}

		// Check for duplicate names
		if (this.findSubAgent(agent.name)) {
			throw new Error(`Sub-agent with name ${agent.name} already exists.`);
		}

		this.subAgents.push(agent);
		agent.parentAgent = this;

		return this;
	}

	/**
	 * Finds a sub-agent by name
	 */
	findSubAgent(name: string): BaseAgent | undefined {
		return this.subAgents.find((agent) => agent.name === name);
	}

	/**
	 * Finds an agent in the agent tree by name
	 */
	findAgent(name: string): BaseAgent | undefined {
		if (this.name === name) {
			return this;
		}

		for (const subAgent of this.subAgents) {
			const found = subAgent.findAgent(name);
			if (found) {
				return found;
			}
		}

		return undefined;
	}

	/**
	 * Runs the agent with the given messages and configuration
	 */
	abstract run(options: {
		messages: Message[];
		config?: RunConfig;
		sessionId?: string;
	}): Promise<any>;

	/**
	 * Runs the agent with streaming support
	 */
	abstract runStreaming(options: {
		messages: Message[];
		config?: RunConfig;
		sessionId?: string;
	}): AsyncIterable<any>;

	/**
	 * Runs the agent asynchronously, yielding events.
	 * This is the primary method for agent execution by the Runner.
	 * @param context The invocation context for this run.
	 * @returns An async generator of events.
	 */
	abstract runAsync(
		context: InvocationContext,
	): AsyncGenerator<Event, void, void>;
}
