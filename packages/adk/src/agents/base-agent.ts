import type { Message } from "../models/llm-request";
import { tracer } from "../telemetry";
import type { RunConfig } from "./run-config";

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
	 * The LLM uses this to determine wshether to delegate control to the agent
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
	async run(options: {
		messages: Message[];
		config?: RunConfig;
		sessionId?: string;
		userId?: string; // Add userId parameter
	}): Promise<any> {
		return await tracer.startActiveSpan(
			`agent_run [${this.name}]`,
			async (span) => {
				try {
					span.setAttributes({
						"gen_ai.system.name": "iqai-adk",
						"gen_ai.operation.name": "agent_run",

						// Session and user tracking (maps to Langfuse)
						...(options.sessionId && { "session.id": options.sessionId }),
						...(options.userId && { "user.id": options.userId }),

						// Environment
						...(process.env.NODE_ENV && {
							"deployment.environment.name": process.env.NODE_ENV,
						}),

						// Agent-specific attributes
						"adk.agent.name": this.name,
						"adk.session_id": options.sessionId || "unknown",
						"adk.message_count": options.messages.length,
					});

					// Add input as event
					span.addEvent("agent.input", {
						"input.value": JSON.stringify(
							options.messages.map((msg) => ({
								role: msg.role,
								content:
									typeof msg.content === "string"
										? msg.content.substring(0, 200) +
											(msg.content.length > 200 ? "..." : "")
										: "[complex_content]",
							})),
						),
					});

					const result = await this.runImpl(options);

					// Add output as event
					span.addEvent("agent.output", {
						"output.value":
							typeof result === "string"
								? result.substring(0, 500)
								: JSON.stringify(result).substring(0, 500),
					});

					return result;
				} catch (error) {
					span.recordException(error as Error);
					span.setStatus({ code: 2, message: (error as Error).message });
					console.error("❌ ADK Agent Run Failed:", {
						agentName: this.name,
						sessionId: options.sessionId,
						error: (error as Error).message,
					});
					throw error;
				} finally {
					span.end();
				}
			},
		);
	}

	/**
	 * Implementation method to be overridden by subclasses
	 */
	protected abstract runImpl(options: {
		messages: Message[];
		config?: RunConfig;
		sessionId?: string;
	}): Promise<any>;

	/**
	 * Runs the agent with streaming support
	 */
	async *runStreaming(options: {
		messages: Message[];
		config?: RunConfig;
		sessionId?: string;
	}): AsyncIterable<any> {
		const span = tracer.startSpan(`agent_run_streaming [${this.name}]`);

		try {
			span.setAttributes({
				"gen_ai.system.name": "iqai-adk",
				"gen_ai.operation.name": "agent_run_streaming",
				"adk.agent.name": this.name,
				"adk.session_id": options.sessionId || "unknown",
				"adk.message_count": options.messages.length,
			});

			console.log("🎯 ADK Agent Streaming Started:", {
				agentName: this.name,
				sessionId: options.sessionId,
				messageCount: options.messages.length,
			});

			let chunkCount = 0;
			for await (const chunk of this.runStreamingImpl(options)) {
				chunkCount++;
				console.log(`📡 ADK Agent Stream Chunk ${chunkCount}:`, {
					agentName: this.name,
					chunk:
						typeof chunk === "string"
							? chunk.substring(0, 100) + (chunk.length > 100 ? "..." : "")
							: typeof chunk,
				});
				yield chunk;
			}

			span.setAttributes({
				"adk.stream_chunks": chunkCount,
			});
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: 2, message: (error as Error).message });
			console.error("❌ ADK Agent Streaming Failed:", {
				agentName: this.name,
				error: (error as Error).message,
			});
			throw error;
		} finally {
			span.end();
		}
	}

	/**
	 * Implementation method to be overridden by subclasses
	 */
	protected abstract runStreamingImpl(options: {
		messages: Message[];
		config?: RunConfig;
		sessionId?: string;
	}): AsyncIterable<any>;
}
