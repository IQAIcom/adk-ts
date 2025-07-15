import type { LanguageModel } from "ai";
import type { BaseArtifactService } from "../artifacts/base-artifact-service.js";
import type { BaseMemoryService } from "../memory/base-memory-service.js";
import type { BaseLlm } from "../models/base-llm.js";
import type { BasePlanner } from "../planners/base-planner.js";
import { Runner } from "../runners.js";
import type { BaseSessionService } from "../sessions/base-session-service.js";
import { InMemorySessionService } from "../sessions/in-memory-session-service.js";
import type { Session } from "../sessions/session.js";
import type { BaseTool } from "../tools/base/base-tool.js";
import type { BaseAgent } from "./base-agent.js";
import { LangGraphAgent, type LangGraphNode } from "./lang-graph-agent.js";
import { LlmAgent } from "./llm-agent.js";
import { LoopAgent } from "./loop-agent.js";
import { ParallelAgent } from "./parallel-agent.js";
import { SequentialAgent } from "./sequential-agent.js";

/**
 * Configuration options for the AgentBuilder
 */
export interface AgentBuilderConfig {
	name: string;
	model?: string | BaseLlm | LanguageModel;
	description?: string;
	instruction?: string;
	tools?: BaseTool[];
	planner?: BasePlanner;
	subAgents?: BaseAgent[];
	maxIterations?: number;
	nodes?: LangGraphNode[];
	rootNode?: string;
}

/**
 * Session configuration for the AgentBuilder
 */
export interface SessionConfig {
	service: BaseSessionService;
	userId: string;
	appName: string;
	memoryService?: BaseMemoryService;
	artifactService?: BaseArtifactService;
}

/**
 * Built agent result containing the agent and optional runner/session
 */
export interface BuiltAgent {
	agent: BaseAgent;
	runner?: Runner;
	session?: Session;
}

/**
 * Agent types that can be built
 */
export type AgentType =
	| "llm"
	| "sequential"
	| "parallel"
	| "loop"
	| "langgraph";

/**
 * AgentBuilder - A fluent interface for building agents with optional session management
 *
 * This builder provides a convenient way to create agents, manage sessions, and
 * automatically set up runners without the boilerplate code. It supports all
 * agent types and maintains backward compatibility with existing interfaces.
 *
 * Examples:
 * ```typescript
 * // Simplest possible usage
 * const response = await AgentBuilder
 *   .withModel("gemini-2.5-flash")
 *   .ask("What is the capital of Australia?");
 *
 * // Simple agent with name
 * const { agent } = AgentBuilder
 *   .create("my-agent")
 *   .withModel("gemini-2.5-flash")
 *   .withInstruction("You are helpful")
 *   .build();
 *
 * // Agent with session and runner
 * const { agent, runner, session } = await AgentBuilder
 *   .create("my-agent")
 *   .withModel("gemini-2.5-flash")
 *   .withSession(sessionService, "user123", "myApp")
 *   .build();
 *
 * // Using an AI SDK provider directly
 * import { google } from "@ai-sdk/google";
 * const response = await AgentBuilder.withModel(google()).ask("Hi");
 * ```
 */
export class AgentBuilder {
	private config: AgentBuilderConfig;
	private sessionConfig?: SessionConfig;
	private agentType: AgentType = "llm";

	/**
	 * Private constructor - use static create() method
	 */
	private constructor(name: string) {
		this.config = { name };
	}

	/**
	 * Create a new AgentBuilder instance
	 * @param name The name of the agent (defaults to "default_agent")
	 * @returns New AgentBuilder instance
	 */
	static create(name = "default_agent"): AgentBuilder {
		return new AgentBuilder(name);
	}

	/**
	 * Convenience method to start building with a model directly
	 * @param model The model identifier (e.g., "gemini-2.5-flash")
	 * @returns New AgentBuilder instance with model set
	 */
	static withModel(model: string | BaseLlm | LanguageModel): AgentBuilder {
		return new AgentBuilder("default_agent").withModel(model);
	}

	/**
	 * Set the model for the agent
	 * @param model The model identifier (e.g., "gemini-2.5-flash")
	 * @returns This builder instance for chaining
	 */
	withModel(model: string | BaseLlm | LanguageModel): this {
		this.config.model = model;
		return this;
	}

	/**
	 * Set the description for the agent
	 * @param description Agent description
	 * @returns This builder instance for chaining
	 */
	withDescription(description: string): this {
		this.config.description = description;
		return this;
	}

	/**
	 * Set the instruction for the agent
	 * @param instruction System instruction for the agent
	 * @returns This builder instance for chaining
	 */
	withInstruction(instruction: string): this {
		this.config.instruction = instruction;
		return this;
	}

	/**
	 * Add tools to the agent
	 * @param tools Tools to add to the agent
	 * @returns This builder instance for chaining
	 */
	withTools(...tools: BaseTool[]): this {
		this.config.tools = [...(this.config.tools || []), ...tools];
		return this;
	}

	/**
	 * Set the planner for the agent
	 * @param planner The planner to use
	 * @returns This builder instance for chaining
	 */
	withPlanner(planner: BasePlanner): this {
		this.config.planner = planner;
		return this;
	}

	/**
	 * Configure as a sequential agent
	 * @param subAgents Sub-agents to execute in sequence
	 * @returns This builder instance for chaining
	 */
	asSequential(subAgents: BaseAgent[]): this {
		this.agentType = "sequential";
		this.config.subAgents = subAgents;
		return this;
	}

	/**
	 * Configure as a parallel agent
	 * @param subAgents Sub-agents to execute in parallel
	 * @returns This builder instance for chaining
	 */
	asParallel(subAgents: BaseAgent[]): this {
		this.agentType = "parallel";
		this.config.subAgents = subAgents;
		return this;
	}

	/**
	 * Configure as a loop agent
	 * @param subAgents Sub-agents to execute iteratively
	 * @param maxIterations Maximum number of iterations
	 * @returns This builder instance for chaining
	 */
	asLoop(subAgents: BaseAgent[], maxIterations = 3): this {
		this.agentType = "loop";
		this.config.subAgents = subAgents;
		this.config.maxIterations = maxIterations;
		return this;
	}

	/**
	 * Configure as a LangGraph agent
	 * @param nodes Graph nodes defining the workflow
	 * @param rootNode The starting node name
	 * @returns This builder instance for chaining
	 */
	asLangGraph(nodes: LangGraphNode[], rootNode: string): this {
		this.agentType = "langgraph";
		this.config.nodes = nodes;
		this.config.rootNode = rootNode;
		return this;
	}

	/**
	 * Configure session management
	 * @param service Session service to use
	 * @param userId User identifier
	 * @param appName Application name
	 * @param memoryService Optional memory service
	 * @param artifactService Optional artifact service
	 * @returns This builder instance for chaining
	 */
	withSession(
		service: BaseSessionService,
		userId: string,
		appName: string,
		memoryService?: BaseMemoryService,
		artifactService?: BaseArtifactService
	): this {
		this.sessionConfig = {
			service,
			userId,
			appName,
			memoryService,
			artifactService,
		};
		return this;
	}

	/**
	 * Configure with an in-memory session (for quick setup)
	 * @param appName Application name
	 * @param userId User identifier
	 * @returns This builder instance for chaining
	 */
	withQuickSession(appName: string, userId: string): this {
		return this.withSession(new InMemorySessionService(), userId, appName);
	}

	/**
	 * Build the agent and optionally create runner and session
	 * @returns Built agent with optional runner and session
	 */
	async build(): Promise<BuiltAgent> {
		const agent = this.createAgent();
		let runner: Runner | undefined;
		let session: Session | undefined;

		if (this.sessionConfig) {
			session = await this.sessionConfig.service.createSession(
				this.sessionConfig.appName,
				this.sessionConfig.userId
			);

			const runnerConfig: any = {
				appName: this.sessionConfig.appName,
				agent,
				sessionService: this.sessionConfig.service,
			};

			if (this.sessionConfig.memoryService) {
				runnerConfig.memoryService = this.sessionConfig.memoryService;
			}

			if (this.sessionConfig.artifactService) {
				runnerConfig.artifactService = this.sessionConfig.artifactService;
			}

			runner = new Runner(runnerConfig);
		}

		return { agent, runner, session };
	}

	/**
	 * Quick execution helper - build and run a message
	 * @param message Message to send to the agent
	 * @returns Agent response
	 */
	async ask(message: string): Promise<string> {
		// If no session config is provided, create a temporary one automatically
		if (!this.sessionConfig) {
			const userId = `user-${this.config.name}`;
			const appName = `session-${this.config.name}`;
			this.withQuickSession(appName, userId);
		}

		const { runner, session } = await this.build();

		if (!(runner && session)) {
			throw new Error("Failed to create runner and session");
		}

		let response = "";

		for await (const event of runner.runAsync({
			userId: this.sessionConfig!.userId,
			sessionId: session.id,
			newMessage: {
				parts: [{ text: message }],
			},
		})) {
			if (event.content?.parts) {
				const content = event.content.parts
					.map((part) => part.text || "")
					.join("");
				if (content) {
					response += content;
				}
			}
		}

		return response;
	}

	/**
	 * Create the appropriate agent type based on configuration
	 * @returns Created agent instance
	 */
	private createAgent(): BaseAgent {
		switch (this.agentType) {
			case "llm": {
				if (!this.config.model) {
					throw new Error("Model is required for LLM agent");
				}

				const model = this.config.model;

				return new LlmAgent({
					name: this.config.name,
					model,
					description: this.config.description,
					instruction: this.config.instruction,
					tools: this.config.tools,
					planner: this.config.planner,
				});
			}
			case "sequential":
				if (!this.config.subAgents) {
					throw new Error("Sub-agents required for sequential agent");
				}
				return new SequentialAgent({
					name: this.config.name,
					description: this.config.description || "",
					subAgents: this.config.subAgents,
				});

			case "parallel":
				if (!this.config.subAgents) {
					throw new Error("Sub-agents required for parallel agent");
				}
				return new ParallelAgent({
					name: this.config.name,
					description: this.config.description || "",
					subAgents: this.config.subAgents,
				});

			case "loop":
				if (!this.config.subAgents) {
					throw new Error("Sub-agents required for loop agent");
				}
				return new LoopAgent({
					name: this.config.name,
					description: this.config.description || "",
					subAgents: this.config.subAgents,
					maxIterations: this.config.maxIterations || 3,
				});

			case "langgraph":
				if (!(this.config.nodes && this.config.rootNode)) {
					throw new Error("Nodes and root node required for LangGraph agent");
				}
				return new LangGraphAgent({
					name: this.config.name,
					description: this.config.description || "",
					nodes: this.config.nodes,
					rootNode: this.config.rootNode,
				});
		}
	}
}
