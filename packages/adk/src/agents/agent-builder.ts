import type { LlmRequest } from "@adk/models";
import type { Content, Part } from "@google/genai";
import { type LanguageModel, generateId } from "ai";
import type { BaseArtifactService } from "../artifacts/base-artifact-service.js";
import type { Event } from "../events/event.js";
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
 * Session configuration options
 */
export interface SessionOptions {
	userId?: string;
	appName?: string;
}

/**
 * Internal session configuration for the AgentBuilder
 */
interface InternalSessionConfig {
	service: BaseSessionService;
	userId: string;
	appName: string;
}

/**
 * Message part interface for flexible message input
 */
export interface MessagePart extends Part {
	image?: string;
}

/**
 * Full message interface for advanced usage
 */
export interface FullMessage extends Content {
	parts?: MessagePart[];
}

/**
 * Enhanced runner interface with simplified API
 */
export interface EnhancedRunner {
	ask(message: string | FullMessage | LlmRequest): Promise<string>;
	runAsync(params: {
		userId: string;
		sessionId: string;
		newMessage: FullMessage;
	}): AsyncIterable<Event>;
}

/**
 * Built agent result containing the agent and runner/session
 */
export interface BuiltAgent {
	agent: BaseAgent;
	runner: EnhancedRunner;
	session: Session;
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
 * Configuration for creating a Runner instance
 */
interface RunnerConfig {
	appName: string;
	agent: BaseAgent;
	sessionService: BaseSessionService;
	memoryService?: BaseMemoryService;
	artifactService?: BaseArtifactService;
}

/**
 * AgentBuilder - A fluent interface for creating AI agents with automatic session management
 *
 * Provides a simple, chainable API for building different types of agents (LLM, Sequential,
 * Parallel, Loop, LangGraph) with tools, custom instructions, and multi-agent workflows.
 * Sessions are automatically created using in-memory storage by default.
 *
 * @example
 * ```typescript
 * // Simple usage
 * const response = await AgentBuilder.withModel("gemini-2.5-flash").ask("Hello");
 *
 * // With tools and instructions
 * const { runner } = await AgentBuilder
 *   .create("research-agent")
 *   .withModel("gemini-2.5-flash")
 *   .withTools(new GoogleSearch())
 *   .withInstruction("You are a research assistant")
 *   .build();
 *
 * // With memory and artifact services
 * const { runner } = await AgentBuilder
 *   .create("persistent-agent")
 *   .withModel("gemini-2.5-flash")
 *   .withMemory(new RedisMemoryService())
 *   .withArtifactService(new S3ArtifactService())
 *   .withSession(new DatabaseSessionService(), { userId: "user123", appName: "myapp" })
 *   .build();
 *
 * // Multi-agent workflow
 * const { runner } = await AgentBuilder
 *   .create("workflow")
 *   .asSequential([agent1, agent2])
 *   .build();
 * ```
 */
export class AgentBuilder {
	private config: AgentBuilderConfig;
	private sessionConfig?: InternalSessionConfig;
	private memoryService?: BaseMemoryService;
	private artifactService?: BaseArtifactService;
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
	 * Configure session management with optional smart defaults
	 * @param service Session service to use
	 * @param options Session configuration options (userId and appName)
	 * @returns This builder instance for chaining
	 */
	withSession(service: BaseSessionService, options: SessionOptions = {}): this {
		this.sessionConfig = {
			service,
			userId: options.userId || this.generateDefaultUserId(),
			appName: options.appName || this.generateDefaultAppName(),
		};
		return this;
	}

	/**
	 * Configure memory service for the agent
	 * @param memoryService Memory service to use for conversation history and context
	 * @returns This builder instance for chaining
	 */
	withMemory(memoryService: BaseMemoryService): this {
		this.memoryService = memoryService;
		return this;
	}

	/**
	 * Configure artifact service for the agent
	 * @param artifactService Artifact service to use for managing generated artifacts
	 * @returns This builder instance for chaining
	 */
	withArtifactService(artifactService: BaseArtifactService): this {
		this.artifactService = artifactService;
		return this;
	}

	/**
	 * Configure with an in-memory session with custom IDs
	 * Note: In-memory sessions are created automatically by default, use this only if you need custom appName/userId
	 * @param options Session configuration options (userId and appName)
	 * @returns This builder instance for chaining
	 */
	withQuickSession(options: SessionOptions = {}): this {
		return this.withSession(new InMemorySessionService(), options);
	}

	/**
	 * Build the agent and optionally create runner and session
	 * @returns Built agent with optional runner and session
	 */
	async build(): Promise<BuiltAgent> {
		const agent = this.createAgent();
		let runner: EnhancedRunner | undefined;
		let session: Session | undefined;

		// If no session config is provided, create a default in-memory session
		if (!this.sessionConfig) {
			this.withQuickSession();
		}

		if (this.sessionConfig) {
			session = await this.sessionConfig.service.createSession(
				this.sessionConfig.appName,
				this.sessionConfig.userId,
			);

			const runnerConfig: RunnerConfig = {
				appName: this.sessionConfig.appName,
				agent,
				sessionService: this.sessionConfig.service,
				memoryService: this.memoryService,
				artifactService: this.artifactService,
			};

			const baseRunner = new Runner(runnerConfig);

			// Create enhanced runner with simplified API
			runner = this.createEnhancedRunner(baseRunner, session);
		}

		return { agent, runner, session };
	}

	/**
	 * Quick execution helper - build and run a message
	 * @param message Message to send to the agent (string or full message object)
	 * @returns Agent response
	 */
	async ask(message: string | FullMessage): Promise<string> {
		const { runner } = await this.build();
		return runner.ask(message);
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
					model: model,
					description: this.config.description,
					instruction: this.config.instruction,
					tools: this.config.tools,
					planner: this.config.planner,
				});
			}
			case "sequential":
				if (
					!this.config.subAgents ||
					!Array.isArray(this.config.subAgents) ||
					this.config.subAgents.length === 0
				) {
					throw new Error("Sub-agents required for sequential agent");
				}
				return new SequentialAgent({
					name: this.config.name,
					description: this.config.description || "",
					subAgents: this.config.subAgents,
				});

			case "parallel":
				if (
					!this.config.subAgents ||
					!Array.isArray(this.config.subAgents) ||
					this.config.subAgents.length === 0
				) {
					throw new Error("Sub-agents required for parallel agent");
				}
				return new ParallelAgent({
					name: this.config.name,
					description: this.config.description || "",
					subAgents: this.config.subAgents,
				});

			case "loop":
				if (
					!this.config.subAgents ||
					!Array.isArray(this.config.subAgents) ||
					this.config.subAgents.length === 0
				) {
					throw new Error("Sub-agents required for loop agent");
				}
				return new LoopAgent({
					name: this.config.name,
					description: this.config.description || "",
					subAgents: this.config.subAgents,
					maxIterations: this.config.maxIterations || 3,
				});

			case "langgraph":
				if (
					!this.config.nodes ||
					!Array.isArray(this.config.nodes) ||
					this.config.nodes.length === 0 ||
					!this.config.rootNode ||
					typeof this.config.rootNode !== "string"
				) {
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

	/**
	 * Generate default user ID based on agent name and id
	 * @returns Generated user ID
	 */
	private generateDefaultUserId(): string {
		const id = generateId();
		return `user-${this.config.name}-${id}`;
	}

	/**
	 * Generate default app name based on agent name
	 * @returns Generated app name
	 */
	private generateDefaultAppName(): string {
		return `app-${this.config.name}`;
	}

	/**
	 * Create enhanced runner with simplified API
	 * @param baseRunner The base runner instance
	 * @param session The session instance
	 * @returns Enhanced runner with simplified API
	 */
	private createEnhancedRunner(
		baseRunner: Runner,
		session: Session,
	): EnhancedRunner {
		const sessionConfig = this.sessionConfig; // Capture sessionConfig in closure

		return {
			async ask(message: string | FullMessage | LlmRequest): Promise<string> {
				const newMessage: FullMessage =
					typeof message === "string"
						? { parts: [{ text: message }] }
						: typeof message === "object" && "contents" in message
							? { parts: message.contents[message.contents.length - 1].parts }
							: message;
				let response = "";

				if (!sessionConfig) {
					throw new Error("Session configuration is required");
				}

				for await (const event of baseRunner.runAsync({
					userId: sessionConfig.userId,
					sessionId: session.id,
					newMessage,
				})) {
					if (event.content?.parts && Array.isArray(event.content.parts)) {
						const content = event.content.parts
							.map(
								(part) =>
									(part && typeof part === "object" && "text" in part
										? part.text
										: "") || "",
							)
							.join("");
						if (content) {
							response += content;
						}
					}
				}

				return response;
			},

			runAsync(params: {
				userId: string;
				sessionId: string;
				newMessage: FullMessage;
			}) {
				return baseRunner.runAsync(params);
			},
		};
	}
}
