import { Logger } from "@adk/logger/index.js";
import type { LlmRequest } from "@adk/models";
import type { Content, Part } from "@google/genai";
import { generateId, type LanguageModel } from "ai";
import type { ZodSchema, ZodType } from "zod";
import type { BaseArtifactService } from "../artifacts/base-artifact-service.js";
import type { BaseCodeExecutor } from "../code-executors/base-code-executor.js";
import type { EventsCompactionConfig } from "../events/compaction-config.js";
import type { Event } from "../events/event.js";
import type { BaseMemoryService } from "../memory/base-memory-service.js";
import type { BaseLlm } from "../models/base-llm.js";
import type { BasePlanner } from "../planners/base-planner.js";
import { Runner } from "../runners.js";
import type { BaseSessionService } from "../sessions/base-session-service.js";
import { InMemorySessionService } from "../sessions/in-memory-session-service.js";
import type { Session } from "../sessions/session.js";
import type { BaseTool } from "../tools/base/base-tool.js";
import type {
	AfterAgentCallback,
	BaseAgent,
	BeforeAgentCallback,
} from "./base-agent.js";
import { LangGraphAgent, type LangGraphNode } from "./lang-graph-agent.js";
import type {
	AfterModelCallback,
	AfterToolCallback,
	BeforeModelCallback,
	BeforeToolCallback,
} from "./llm-agent.js";
import { LlmAgent } from "./llm-agent.js";
import { LoopAgent } from "./loop-agent.js";
import { ParallelAgent } from "./parallel-agent.js";
import { RunConfig } from "./run-config.js";
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
	codeExecutor?: BaseCodeExecutor;
	subAgents?: BaseAgent[];
	beforeAgentCallback?: BeforeAgentCallback;
	afterAgentCallback?: AfterAgentCallback;
	beforeModelCallback?: BeforeModelCallback;
	afterModelCallback?: AfterModelCallback;
	beforeToolCallback?: BeforeToolCallback;
	afterToolCallback?: AfterToolCallback;
	maxIterations?: number;
	nodes?: LangGraphNode[];
	rootNode?: string;
	outputKey?: string;
	inputSchema?: ZodSchema;
	outputSchema?: ZodSchema;
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
 * Session configuration options
 */
export interface SessionOptions {
	userId?: string;
	appName?: string;
	state?: Record<string, any>;
	sessionId?: string;
}

/**
 * Multi-agent standardized response type
 */
export type MultiAgentResponse = { agent: string; response: string }[];

/** Helper conditional type for ask() return */
export type RunnerAskReturn<T, M extends boolean> = M extends true
	? MultiAgentResponse
	: T;

/**
 * Enhanced runner interface with simplified API and conditional typing.
 * M (multi) flag determines if ask() returns a multi-agent response array.
 */
export interface EnhancedRunner<T = string, M extends boolean = false> {
	ask(
		message: string | FullMessage | LlmRequest,
	): Promise<RunnerAskReturn<T, M>>;
	runAsync(params: {
		userId: string;
		sessionId: string;
		newMessage: FullMessage;
		runConfig?: RunConfig;
	}): AsyncIterable<Event>;
	rewind(params: {
		userId: string;
		sessionId: string;
		rewindBeforeInvocationId: string;
	});
	__outputSchema?: ZodSchema;
}

/**
 * Built agent result containing the agent and runner/session
 */
export interface BuiltAgent<T = string, M extends boolean = false> {
	agent: BaseAgent;
	runner: EnhancedRunner<T, M>;
	session: Session;
	sessionService: BaseSessionService; // newly exposed for external session operations
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
 * AgentBuilder with typed output schema
 */
export interface AgentBuilderWithSchema<T, M extends boolean = false>
	extends Omit<AgentBuilder<any, any>, "build" | "ask" | "withOutputSchema"> {
	build(): Promise<BuiltAgent<T, M>>;
	buildWithSchema<U = T>(): Promise<BuiltAgent<U, M>>;
	ask(message: string | FullMessage): Promise<RunnerAskReturn<T, M>>;
}

/**
 * Configuration for creating a Runner instance
 */
interface RunnerConfig {
	appName: string;
	agent: BaseAgent;
	sessionService: BaseSessionService;
	memoryService?: BaseMemoryService;
	artifactService?: BaseArtifactService;
	eventsCompactionConfig?: EventsCompactionConfig;
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
 * // With code executor for running code
 * const { runner } = await AgentBuilder
 *   .create("code-agent")
 *   .withModel("gemini-2.5-flash")
 *   .withCodeExecutor(new ContainerCodeExecutor())
 *   .withInstruction("You can execute code to solve problems")
 *   .build();
 *
 * // With memory and artifact services
 * const { runner } = await AgentBuilder
 *   .create("persistent-agent")
 *   .withModel("gemini-2.5-flash")
 *   .withMemory(new RedisMemoryService())
 *   .withArtifactService(new S3ArtifactService())
 *   .withSessionService(new DatabaseSessionService(), { userId: "user123", appName: "myapp" })
 *   .build();
 *
 * // Multi-agent workflow
 * const { runner } = await AgentBuilder
 *   .create("workflow")
 *   .asSequential([agent1, agent2])
 *   .build();
 * ```
 */
export class AgentBuilder<TOut = string, TMulti extends boolean = false> {
	private config: AgentBuilderConfig;
	private sessionService?: BaseSessionService;
	private sessionOptions?: SessionOptions;
	private memoryService?: BaseMemoryService;
	private artifactService?: BaseArtifactService;
	private eventsCompactionConfig?: EventsCompactionConfig;
	private agentType: AgentType = "llm";
	private existingSession?: Session;
	private existingAgent?: BaseAgent; // If provided, reuse directly
	private definitionLocked = false; // Lock further definition mutation after withAgent
	private logger = new Logger({ name: "AgentBuilder" });
	private runConfig?: RunConfig;

	/**
	 * Warn (once per method) if the definition has been locked by withAgent().
	 */
	private warnIfLocked(method: string): void {
		if (!this.definitionLocked) return;
		this.logger.warn(
			`AgentBuilder: ${method}() ignored because builder is locked by withAgent()`,
			{
				suggestion:
					"Configure model/tools/etc. before calling withAgent(), or avoid withAgent() if you intend to mutate afterwards.",
				context: { method, agentName: this.config.name },
			},
		);
	}

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
	static create(name = "default_agent"): AgentBuilder<string, false> {
		return new AgentBuilder(name);
	}

	/**
	 * Convenience method to start building with a model directly
	 * @param model The model identifier (e.g., "gemini-2.5-flash")
	 * @returns New AgentBuilder instance with model set
	 */
	static withModel(
		model: string | BaseLlm | LanguageModel,
	): AgentBuilder<string, false> {
		return new AgentBuilder("default_agent").withModel(model);
	}

	/**
	 * Set the model for the agent
	 * @param model The model identifier (e.g., "gemini-2.5-flash")
	 * @returns This builder instance for chaining
	 */
	withModel(model: string | BaseLlm | LanguageModel): this {
		this.warnIfLocked("withModel");
		this.config.model = model;
		return this;
	}

	/**
	 * Set the description for the agent
	 * @param description Agent description
	 * @returns This builder instance for chaining
	 */
	withDescription(description: string): this {
		this.warnIfLocked("withDescription");
		this.config.description = description;
		return this;
	}

	/**
	 * Set the instruction for the agent
	 * @param instruction System instruction for the agent
	 * @returns This builder instance for chaining
	 */
	withInstruction(instruction: string): this {
		this.warnIfLocked("withInstruction");
		this.config.instruction = instruction;
		return this;
	}

	withInputSchema(schema: ZodSchema): this {
		this.warnIfLocked("withInputSchema");
		this.config.inputSchema = schema;
		return this;
	}

	withOutputSchema<T>(schema: ZodType<T>): AgentBuilderWithSchema<T, TMulti> {
		this.warnIfLocked("withOutputSchema");
		// Disallow setting an output schema directly on multi-agent aggregators
		if (this.agentType === "sequential" || this.agentType === "parallel") {
			const msg =
				"Output schemas cannot be applied to sequential or parallel agents. Define output schemas on each sub-agent instead.";
			this.logger.error(msg, {
				suggestion: "Apply outputSchema to each sub-agent individually.",
				context: {
					agentType: this.agentType,
				},
			});
			throw new Error(msg);
		}
		this.config.outputSchema = schema;
		return this as unknown as AgentBuilderWithSchema<T, TMulti>;
	}

	/**
	 * Add tools to the agent
	 * @param tools Tools to add to the agent
	 * @returns This builder instance for chaining
	 */
	withTools(...tools: BaseTool[]): this {
		this.warnIfLocked("withTools");
		this.config.tools = [...(this.config.tools || []), ...tools];
		return this;
	}

	/**
	 * Set the planner for the agent
	 * @param planner The planner to use
	 * @returns This builder instance for chaining
	 */
	withPlanner(planner: BasePlanner): this {
		this.warnIfLocked("withPlanner");
		this.config.planner = planner;
		return this;
	}

	/**
	 * Set the code executor for the agent
	 * @param codeExecutor The code executor to use for running code
	 * @returns This builder instance for chaining
	 */
	withCodeExecutor(codeExecutor: BaseCodeExecutor): this {
		this.warnIfLocked("withCodeExecutor");
		this.config.codeExecutor = codeExecutor;
		return this;
	}

	/**
	 * Set the output key for the agent
	 * @param outputKey The output key in session state to store the output of the agent
	 * @returns This builder instance for chaining
	 */
	withOutputKey(outputKey: string): this {
		this.warnIfLocked("withOutputKey");
		// Ignore for aggregator agent types
		if (this.agentType === "sequential" || this.agentType === "parallel") {
			this.logger.warn(
				"AgentBuilder: outputKey ignored for sequential/parallel aggregator",
				{
					suggestion: "Set outputKey on each sub-agent instead.",
					context: { attemptedOutputKey: outputKey, agentType: this.agentType },
				},
			);
			return this;
		}
		this.config.outputKey = outputKey;
		return this;
	}

	/**
	 * Add sub-agents to the agent
	 * @param subAgents Sub-agents to add to the agent
	 * @returns This builder instance for chaining
	 */
	withSubAgents(subAgents: BaseAgent[]): this {
		this.warnIfLocked("withSubAgents");
		this.config.subAgents = subAgents;
		return this;
	}

	/**
	 * Set the before agent callback
	 * @param callback Callback to invoke before agent execution
	 * @returns This builder instance for chaining
	 */
	withBeforeAgentCallback(callback: BeforeAgentCallback): this {
		this.warnIfLocked("withBeforeAgentCallback");
		this.config.beforeAgentCallback = callback;
		return this;
	}

	/**
	 * Set the after agent callback
	 * @param callback Callback to invoke after agent execution
	 * @returns This builder instance for chaining
	 */
	withAfterAgentCallback(callback: AfterAgentCallback): this {
		this.warnIfLocked("withAfterAgentCallback");
		this.config.afterAgentCallback = callback;
		return this;
	}

	/**
	 * Set the before model callback for LLM interaction
	 * @param callback Callback to invoke before calling the LLM
	 * @returns This builder instance for chaining
	 */
	withBeforeModelCallback(callback: BeforeModelCallback): this {
		this.warnIfLocked("withBeforeModelCallback");
		this.config.beforeModelCallback = callback;
		return this;
	}

	/**
	 * Set the after model callback for LLM interaction
	 * @param callback Callback to invoke after receiving LLM response
	 * @returns This builder instance for chaining
	 */
	withAfterModelCallback(callback: AfterModelCallback): this {
		this.warnIfLocked("withAfterModelCallback");
		this.config.afterModelCallback = callback;
		return this;
	}

	/**
	 * Set the before tool callback for tool execution
	 * @param callback Callback to invoke before running a tool
	 * @returns This builder instance for chaining
	 */
	withBeforeToolCallback(callback: BeforeToolCallback): this {
		this.warnIfLocked("withBeforeToolCallback");
		this.config.beforeToolCallback = callback;
		return this;
	}

	/**
	 * Set the after tool callback for tool execution
	 * @param callback Callback to invoke after running a tool
	 * @returns This builder instance for chaining
	 */
	withAfterToolCallback(callback: AfterToolCallback): this {
		this.warnIfLocked("withAfterToolCallback");
		this.config.afterToolCallback = callback;
		return this;
	}

	/**
	 * Convenience method to start building with an existing agent
	 * @param agent The agent instance to wrap
	 * @returns New AgentBuilder instance with agent set
	 */
	static withAgent(agent: BaseAgent): AgentBuilder<string, false> {
		return new AgentBuilder(agent.name || "default_agent").withAgent(agent);
	}

	/**
	 * Provide an already constructed agent instance. Further definition-mutating calls
	 * (model/tools/instruction/etc.) will be ignored with a dev warning.
	 */
	withAgent(agent: BaseAgent): this {
		this.existingAgent = agent;
		this.definitionLocked = true;
		if (this.config.name === "default_agent" && agent.name) {
			this.config.name = agent.name;
		}
		return this;
	}

	/**
	 * Configure as a sequential agent
	 * @param subAgents Sub-agents to execute in sequence
	 * @returns This builder instance for chaining
	 */
	asSequential(subAgents: BaseAgent[]): AgentBuilder<TOut, true> {
		if (this.definitionLocked) {
			this.logger.warn(
				"AgentBuilder: asSequential() ignored; builder locked by withAgent()",
				{
					suggestion: "Call asSequential() before withAgent().",
					context: { agentName: this.config.name },
				},
			);
			return this as unknown as AgentBuilder<TOut, true>;
		}
		this.agentType = "sequential";
		this.config.subAgents = subAgents;
		// Remove incompatible keys
		if (this.config.outputKey) {
			this.logger.warn(
				"AgentBuilder: outputKey ignored for sequential agent aggregator; removed",
				{
					suggestion: "Assign outputKey on individual sub-agents if needed.",
					context: { previousValue: this.config.outputKey },
				},
			);
			this.config.outputKey = undefined;
		}
		if (this.config.outputSchema) {
			this.logger.warn(
				"AgentBuilder: outputSchema cannot be applied to sequential aggregator; removed",
				{
					suggestion: "Apply schemas to sub-agents individually.",
				},
			);
			this.config.outputSchema = undefined;
		}
		return this as unknown as AgentBuilder<TOut, true>;
	}

	/**
	 * Configure as a parallel agent
	 * @param subAgents Sub-agents to execute in parallel
	 * @returns This builder instance for chaining
	 */
	asParallel(subAgents: BaseAgent[]): AgentBuilder<TOut, true> {
		if (this.definitionLocked) {
			this.logger.warn(
				"AgentBuilder: asParallel() ignored; builder locked by withAgent()",
				{
					suggestion: "Call asParallel() before withAgent().",
					context: { agentName: this.config.name },
				},
			);
			return this as unknown as AgentBuilder<TOut, true>;
		}
		this.agentType = "parallel";
		this.config.subAgents = subAgents;
		if (this.config.outputKey) {
			this.logger.warn(
				"AgentBuilder: outputKey ignored for parallel agent aggregator; removed",
				{
					suggestion: "Assign outputKey on individual sub-agents if needed.",
					context: { previousValue: this.config.outputKey },
				},
			);
			this.config.outputKey = undefined;
		}
		if (this.config.outputSchema) {
			this.logger.warn(
				"AgentBuilder: outputSchema cannot be applied to parallel aggregator; removed",
				{
					suggestion: "Apply schemas to sub-agents individually.",
				},
			);
			this.config.outputSchema = undefined;
		}
		return this as unknown as AgentBuilder<TOut, true>;
	}

	/**
	 * Configure as a loop agent
	 * @param subAgents Sub-agents to execute iteratively
	 * @param maxIterations Maximum number of iterations
	 * @returns This builder instance for chaining
	 */
	asLoop(subAgents: BaseAgent[], maxIterations = 3): this {
		this.warnIfLocked("asLoop");
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
		this.warnIfLocked("asLangGraph");
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
	withSessionService(
		service: BaseSessionService,
		options: SessionOptions = {},
	): this {
		this.sessionService = service;
		this.sessionOptions = {
			userId: options.userId || this.generateDefaultUserId(),
			appName: options.appName || this.generateDefaultAppName(),
			state: options.state,
			sessionId: options.sessionId,
		};
		return this;
	}

	/**
	 * Configure with an existing session instance
	 * @param session Existing session to use
	 * @returns This builder instance for chaining
	 * @throws Error if no session service has been configured via withSessionService()
	 */
	withSession(session: Session): this {
		// Require that withSessionService() was called first
		if (!this.sessionService) {
			const msg =
				"Session service must be configured before using withSession(). Call withSessionService() first, or use withQuickSession() for in-memory sessions.";
			this.logger.error(msg, {
				suggestion: "Invoke withSessionService() prior to withSession().",
			});
			throw new Error(msg);
		}

		// Update session options with the session details
		this.sessionOptions = {
			...this.sessionOptions,
			userId: session.userId,
			appName: session.appName,
			sessionId: session.id,
			state: session.state,
		};

		// Store the existing session to use directly in build()
		this.existingSession = session;
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
	 * Configure runtime behavior for runs
	 */
	withRunConfig(config: RunConfig | Partial<RunConfig>): this {
		this.runConfig =
			config instanceof RunConfig
				? config
				: new RunConfig({ ...(this.runConfig || {}), ...config });
		return this;
	}

	/**
	 * Configure event compaction for automatic history management
	 * @param config Event compaction configuration
	 * @returns This builder instance for chaining
	 * @example
	 * ```typescript
	 * const { runner } = await AgentBuilder
	 *   .create("assistant")
	 *   .withModel("gemini-2.5-flash")
	 *   .withEventsCompaction({
	 *     compactionInterval: 10,  // Compact every 10 invocations
	 *     overlapSize: 2,          // Include 2 prior invocations
	 *   })
	 *   .build();
	 * ```
	 */
	withEventsCompaction(config: EventsCompactionConfig): this {
		this.eventsCompactionConfig = config;
		return this;
	}

	/**
	 * Configure with an in-memory session with custom IDs
	 * Note: In-memory sessions are created automatically by default, use this only if you need custom appName/userId
	 * @param options Session configuration options (userId and appName)
	 * @returns This builder instance for chaining
	 */
	withQuickSession(options: SessionOptions = {}): this {
		return this.withSessionService(new InMemorySessionService(), options);
	}

	/**
	 * Build the agent and optionally create runner and session
	 * @returns Built agent with optional runner and session
	 */
	async build<T = TOut>(): Promise<BuiltAgent<T, TMulti>> {
		const agent = this.createAgent();
		let runner: EnhancedRunner<T, any> | undefined;
		let session: Session | undefined;

		// If no session service is provided, create a default in-memory session
		if (!this.sessionService) {
			this.withQuickSession();
		}

		if (this.sessionService && this.sessionOptions) {
			// Use existing session if provided, otherwise create a new one
			if (this.existingSession) {
				session = this.existingSession;
			} else {
				session = await this.sessionService.createSession(
					this.sessionOptions.appName!,
					this.sessionOptions.userId!,
					this.sessionOptions.state,
					this.sessionOptions.sessionId,
				);
			}

			const runnerConfig: RunnerConfig = {
				appName: this.sessionOptions.appName!,
				agent,
				sessionService: this.sessionService,
				memoryService: this.memoryService,
				artifactService: this.artifactService,
				eventsCompactionConfig: this.eventsCompactionConfig,
			};

			const baseRunner = new Runner(runnerConfig);

			// Create enhanced runner with simplified API
			runner = this.createEnhancedRunner<T>(baseRunner, session);
		}

		return {
			agent,
			runner: runner! as EnhancedRunner<T, TMulti>,
			session: session!,
			sessionService: this.sessionService!,
		} as BuiltAgent<T, TMulti>;
	}

	/**
	 * Type-safe build method for agents with output schemas
	 * Provides better type inference for the ask method return type
	 */
	async buildWithSchema<T>(): Promise<BuiltAgent<T, TMulti>> {
		const result = await this.build();
		return result as unknown as BuiltAgent<T, TMulti>;
	}

	/**
	 * Quick execution helper - build and run a message
	 * @param message Message to send to the agent (string or full message object)
	 * @returns Agent response
	 */
	async ask(
		message: string | FullMessage,
	): Promise<RunnerAskReturn<TOut, TMulti>> {
		const { runner } = await this.build();
		return runner.ask(message) as Promise<RunnerAskReturn<TOut, TMulti>>;
	}

	/**
	 * Create the appropriate agent type based on configuration
	 * @returns Created agent instance
	 */
	private createAgent(): BaseAgent {
		if (this.existingAgent) return this.existingAgent;
		switch (this.agentType) {
			case "llm": {
				if (!this.config.model) {
					const msg = "Model is required for LLM agent";
					this.logger.error(msg, {
						suggestion: "Call withModel() before build().",
					});
					throw new Error(msg);
				}

				const model = this.config.model;

				return new LlmAgent({
					name: this.config.name,
					model: model,
					description: this.config.description,
					instruction: this.config.instruction,
					tools: this.config.tools,
					planner: this.config.planner,
					codeExecutor: this.config.codeExecutor,
					subAgents: this.config.subAgents,
					beforeAgentCallback: this.config.beforeAgentCallback,
					afterAgentCallback: this.config.afterAgentCallback,
					beforeModelCallback: this.config.beforeModelCallback,
					afterModelCallback: this.config.afterModelCallback,
					beforeToolCallback: this.config.beforeToolCallback,
					afterToolCallback: this.config.afterToolCallback,
					memoryService: this.memoryService,
					artifactService: this.artifactService,
					outputKey: this.config.outputKey,
					sessionService: this.sessionService,
					inputSchema: this.config.inputSchema,
					outputSchema: this.config.outputSchema,
				});
			}
			case "sequential":
				if (
					!this.config.subAgents ||
					!Array.isArray(this.config.subAgents) ||
					this.config.subAgents.length === 0
				) {
					const msg = "Sub-agents required for sequential agent";
					this.logger.error(msg, {
						suggestion: "Provide at least one sub-agent.",
					});
					throw new Error(msg);
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
					const msg = "Sub-agents required for parallel agent";
					this.logger.error(msg, {
						suggestion: "Provide at least one sub-agent.",
					});
					throw new Error(msg);
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
					const msg = "Sub-agents required for loop agent";
					this.logger.error(msg, {
						suggestion: "Provide at least one sub-agent.",
					});
					throw new Error(msg);
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
					const msg = "Nodes and root node required for LangGraph agent";
					this.logger.error(msg, {
						suggestion: "Provide nodes[] and a valid rootNode string.",
					});
					throw new Error(msg);
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
	 * Create enhanced runner with simplified API and proper typing
	 * @param baseRunner The base runner instance
	 * @param session The session instance
	 * @returns Enhanced runner with simplified API
	 */
	private createEnhancedRunner<T>(
		baseRunner: Runner,
		session: Session,
	): EnhancedRunner<T, TMulti> {
		const sessionOptions = this.sessionOptions; // Capture sessionOptions in closure
		const outputSchema = this.config.outputSchema;
		const agentType = this.agentType; // capture agent type for aggregation logic
		const isMulti = agentType === "parallel" || agentType === "sequential";
		const subAgentNames = this.config.subAgents?.map((a) => a.name) || [];
		const runConfig = this.runConfig;

		return {
			__outputSchema: outputSchema,
			async ask(message: string | FullMessage | LlmRequest): Promise<any> {
				const newMessage: FullMessage =
					typeof message === "string"
						? { parts: [{ text: message }] }
						: typeof message === "object" && "contents" in message
							? { parts: message.contents[message.contents.length - 1].parts }
							: message;
				let combinedResponse = "";
				// Track per-agent incremental text
				const perAgentBuffers: Record<string, string> = {};
				// Track authors that produced any text (excluding 'user')
				const authors: Set<string> = new Set();

				if (!sessionOptions?.userId) {
					throw new Error("Session configuration is required");
				}

				for await (const event of baseRunner.runAsync({
					userId: sessionOptions.userId,
					sessionId: session.id,
					newMessage,
					runConfig,
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
							combinedResponse += content;
							const author = event.author || "";
							if (author && author !== "user") {
								authors.add(author);
								perAgentBuffers[author] =
									(perAgentBuffers[author] || "") + content;
							}
						}
					}
				}

				if (isMulti) {
					// Always return ordered array for multi-agent
					return subAgentNames.map((name) => ({
						agent: name,
						response: (perAgentBuffers[name] || "").trim(),
					}));
				}

				// Single-agent path with optional schema parsing
				if (outputSchema) {
					try {
						const parsed = JSON.parse(combinedResponse);
						return outputSchema.parse(parsed) as T;
					} catch (parseError) {
						try {
							return outputSchema.parse(combinedResponse) as T;
						} catch (validationError) {
							const message = `🚨 Failed to parse and validate LLM output against the schema. \n\n ℹ️ JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)} \n\n 🚧 Zod validation error: ${validationError instanceof Error ? validationError.message : String(validationError)} \n\n 📄 Raw output: ${combinedResponse}`;
							throw new Error(message);
						}
					}
				}

				return combinedResponse.trim() as T;
			},
			runAsync(params) {
				return baseRunner.runAsync({
					...params,
					runConfig: params.runConfig ?? runConfig,
				});
			},
			rewind(params) {
				return baseRunner.rewind(params);
			},
		};
	}
}
