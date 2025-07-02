import { Logger } from "@adk/helpers/logger";
import type { GenerateContentConfig } from "@google/genai";
import type { BaseArtifactService } from "../artifacts/base-artifact-service";
import type { BaseCodeExecutor } from "../code-executors/base-code-executor";
import { Event } from "../events/event";
import { AutoFlow, type BaseLlmFlow, SingleFlow } from "../flows/llm-flows";
import type { BaseMemoryService } from "../memory/base-memory-service";
import type { BaseLlm } from "../models/base-llm";
import { LLMRegistry } from "../models/llm-registry";
import type { BasePlanner } from "../planners/base-planner";
import type { BaseSessionService } from "../sessions/base-session-service";
import type { BaseTool } from "../tools/base/base-tool";
import { FunctionTool } from "../tools/function/function-tool";
import { BaseAgent } from "./base-agent";
import type { InvocationContext } from "./invocation-context";
import type { ReadonlyContext } from "./readonly-context";

/**
 * Type for instruction providers that can be functions
 */
export type InstructionProvider = (
	ctx: ReadonlyContext,
) => string | Promise<string>;

/**
 * Union type for tools (supporting functions, tools, and toolsets)
 */
export type ToolUnion = BaseTool | ((...args: any[]) => any);

/**
 * Configuration for LlmAgent
 */
export interface LlmAgentConfig {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * The LLM model to use
	 * When not set, the agent will inherit the model from its ancestor
	 */
	model?: string | BaseLlm;

	/**
	 * Instructions for the LLM model, guiding the agent's behavior
	 */
	instruction?: string | InstructionProvider;

	/**
	 * Instructions for all the agents in the entire agent tree
	 * ONLY the global_instruction in root agent will take effect
	 */
	globalInstruction?: string | InstructionProvider;

	/**
	 * Tools available to this agent
	 */
	tools?: ToolUnion[];

	/**
	 * Code executor for this agent
	 */
	codeExecutor?: BaseCodeExecutor;

	/**
	 * Disallows LLM-controlled transferring to the parent agent
	 */
	disallowTransferToParent?: boolean;

	/**
	 * Disallows LLM-controlled transferring to the peer agents
	 */
	disallowTransferToPeers?: boolean;

	/**
	 * Whether to include contents in the model request
	 */
	includeContents?: "default" | "none";

	/**
	 * The output key in session state to store the output of the agent
	 */
	outputKey?: string;

	/**
	 * Instructs the agent to make a plan and execute it step by step
	 */
	planner?: BasePlanner;

	/**
	 * Memory service for long-term storage and retrieval
	 */
	memoryService?: BaseMemoryService;

	/**
	 * Session service for managing conversations
	 */
	sessionService?: BaseSessionService;

	/**
	 * Artifact service for file storage and management
	 */
	artifactService?: BaseArtifactService;

	/**
	 * User ID for the session
	 */
	userId?: string;

	/**
	 * Application name
	 */
	appName?: string;

	/**
	 * Additional content generation configurations
	 * NOTE: not all fields are usable, e.g. tools must be configured via `tools`,
	 * thinking_config must be configured via `planner` in LlmAgent.
	 */
	generateContentConfig?: GenerateContentConfig;

	/**
	 * The input schema when agent is used as a tool
	 */
	inputSchema?: any; // Schema type - depends on specific implementation

	/**
	 * The output schema when agent replies
	 * NOTE: when this is set, agent can ONLY reply and CANNOT use any tools
	 */
	outputSchema?: any; // Schema type - depends on specific implementation
}

/**
 * LLM-based Agent
 */
export class LlmAgent extends BaseAgent {
	/**
	 * The model to use for the agent
	 * When not set, the agent will inherit the model from its ancestor
	 */
	public model: string | BaseLlm;

	/**
	 * Instructions for the LLM model, guiding the agent's behavior
	 */
	public instruction: string | InstructionProvider;

	/**
	 * Instructions for all the agents in the entire agent tree
	 * ONLY the global_instruction in root agent will take effect
	 */
	public globalInstruction: string | InstructionProvider;

	/**
	 * Tools available to this agent
	 */
	public tools: ToolUnion[];

	/**
	 * Code executor for this agent
	 */
	public codeExecutor?: BaseCodeExecutor;

	/**
	 * Disallows LLM-controlled transferring to the parent agent
	 */
	public disallowTransferToParent: boolean;

	/**
	 * Disallows LLM-controlled transferring to the peer agents
	 */
	public disallowTransferToPeers: boolean;

	/**
	 * Whether to include contents in the model request
	 */
	public includeContents: "default" | "none";

	/**
	 * The output key in session state to store the output of the agent
	 */
	public outputKey?: string;

	/**
	 * Instructs the agent to make a plan and execute it step by step
	 */
	public planner?: BasePlanner;

	/**
	 * Memory service for long-term storage and retrieval
	 */
	private memoryService?: BaseMemoryService;

	/**
	 * Session service for managing conversations
	 */
	private sessionService?: BaseSessionService;

	/**
	 * Artifact service for file storage and management
	 */
	private artifactService?: BaseArtifactService;

	/**
	 * User ID for the session
	 */
	private userId?: string;

	/**
	 * Application name
	 */
	private appName?: string;

	/**
	 * Additional content generation configurations
	 */
	public generateContentConfig?: GenerateContentConfig;

	/**
	 * The input schema when agent is used as a tool
	 */
	public inputSchema?: any; // Schema type - depends on specific implementation

	/**
	 * The output schema when agent replies
	 */
	public outputSchema?: any; // Schema type - depends on specific implementation

	private logger = new Logger({ name: "LlmAgent" });

	/**
	 * Constructor for LlmAgent
	 */
	constructor(config: LlmAgentConfig) {
		super({
			name: config.name,
			description: config.description,
		});

		this.model = config.model || "";
		this.instruction = config.instruction || "";
		this.globalInstruction = config.globalInstruction || "";
		this.tools = config.tools || [];
		this.codeExecutor = config.codeExecutor;
		this.disallowTransferToParent = config.disallowTransferToParent || false;
		this.disallowTransferToPeers = config.disallowTransferToPeers || false;
		this.includeContents = config.includeContents || "default";
		this.outputKey = config.outputKey;
		this.planner = config.planner;
		this.memoryService = config.memoryService;
		this.sessionService = config.sessionService;
		this.artifactService = config.artifactService;
		this.userId = config.userId;
		this.appName = config.appName;
		this.generateContentConfig = config.generateContentConfig;
		this.inputSchema = config.inputSchema;
		this.outputSchema = config.outputSchema;
	}

	/**
	 * The resolved model field as BaseLLM
	 * This method is only for use by Agent Development Kit
	 */
	get canonicalModel(): BaseLlm {
		if (typeof this.model !== "string") {
			return this.model;
		}

		if (this.model) {
			// model is non-empty str
			return LLMRegistry.newLLM(this.model);
		}

		// find model from ancestors
		let ancestorAgent = this.parentAgent;
		while (ancestorAgent !== null) {
			if (ancestorAgent instanceof LlmAgent) {
				return ancestorAgent.canonicalModel;
			}
			ancestorAgent = ancestorAgent.parentAgent;
		}

		throw new Error(`No model found for ${this.name}.`);
	}

	/**
	 * The resolved instruction field to construct instruction for this agent
	 * This method is only for use by Agent Development Kit
	 */
	async canonicalInstruction(ctx: ReadonlyContext): Promise<[string, boolean]> {
		if (typeof this.instruction === "string") {
			return [this.instruction, false];
		}

		const instruction = await this.instruction(ctx);
		return [instruction, true];
	}

	/**
	 * The resolved global_instruction field to construct global instruction
	 * This method is only for use by Agent Development Kit
	 */
	async canonicalGlobalInstruction(
		ctx: ReadonlyContext,
	): Promise<[string, boolean]> {
		if (typeof this.globalInstruction === "string") {
			return [this.globalInstruction, false];
		}

		const globalInstruction = await this.globalInstruction(ctx);
		return [globalInstruction, true];
	}

	/**
	 * The resolved tools field as a list of BaseTool based on the context
	 * This method is only for use by Agent Development Kit
	 */
	async canonicalTools(ctx?: ReadonlyContext): Promise<BaseTool[]> {
		const resolvedTools: BaseTool[] = [];

		for (const toolUnion of this.tools) {
			if (typeof toolUnion === "function") {
				// Convert function to FunctionTool
				const functionTool = new FunctionTool(toolUnion);
				resolvedTools.push(functionTool);
			} else {
				// Assume it's a BaseTool
				resolvedTools.push(toolUnion as BaseTool);
			}
		}

		return resolvedTools;
	}

	/**
	 * Gets the appropriate LLM flow for this agent
	 * This matches the Python implementation's _llm_flow property
	 */
	private get llmFlow(): BaseLlmFlow {
		if (
			this.disallowTransferToParent &&
			this.disallowTransferToPeers &&
			!this.subAgents?.length
		) {
			return new SingleFlow();
		}

		return new AutoFlow();
	}

	/**
	 * Saves the model output to state if needed
	 * This matches the Python implementation's __maybe_save_output_to_state
	 */
	private maybeSaveOutputToState(event: Event): void {
		if (this.outputKey && event.isFinalResponse() && event.content?.parts) {
			const result = event.content.parts
				.map((part) => part.text || "")
				.join("");

			if (result) {
				// Set state delta - this would need proper EventActions handling
				if (!event.actions.stateDelta) {
					event.actions.stateDelta = {};
				}
				event.actions.stateDelta[this.outputKey] = result;
			}
		}
	}

	/**
	 * Core logic to run this agent via text-based conversation
	 * This matches the Python implementation's _run_async_impl
	 */
	protected async *runAsyncImpl(
		context: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		this.logger.debug(`Starting LlmAgent execution for "${this.name}"`);

		try {
			// Delegate to the LLM flow (matching Python implementation)
			for await (const event of this.llmFlow.runAsync(context)) {
				this.maybeSaveOutputToState(event);
				yield event;
			}
		} catch (error) {
			this.logger.error("Error in LlmAgent execution:", error);

			const errorEvent = new Event({
				invocationId: context.invocationId,
				author: this.name,
				branch: context.branch,
				content: {
					parts: [
						{
							text: `Error: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
				},
			});

			errorEvent.errorCode = "AGENT_EXECUTION_ERROR";
			errorEvent.errorMessage =
				error instanceof Error ? error.message : String(error);

			yield errorEvent;
		}
	}
}

/**
 * Type alias to match Python's Agent = LlmAgent
 */
export { LlmAgent as Agent };
