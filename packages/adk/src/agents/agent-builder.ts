import { Logger } from "@adk/logger/index.js";
import type { LlmRequest } from "@adk/models";
import type { Content, Part } from "@google/genai";
import { type LanguageModel, generateId } from "ai";
import type { BaseArtifactService } from "../artifacts/base-artifact-service.js";
import type { BaseCodeExecutor } from "../code-executors/base-code-executor.js";
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
	codeExecutor?: BaseCodeExecutor;
	subAgents?: BaseAgent[];
	beforeAgentCallback?: BeforeAgentCallback;
	afterAgentCallback?: AfterAgentCallback;
	maxIterations?: number;
	nodes?: LangGraphNode[];
	rootNode?: string;
	outputKey?: string;
	inputSchema?: import("zod").ZodSchema;
	outputSchema?: import("zod").ZodSchema;
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
export interface EnhancedRunner<T = string> {
	ask(message: string | FullMessage | LlmRequest): Promise<T>;
	runAsync(params: {
		userId: string;
		sessionId: string;
		newMessage: FullMessage;
	}): AsyncIterable<Event>;
	__outputSchema?: import("zod").ZodSchema;
}

/**
 * Built agent result containing the agent and runner/session
 */
export interface BuiltAgent<T = string> {
	agent: BaseAgent;
	runner: EnhancedRunner<T>;
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
 * AgentBuilder with typed output schema
 */
export interface AgentBuilderWithSchema<T>
	extends Omit<AgentBuilder, "build" | "ask"> {
	build(): Promise<BuiltAgent<T>>;
	buildWithSchema<U = T>(): Promise<BuiltAgent<U>>;
	ask(message: string | FullMessage): Promise<T>;
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
export class AgentBuilder {
	private config: AgentBuilderConfig;
	private sessionService?: BaseSessionService;
	private sessionOptions?: SessionOptions;
	private memoryService?: BaseMemoryService;
	private artifactService?: BaseArtifactService;
	private agentType: AgentType = "llm";
	private existingSession?: Session;
	private existingAgent?: BaseAgent; // If provided, reuse directly
	private definitionLocked = false; // Lock further definition mutation after withAgent
	private warnedMethods: Set<string> = new Set();
	private logger = new Logger({ name: "AgentBuilder" });

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

	withInputSchema(schema: import("zod").ZodSchema): this {
		this.warnIfLocked("withInputSchema");
		this.config.inputSchema = schema;
		return this;
	}

	withOutputSchema<T>(
		schema: import("zod").ZodType<T>,
	): AgentBuilderWithSchema<T> {
		this.warnIfLocked("withOutputSchema");
		this.config.outputSchema = schema;

		// For sequential and parallel agents, we still apply schema to individual LlmAgents
		// but disable their individual validation during execution. The container agent
		// will handle final validation of the combined response.
		if (this.agentType === "sequential" && this.config.subAgents) {
			this.applyOutputSchemaToAllLlmAgents(this.config.subAgents, true);
		} else if (this.agentType === "parallel" && this.config.subAgents) {
			this.applyOutputSchemaToAllLlmAgents(this.config.subAgents, true);
		}

		return this as unknown as AgentBuilderWithSchema<T>;
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

		// If an output schema is already configured and this is a container agent,
		// make sure new sub-agents receive the schema and disable their own validation.
		if (
			this.config.outputSchema &&
			(this.agentType === "sequential" || this.agentType === "parallel")
		) {
			this.applyOutputSchemaToAllLlmAgents(subAgents, true);
		}
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
	 * Provide an already constructed agent instance. Further definition-mutating calls
	 * (model/tools/instruction/etc.) will be ignored with a dev warning.
	 */
	withAgent(agent: BaseAgent): this {
		this.existingAgent = agent;
		this.definitionLocked = true;
		// Sync name if default
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
	asSequential(subAgents: BaseAgent[]): this {
		this.warnIfLocked("asSequential");
		this.agentType = "sequential";
		this.config.subAgents = subAgents;

		// If an output schema was already set before configuring as sequential,
		// ensure it's applied consistently to LlmAgent sub-agents and
		// their individual validation is disabled.
		if (this.config.outputSchema) {
			this.applyOutputSchemaToAllLlmAgents(subAgents, true);
		}

		return this;
	}

	/**
	 * Configure as a parallel agent
	 * @param subAgents Sub-agents to execute in parallel
	 * @returns This builder instance for chaining
	 */
	asParallel(subAgents: BaseAgent[]): this {
		this.warnIfLocked("asParallel");
		this.agentType = "parallel";
		this.config.subAgents = subAgents;

		// If an output schema was already set before configuring as parallel,
		// ensure it's applied consistently to LlmAgent sub-agents and
		// their individual validation is disabled.
		if (this.config.outputSchema) {
			this.applyOutputSchemaToAllLlmAgents(subAgents, true);
		}

		return this;
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
			throw new Error(
				"Session service must be configured before using withSession(). " +
					"Call withSessionService() first, or use withQuickSession() for in-memory sessions.",
			);
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
	async build<T = string>(): Promise<BuiltAgent<T>> {
		const agent = this.createAgent();
		let runner: EnhancedRunner<T> | undefined;
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
			};

			const baseRunner = new Runner(runnerConfig);

			// Create enhanced runner with simplified API
			runner = this.createEnhancedRunner<T>(baseRunner, session, agent);
		}

		return { agent, runner, session } as BuiltAgent<T>;
	}

	/**
	 * Type-safe build method for agents with output schemas
	 * Provides better type inference for the ask method return type
	 */
	async buildWithSchema<T>(): Promise<BuiltAgent<T>> {
		const result = await this.build();
		return result as BuiltAgent<T>;
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
		if (this.existingAgent) return this.existingAgent;
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
					codeExecutor: this.config.codeExecutor,
					subAgents: this.config.subAgents,
					beforeAgentCallback: this.config.beforeAgentCallback,
					afterAgentCallback: this.config.afterAgentCallback,
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
					throw new Error("Sub-agents required for sequential agent");
				}
				return new SequentialAgent({
					name: this.config.name,
					description: this.config.description || "",
					subAgents: this.config.subAgents,
					outputSchema: this.config.outputSchema,
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
					outputSchema: this.config.outputSchema,
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
	 * Create enhanced runner with simplified API and proper typing
	 * @param baseRunner The base runner instance
	 * @param session The session instance
	 * @returns Enhanced runner with simplified API
	 */
	private createEnhancedRunner<T>(
		baseRunner: Runner,
		session: Session,
		rootAgent: BaseAgent,
	): EnhancedRunner<T> {
		const sessionOptions = this.sessionOptions; // Capture sessionOptions in closure
		const outputSchema = this.config.outputSchema;

		return {
			__outputSchema: outputSchema,
			async ask(message: string | FullMessage | LlmRequest): Promise<T> {
				const newMessage: FullMessage =
					typeof message === "string"
						? { parts: [{ text: message }] }
						: typeof message === "object" && "contents" in message
							? { parts: message.contents[message.contents.length - 1].parts }
							: message;
				let aggregatedText = "";
				let lastFinalTextAnyAuthor = "";
				let finalTextFromRootAgent = "";

				if (!sessionOptions?.userId) {
					throw new Error("Session configuration is required");
				}

				for await (const event of baseRunner.runAsync({
					userId: sessionOptions.userId,
					sessionId: session.id,
					newMessage,
				})) {
					if (event.content?.parts && Array.isArray(event.content.parts)) {
						const contentText = event.content.parts
							.map(
								(part) =>
									(part && typeof part === "object" && "text" in part
										? (part.text as string)
										: "") || "",
							)
							.join("");
						if (contentText) {
							aggregatedText += contentText;
						}

						// Track the last final assistant message texts
						if (event.isFinalResponse() && contentText.trim()) {
							lastFinalTextAnyAuthor = contentText.trim();
							if (event.author === rootAgent.name) {
								finalTextFromRootAgent = contentText.trim();
							}
						}
					}
				}

				// If we have an output schema, the response should already be validated by the processor
				// and formatted as JSON. Try to parse it, otherwise return the raw response.
				if (outputSchema) {
					try {
						const candidate =
							finalTextFromRootAgent ||
							lastFinalTextAnyAuthor ||
							aggregatedText;
						const parsed = JSON.parse(candidate);
						return outputSchema.parse(parsed) as T;
					} catch (parseError) {
						// If parsing fails, try to validate the raw response
						try {
							const candidate =
								finalTextFromRootAgent ||
								lastFinalTextAnyAuthor ||
								aggregatedText;
							return outputSchema.parse(candidate) as T;
						} catch (validationError) {
							// If both fail, return the raw response as type T (casting)
							const candidate =
								finalTextFromRootAgent ||
								lastFinalTextAnyAuthor ||
								aggregatedText;
							return candidate.trim() as T;
						}
					}
				}

				const fallback =
					finalTextFromRootAgent || lastFinalTextAnyAuthor || aggregatedText;
				return fallback.trim() as T;
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

	/**
	 * Apply the configured output schema to all LlmAgents in the subAgents array
	 * @param subAgents Array of sub-agents to search through
	 * @param disableIndividualValidation If true, disables individual schema validation for container agents
	 */
	private applyOutputSchemaToAllLlmAgents(
		subAgents: BaseAgent[],
		disableIndividualValidation = false,
	): void {
		let appliedCount = 0;
		for (const agent of subAgents) {
			if (agent instanceof LlmAgent) {
				// Apply the output schema to this LlmAgent
				agent.outputSchema = this.config.outputSchema;

				// For container agents, disable individual validation
				if (disableIndividualValidation) {
					agent.disableIndividualSchemaValidation = true;
				}

				appliedCount++;
				this.logger.debug(
					`Applied output schema to LlmAgent: ${agent.name}${disableIndividualValidation ? " (individual validation disabled)" : ""}`,
				);
			}
		}
		if (appliedCount > 0) {
			this.logger.debug(
				`Applied output schema to ${appliedCount} LlmAgent(s) in configuration${disableIndividualValidation ? " (individual validation disabled)" : ""}`,
			);
		}
	}

	/**
	 * Warn (once per method) if the definition has been locked by withAgent().
	 */
	private warnIfLocked(method: string): void {
		if (!this.definitionLocked) return;
		if (this.warnedMethods.has(method)) return;
		this.warnedMethods.add(method);
		if (process.env.NODE_ENV !== "production") {
			const msg = `AgentBuilder: attempted to call ${method} after withAgent(); ignoring. (Wrap the agent first OR configure before withAgent).`;
			if (this.logger && typeof this.logger.warn === "function") {
				this.logger.warn(msg);
			} else {
				console.warn(msg);
			}
		}
	}
}
