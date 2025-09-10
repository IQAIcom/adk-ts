import { Logger } from "@adk/logger";
import type { GenerateContentConfig } from "@google/genai";
import type { LanguageModel } from "ai";
import type { z } from "zod";
import type { BaseArtifactService } from "../artifacts/base-artifact-service";
import type { BaseCodeExecutor } from "../code-executors/base-code-executor";
import { Event } from "../events/event";
import { AutoFlow, type BaseLlmFlow, SingleFlow } from "../flows/llm-flows";
import type { BaseMemoryService } from "../memory/base-memory-service";
import { AiSdkLlm } from "../models/ai-sdk";
import { BaseLlm } from "../models/base-llm";
import { LLMRegistry } from "../models/llm-registry";
import type { LlmRequest } from "../models/llm-request";
import type { LlmResponse } from "../models/llm-response";
import type { BasePlanner } from "../planners/base-planner";
import type { BaseSessionService } from "../sessions/base-session-service";
import type { BaseTool } from "../tools/base/base-tool";
import { FunctionTool } from "../tools/function/function-tool";
import type { ToolContext } from "../tools/tool-context";
import {
	type AfterAgentCallback,
	BaseAgent,
	type BeforeAgentCallback,
} from "./base-agent";
import type { CallbackContext } from "./callback-context";
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
 * Single before model callback type
 */
export type SingleBeforeModelCallback = (
	callbackContext: CallbackContext,
	llmRequest: LlmRequest,
) => LlmResponse | null | Promise<LlmResponse | null>;

/**
 * Before model callback type (single or array)
 */
export type BeforeModelCallback =
	| SingleBeforeModelCallback
	| SingleBeforeModelCallback[];

/**
 * Single after model callback type
 */
export type SingleAfterModelCallback = (
	callbackContext: CallbackContext,
	llmResponse: LlmResponse,
) => LlmResponse | null | Promise<LlmResponse | null>;

/**
 * After model callback type (single or array)
 */
export type AfterModelCallback =
	| SingleAfterModelCallback
	| SingleAfterModelCallback[];

/**
 * Single before tool callback type
 */
export type SingleBeforeToolCallback = (
	tool: BaseTool,
	args: Record<string, any>,
	toolContext: ToolContext,
) => Record<string, any> | null | Promise<Record<string, any> | null>;

/**
 * Before tool callback type (single or array)
 */
export type BeforeToolCallback =
	| SingleBeforeToolCallback
	| SingleBeforeToolCallback[];

/**
 * Single after tool callback type
 */
export type SingleAfterToolCallback = (
	tool: BaseTool,
	args: Record<string, any>,
	toolContext: ToolContext,
	toolResponse: Record<string, any>,
) => Record<string, any> | null | Promise<Record<string, any> | null>;

/**
 * After tool callback type (single or array)
 */
export type AfterToolCallback =
	| SingleAfterToolCallback
	| SingleAfterToolCallback[];

/**
 * Configuration for LlmAgent
 */
export interface LlmAgentConfig<T extends BaseLlm = BaseLlm> {
	/**
	 * Name of the agent
	 */
	name: string;

	/**
	 * Description of the agent
	 */
	description: string;

	/**
	 * Sub-agents that this agent can delegate to
	 */
	subAgents?: BaseAgent[];

	/**
	 * Callback or list of callbacks to be invoked before the agent run
	 */
	beforeAgentCallback?: BeforeAgentCallback;

	/**
	 * Callback or list of callbacks to be invoked after the agent run
	 */
	afterAgentCallback?: AfterAgentCallback;

	/**
	 * The LLM model to use
	 * When not set, the agent will inherit the model from its ancestor
	 */
	model?: string | T | LanguageModel;

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
	inputSchema?: z.ZodSchema;

	/**
	 * The output schema when agent replies
	 * NOTE: when this is set, agent can ONLY reply and CANNOT use any tools
	 */
	outputSchema?: z.ZodSchema;

	/**
	 * Callback or list of callbacks to be called before calling the LLM
	 */
	beforeModelCallback?: BeforeModelCallback;

	/**
	 * Callback or list of callbacks to be called after calling the LLM
	 */
	afterModelCallback?: AfterModelCallback;

	/**
	 * Callback or list of callbacks to be called before calling a tool
	 */
	beforeToolCallback?: BeforeToolCallback;

	/**
	 * Callback or list of callbacks to be called after calling a tool
	 */
	afterToolCallback?: AfterToolCallback;
}

/**
 * LLM-based Agent
 */
export class LlmAgent<T extends BaseLlm = BaseLlm> extends BaseAgent {
	/**
	 * The model to use for the agent
	 * When not set, the agent will inherit the model from its ancestor
	 */
	public model: string | T | LanguageModel;

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
	public inputSchema?: z.ZodSchema;

	/**
	 * The output schema when agent replies
	 */
	public outputSchema?: z.ZodSchema;

	/**
	 * Callback or list of callbacks to be called before calling the LLM
	 */
	public beforeModelCallback?: BeforeModelCallback;

	/**
	 * Callback or list of callbacks to be called after calling the LLM
	 */
	public afterModelCallback?: AfterModelCallback;

	/**
	 * Callback or list of callbacks to be called before calling a tool
	 */
	public beforeToolCallback?: BeforeToolCallback;

	/**
	 * Callback or list of callbacks to be called after calling a tool
	 */
	public afterToolCallback?: AfterToolCallback;

	protected logger = new Logger({ name: "LlmAgent" });

	/**
	 * Constructor for LlmAgent
	 */
	constructor(config: LlmAgentConfig<T>) {
		super({
			name: config.name,
			description: config.description,
			subAgents: config.subAgents,
			beforeAgentCallback: config.beforeAgentCallback,
			afterAgentCallback: config.afterAgentCallback,
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
		this.beforeModelCallback = config.beforeModelCallback;
		this.afterModelCallback = config.afterModelCallback;
		this.beforeToolCallback = config.beforeToolCallback;
		this.afterToolCallback = config.afterToolCallback;

		// Validate output schema configuration
		this.validateOutputSchemaConfig();
	}

	/**
	 * The resolved model field as BaseLLM
	 * This method is only for use by Agent Development Kit
	 */
	get canonicalModel(): BaseLlm {
		// For string model name
		if (typeof this.model === "string") {
			if (this.model) {
				// model is non-empty str
				return LLMRegistry.newLLM(this.model);
			}
		} else if (this.model instanceof BaseLlm) {
			return this.model;
		} else if (this.model) {
			// For LanguageModel
			return new AiSdkLlm(this.model);
		}

		// find model from ancestors
		let ancestorAgent = this.parentAgent;
		while (ancestorAgent !== null && ancestorAgent !== undefined) {
			if (ancestorAgent instanceof LlmAgent) {
				return ancestorAgent.canonicalModel;
			}
			ancestorAgent = ancestorAgent.parentAgent;
		}

		throw new Error(
			`No model found for agent "${this.name}". Please specify a model directly on this agent using the 'model' property`,
		);
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
	 * Gets the canonical before model callbacks as an array
	 */
	get canonicalBeforeModelCallbacks(): SingleBeforeModelCallback[] {
		if (!this.beforeModelCallback) {
			return [];
		}
		if (Array.isArray(this.beforeModelCallback)) {
			return this.beforeModelCallback;
		}
		return [this.beforeModelCallback];
	}

	/**
	 * Gets the canonical after model callbacks as an array
	 */
	get canonicalAfterModelCallbacks(): SingleAfterModelCallback[] {
		if (!this.afterModelCallback) {
			return [];
		}
		if (Array.isArray(this.afterModelCallback)) {
			return this.afterModelCallback;
		}
		return [this.afterModelCallback];
	}

	/**
	 * Gets the canonical before tool callbacks as an array
	 */
	get canonicalBeforeToolCallbacks(): SingleBeforeToolCallback[] {
		if (!this.beforeToolCallback) {
			return [];
		}
		if (Array.isArray(this.beforeToolCallback)) {
			return this.beforeToolCallback;
		}
		return [this.beforeToolCallback];
	}

	/**
	 * Gets the canonical after tool callbacks as an array
	 */
	get canonicalAfterToolCallbacks(): SingleAfterToolCallback[] {
		if (!this.afterToolCallback) {
			return [];
		}
		if (Array.isArray(this.afterToolCallback)) {
			return this.afterToolCallback;
		}
		return [this.afterToolCallback];
	}

	/**
	 * Validates output schema configuration
	 * This matches the Python implementation's __check_output_schema
	 */
	private validateOutputSchemaConfig(): void {
		if (!this.outputSchema) {
			return;
		}

		// Historically we enforced a strict "reply-only" mode when outputSchema
		// was provided (disabling transfers and tools). To allow tools and agent
		// transfers to run while still validating the final response against the
		// schema, we avoid throwing or forcibly flipping transfer flags here.
		// Instead, we warn the user if the agent is configured in a mixed mode
		// and defer application of the output schema to response post-processing
		// when runtime behaviors (tool calls / transfers) are present.

		if (!this.disallowTransferToParent || !this.disallowTransferToPeers) {
			this.logger.warn(
				`Agent ${this.name}: outputSchema is set while transfer flags allow transfers. The output schema will be applied in response post-processing to preserve tool-calling and transfer behavior.`,
			);
		}

		if (this.subAgents && this.subAgents.length > 0) {
			this.logger.warn(
				`Agent ${this.name}: outputSchema is set and subAgents are present. Agent transfers to sub-agents will remain enabled; the schema will be validated after transfers/tools complete.`,
			);
		}

		if (this.tools && this.tools.length > 0) {
			this.logger.warn(
				`Agent ${this.name}: outputSchema is set and tools are configured. Tools will be callable; the output schema will be applied during response post-processing.`,
			);
		}
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
		// Skip if the event was authored by some other agent (e.g. current agent
		// transferred to another agent)
		if (event.author !== this.name) {
			this.logger.debug(
				`Skipping output save for agent ${this.name}: event authored by ${event.author}`,
			);
			return;
		}

		if (this.outputKey && event.isFinalResponse() && event.content?.parts) {
			let result: any = event.content.parts
				.map((part) => part.text || "")
				.join("");

			if (this.outputSchema) {
				// If the result from the final chunk is just whitespace or empty,
				// it means this is an empty final chunk of a stream.
				// Do not attempt to parse it as JSON.
				if (!result.trim()) {
					return;
				}

				try {
					const parsed = JSON.parse(result);
					result = this.outputSchema.parse(parsed);
				} catch (error) {
					this.logger.error("Failed to validate output with schema:", error);
					throw new Error(
						`Output validation failed: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}

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
