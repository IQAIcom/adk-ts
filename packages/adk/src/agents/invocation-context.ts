import type { Content } from "@google/genai";
import type { SpanContext } from "@opentelemetry/api";
import type { BaseArtifactService } from "../artifacts/base-artifact-service";
import type { BaseMemoryService } from "../memory/base-memory-service";
import type { PluginManager } from "../plugins/plugin-manager";
import type { BaseSessionService } from "../sessions/base-session-service";
import type { Session } from "../sessions/session";
import type { ActiveStreamingTool } from "./active-streaming-tool";
import type { BaseAgent } from "./base-agent";
import { ContextCacheConfig } from "./context-cache-config";
import type { LiveRequestQueue } from "./live-request-queue";
import type { RunConfig } from "./run-config";
import type { TranscriptionEntry } from "./transcription-entry";

export type SpanCounters = { llm: number; tool: number; agent: number };

/**
 * Transfer context for multi-agent workflows
 * Tracks the chain of agent transfers for telemetry
 */
export interface TransferContext {
	/** Array of agent names in transfer order */
	transferChain: string[];
	/** Current depth in transfer chain (0 = root) */
	transferDepth: number;
	/** Name of the root agent that started the chain */
	rootAgentName: string;
	/** Span context of the root agent for linking */
	rootSpanContext?: SpanContext;
	/** Span context of the previous agent in the chain */
	previousSpanContext?: SpanContext;
}

/**
 * Error thrown when the number of LLM calls exceed the limit.
 */
export class LlmCallsLimitExceededError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LlmCallsLimitExceededError";
	}
}

/**
 * A container to keep track of the cost of invocation.
 *
 * While we don't expect the metrics captured here to be a direct
 * representative of monetary cost incurred in executing the current
 * invocation, they in some ways have an indirect effect.
 */
class InvocationCostManager {
	/**
	 * A counter that keeps track of number of llm calls made.
	 */
	private _numberOfLlmCalls = 0;

	/**
	 * Increments _numberOfLlmCalls and enforces the limit.
	 */
	incrementAndEnforceLlmCallsLimit(runConfig?: RunConfig): void {
		// We first increment the counter and then check the conditions.
		this._numberOfLlmCalls += 1;

		if (
			runConfig &&
			runConfig.maxLlmCalls > 0 &&
			this._numberOfLlmCalls > runConfig.maxLlmCalls
		) {
			// We only enforce the limit if the limit is a positive number.
			throw new LlmCallsLimitExceededError(
				`Max number of llm calls limit of \`${runConfig.maxLlmCalls}\` exceeded`,
			);
		}
	}
}

/**
 * Generates a new invocation context ID
 */
export function newInvocationContextId(): string {
	return `e-${crypto.randomUUID()}`;
}

/**
 * An invocation context represents the data of a single invocation of an agent.
 *
 * An invocation:
 *   1. Starts with a user message and ends with a final response.
 *   2. Can contain one or multiple agent calls.
 *   3. Is handled by runner.run_async().
 *
 * An invocation runs an agent until it does not request to transfer to another
 * agent.
 *
 * An agent call:
 *   1. Is handled by agent.run().
 *   2. Ends when agent.run() ends.
 *
 * An LLM agent call is an agent with a BaseLLMFlow.
 * An LLM agent call can contain one or multiple steps.
 *
 * An LLM agent runs steps in a loop until:
 *   1. A final response is generated.
 *   2. The agent transfers to another agent.
 *   3. The end_invocation is set to true by any callbacks or tools.
 *
 * A step:
 *   1. Calls the LLM only once and yields its response.
 *   2. Calls the tools and yields their responses if requested.
 *
 * The summarization of the function response is considered another step, since
 * it is another llm call.
 *
 * A step ends when it's done calling llm and tools, or if the end_invocation
 * is set to true at any time.
 *
 *
 *     ┌─────────────────────── invocation ──────────────────────────┐
 *     ┌──────────── llm_agent_call_1 ────────────┐ ┌─ agent_call_2 ─┐
 *     ┌──── step_1 ────────┐ ┌───── step_2 ──────┐
 *     [llm_generate] [execute_tool] [llm_generate] [transfer]
 *
 */
export class InvocationContext {
	readonly artifactService?: BaseArtifactService;
	readonly sessionService: BaseSessionService;
	readonly memoryService?: BaseMemoryService;

	/**
	 * The plugin manager for this invocation context.
	 */
	readonly pluginManager: PluginManager;

	/**
	 * Optional configuration controlling context caching behavior for this invocation.
	 *
	 * When present, enables reuse of cached LLM context across agent calls and
	 * sub-agents within the same invocation (and potentially across invocations,
	 * depending on cache policy). When undefined, context caching is disabled.
	 *
	 * This config is typically inherited from the app-level configuration and
	 * propagated to all child invocation contexts.
	 */
	readonly contextCacheConfig?: ContextCacheConfig;

	/**
	 * The id of this invocation context. Readonly.
	 */
	readonly invocationId: string;

	/**
	 * The branch of the invocation context.
	 *
	 * The format is like agent_1.agent_2.agent_3, where agent_1 is the parent of
	 * agent_2, and agent_2 is the parent of agent_3.
	 *
	 * Branch is used when multiple sub-agents shouldn't see their peer agents'
	 * conversation history.
	 */
	readonly branch?: string;

	/**
	 * The current agent of this invocation context. Readonly.
	 */
	agent: BaseAgent;

	/**
	 * The user content that started this invocation. Readonly.
	 */
	readonly userContent?: Content;

	/**
	 * The current session of this invocation context. Readonly.
	 */
	readonly session: Session;

	/**
	 * Whether to end this invocation.
	 *
	 * Set to True in callbacks or tools to terminate this invocation.
	 */
	endInvocation = false;

	/**
	 * The queue to receive live requests.
	 */
	liveRequestQueue?: LiveRequestQueue;

	/**
	 * The running streaming tools of this invocation.
	 */
	activeStreamingTools?: Record<string, ActiveStreamingTool>;

	/**
	 * Caches necessary, data audio or contents, that are needed by transcription.
	 */
	transcriptionCache?: TranscriptionEntry[];

	/**
	 * Configurations for live agents under this invocation.
	 */
	runConfig?: RunConfig;

	/**
	 * Transfer context for multi-agent workflows
	 * Tracks agent transfer chain for telemetry
	 */
	transferContext?: TransferContext;

	/**
	 * A container to keep track of different kinds of costs incurred as a part
	 * of this invocation.
	 */
	private readonly _invocationCostManager: InvocationCostManager =
		new InvocationCostManager();
	private readonly _spanCounters: SpanCounters;

	/**
	 * Constructor for InvocationContext
	 */
	constructor(options: {
		artifactService?: BaseArtifactService;
		sessionService: BaseSessionService;
		memoryService?: BaseMemoryService;
		pluginManager: PluginManager;
		invocationId?: string;
		branch?: string;
		agent: BaseAgent;
		userContent?: Content;
		session: Session;
		endInvocation?: boolean;
		liveRequestQueue?: LiveRequestQueue;
		activeStreamingTools?: Record<string, ActiveStreamingTool>;
		transcriptionCache?: TranscriptionEntry[];
		runConfig?: RunConfig;
		contextCacheConfig?: ContextCacheConfig;
		transferContext?: TransferContext;
		spanCounters?: SpanCounters;
	}) {
		this.artifactService = options.artifactService;
		this.sessionService = options.sessionService;
		this.memoryService = options.memoryService;
		this.pluginManager = options.pluginManager;
		this.invocationId = options.invocationId || newInvocationContextId();
		this.branch = options.branch;
		this.agent = options.agent;
		this.userContent = options.userContent;
		this.session = options.session;
		this.endInvocation = options.endInvocation || false;
		this.liveRequestQueue = options.liveRequestQueue;
		this.activeStreamingTools = options.activeStreamingTools;
		this.transcriptionCache = options.transcriptionCache;
		this.runConfig = options.runConfig;
		this.contextCacheConfig = options.contextCacheConfig;
		this.transferContext = options.transferContext;
		this._spanCounters = options.spanCounters ?? {
			llm: 0,
			tool: 0,
			agent: 0,
		};
	}

	/**
	 * App name from the session
	 */
	get appName(): string {
		return this.session.appName;
	}

	/**
	 * User ID from the session
	 */
	get userId(): string {
		return this.session.userId;
	}

	/**
	 * Tracks number of llm calls made.
	 *
	 * @throws {LlmCallsLimitExceededError} If number of llm calls made exceed the set threshold.
	 */
	incrementLlmCallCount(): void {
		this._invocationCostManager.incrementAndEnforceLlmCallsLimit(
			this.runConfig,
		);
	}

	/**
	 * Returns the next LLM span index for this invocation.
	 */
	nextLlmSpanIndex(): number {
		this._spanCounters.llm += 1;
		return this._spanCounters.llm;
	}

	/**
	 * Returns the next tool span index for this invocation.
	 */
	nextToolSpanIndex(): number {
		this._spanCounters.tool += 1;
		return this._spanCounters.tool;
	}

	/**
	 * Returns the next agent span index for this invocation.
	 */
	nextAgentSpanIndex(): number {
		this._spanCounters.agent += 1;
		return this._spanCounters.agent;
	}

	/**
	 * Exposes shared span counters for child contexts.
	 */
	getSpanCounters(): SpanCounters {
		return this._spanCounters;
	}

	/**
	 * Creates a child invocation context for a sub-agent
	 */
	createChildContext(agent: BaseAgent): InvocationContext {
		return new InvocationContext({
			artifactService: this.artifactService,
			sessionService: this.sessionService,
			memoryService: this.memoryService,
			pluginManager: this.pluginManager, // Share the same plugin manager
			invocationId: this.invocationId, // Keep same invocation ID
			branch: this.branch ? `${this.branch}.${agent.name}` : agent.name, // Update branch
			agent: agent, // Update to the new agent
			userContent: this.userContent,
			session: this.session,
			endInvocation: this.endInvocation,
			liveRequestQueue: this.liveRequestQueue,
			activeStreamingTools: this.activeStreamingTools,
			transcriptionCache: this.transcriptionCache,
			runConfig: this.runConfig,
			contextCacheConfig: this.contextCacheConfig,
			transferContext: this.transferContext, // Propagate transfer context
			spanCounters: this._spanCounters,
		});
	}
}
