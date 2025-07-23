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
import { InvocationContext } from "./invocation-context.js";
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
	outputKey?: string;
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
	 * Set the output key for storing agent results in session state
	 * @param outputKey The key to store the agent's output in session state
	 * @returns This builder instance for chaining
	 */
	withOutputKey(outputKey: string): this {
		this.config.outputKey = outputKey;
		return this;
	}

	/**
	 * Configure as a sequential agent
	 * @param subAgents Sub-agents to execute in sequence
	 * @returns This builder instance for chaining
	 */
	asSequential(subAgents: BaseAgent[]): this {
		this.agentType = "sequential";
		this.config.subAgents = this.autoGenerateOutputKeys(subAgents);
		return this;
	}

	/**
	 * Configure as a parallel agent
	 * @param subAgents Sub-agents to execute in parallel
	 * @returns This builder instance for chaining
	 */
	asParallel(subAgents: BaseAgent[]): this {
		this.agentType = "parallel";
		this.config.subAgents = this.autoGenerateOutputKeys(subAgents);
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
		this.config.subAgents = this.autoGenerateOutputKeys(subAgents);
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
		// Auto-generate output keys for LangGraph node agents
		this.config.nodes = nodes.map((node) => ({
			...node,
			agent: this.autoGenerateOutputKeys([node.agent])[0],
		}));
		this.config.rootNode = rootNode;
		return this;
	}

	/**
	 * Configure session service with optional smart defaults
	 * @param service Session service to use
	 * @param options Session configuration options (userId and appName)
	 * @returns This builder instance for chaining
	 */
	withSessionService(
		service: BaseSessionService,
		options: SessionOptions = {},
	): this {
		this.sessionConfig = {
			service,
			userId: options.userId || this.generateDefaultUserId(),
			appName: options.appName || this.generateDefaultAppName(),
		};
		return this;
	}

	/**
	 * Configure with an existing session
	 * @param session Existing session to use
	 * @returns This builder instance for chaining
	 */
	withSession(session: Session): this {
		// Ensure the session has proper structure
		const safeSession: Session = {
			...session,
			events: Array.isArray(session.events) ? session.events : [],
			state: session.state || {},
		};

		// Create a mock session service that returns the provided session
		const mockSessionService = {
			createSession: async () => safeSession,
			getSession: async () => safeSession,
			listSessions: async () => ({ sessions: [safeSession] }),
			deleteSession: async () => {},
			appendEvent: async (_: Session, event: Event) => event,
			updateSessionState: async () => {},
		} as unknown as BaseSessionService;

		this.sessionConfig = {
			service: mockSessionService,
			userId: session.userId,
			appName: session.appName,
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
		return this.withSessionService(new InMemorySessionService(), options);
	}

	/**
	 * Build the agent and optionally create runner and session
	 * @returns Built agent with optional runner and session
	 */
	async build(): Promise<BuiltAgent> {
		let agent = this.createAgent();
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

			// Apply session override to existing agent for multi-agent patterns
			// Skip LangGraph agents as they manage their own session flow
			if (session && this.agentType !== "llm" && this.agentType !== "langgraph") {
				agent = this.applySessionOverrideToAgent(agent, session);
			}

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
					outputKey: this.config.outputKey,
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
	 * Auto-generate output keys for sub-agents in workflow patterns
	 * Only generates keys for LlmAgents that don't already have an outputKey
	 * @param subAgents Array of sub-agents to process
	 * @returns Array of sub-agents with auto-generated output keys where needed
	 */
	private autoGenerateOutputKeys(subAgents: BaseAgent[]): BaseAgent[] {
		return subAgents.map((agent, index) => {
			// Only auto-generate for LlmAgents that don't already have an outputKey
			if (agent instanceof LlmAgent && !agent.outputKey) {
				// Create a new LlmAgent with auto-generated outputKey and clear parent
				return new LlmAgent({
					name: agent.name,
					model: agent.model,
					description: agent.description,
					instruction: agent.instruction,
					tools: agent.tools,
					planner: agent.planner,
					outputKey: `step_${index + 1}_result`, // Auto-generated key
					// Copy other public properties that might exist
					globalInstruction: agent.globalInstruction,
					generateContentConfig: agent.generateContentConfig,
					inputSchema: agent.inputSchema,
					outputSchema: agent.outputSchema,
					includeContents: agent.includeContents,
					disallowTransferToParent: agent.disallowTransferToParent,
					disallowTransferToPeers: agent.disallowTransferToPeers,
					codeExecutor: agent.codeExecutor,
				});
			}
			// Return a fresh copy of the agent to avoid parent conflicts
			return this.cloneAgent(agent);
		});
	}

	/**
	 * Create a fresh copy of an agent to avoid parent agent conflicts
	 * @param agent The agent to clone
	 * @returns A new agent instance without parent relationships
	 */
	private cloneAgent(agent: BaseAgent): BaseAgent {
		// For LlmAgent, create a new instance
		if (agent instanceof LlmAgent) {
			return new LlmAgent({
				name: agent.name,
				model: agent.model,
				description: agent.description,
				instruction: agent.instruction,
				tools: agent.tools,
				planner: agent.planner,
				outputKey: agent.outputKey,
				globalInstruction: agent.globalInstruction,
				generateContentConfig: agent.generateContentConfig,
				inputSchema: agent.inputSchema,
				outputSchema: agent.outputSchema,
				includeContents: agent.includeContents,
				disallowTransferToParent: agent.disallowTransferToParent,
				disallowTransferToPeers: agent.disallowTransferToPeers,
				codeExecutor: agent.codeExecutor,
			});
		}
		// For other agent types, we could add similar cloning logic if needed
		// For now, return the agent as-is and hope it doesn't have parent conflicts
		return agent;
	}

	/**
	 * Create a session-overridden agent wrapper
	 * @param originalAgent The original agent to wrap
	 * @param parentSession The session to use instead of the agent's own session
	 * @returns Wrapped agent that uses the parent session
	 */
	private createSessionOverriddenAgent(
		originalAgent: BaseAgent,
		parentSession: Session,
	): BaseAgent {
		// Create a proxy that intercepts runAsync calls to override the session
		return new Proxy(originalAgent, {
			get(target, prop, receiver) {
				if (prop === "runAsync") {
					return async function* (context: InvocationContext) {
						// Ensure the parent session has proper events array structure
						const safeParentSession: Session = {
							...parentSession,
							events: Array.isArray(parentSession.events)
								? parentSession.events
								: [],
						};

						// Override only the session in context, preserve everything else
						const overriddenContext = new InvocationContext({
							artifactService: context.artifactService,
							sessionService: context.sessionService,
							memoryService: context.memoryService,
							invocationId: context.invocationId,
							branch: context.branch,
							agent: target,
							userContent: context.userContent, // Preserve original user content
							session: safeParentSession, // Use safe parent session
							endInvocation: context.endInvocation,
							liveRequestQueue: context.liveRequestQueue,
							activeStreamingTools: context.activeStreamingTools,
							transcriptionCache: context.transcriptionCache,
							runConfig: context.runConfig,
						});
						yield* target.runAsync(overriddenContext);
					};
				}
				return Reflect.get(target, prop, receiver);
			},
		});
	}

	/**
	 * Apply session override to an existing agent without recreating it
	 * @param agent The agent to apply session override to
	 * @param parentSession The session to use for all sub-agents
	 * @returns The agent with session overrides applied
	 */
	private applySessionOverrideToAgent(agent: BaseAgent, parentSession: Session): BaseAgent {
		// For all multi-agent patterns, override their sub-agents with session-aware proxies
		if (agent.subAgents && agent.subAgents.length > 0) {
			const sessionOverriddenSubAgents = agent.subAgents.map((subAgent) =>
				this.createSessionOverriddenAgent(subAgent, parentSession)
			);
			
			// Override the subAgents property on the agent
			Object.defineProperty(agent, 'subAgents', {
				value: sessionOverriddenSubAgents,
				writable: false,
				enumerable: true,
				configurable: true,
			});
			
			// For LangGraph agents, we also need to update the internal nodes map
			if (agent instanceof LangGraphAgent) {
				// We need to override the private nodes Map through reflection
				const nodesMap = (agent as any).nodes as Map<string, LangGraphNode>;
				const newNodesMap = new Map<string, LangGraphNode>();
				
				// Update each node in the map with session-overridden agents
				for (const [nodeName, node] of nodesMap.entries()) {
					const overriddenAgent = sessionOverriddenSubAgents.find(
						(subAgent, index) => index === Array.from(nodesMap.values()).findIndex(n => n.agent === node.agent)
					) || node.agent;
					
					newNodesMap.set(nodeName, {
						...node,
						agent: overriddenAgent,
					});
				}
				
				// Replace the nodes map
				(agent as any).nodes = newNodesMap;
			}
		}
		
		return agent;
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
