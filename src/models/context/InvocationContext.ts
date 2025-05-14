// Invocation context module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the invocation context functionality from the Python SDK

import type { Session } from "node:inspector";
import type { Content } from "@google-cloud/vertexai";
import type { BaseAgent } from "../../agents";
import {
	type BaseArtifactService,
	InMemoryArtifactService,
} from "../../artifacts";
import { EventActions } from "../../events/event_actions";
import { InMemorySessionService } from "../../sessions";
import type { BaseSessionService } from "../../sessions/base_session_service";
import { State } from "../../sessions/state";
import type { RunConfig } from "../config/RunConfig";
import type { BaseMemoryService } from "../memory/MemoryService";
import type { TranscriptionEntry } from "../memory/TranscriptionEntry";
import type { ActiveStreamingTool } from "../request/ActiveStreamingTool";
import { LiveRequestQueue } from "../request/LiveRequestQueue";

/**
 * Context provided during agent invocation.
 */
export class InvocationContext {
	/**
	 * The agent being invoked.
	 */
	agent: BaseAgent;

	/**
	 * The configuration for this run.
	 */
	runConfig: RunConfig;

	/**
	 * The queue for live requests.
	 */
	requestQueue: LiveRequestQueue;

	/**
	 * The service for managing artifacts.
	 */
	artifactService: BaseArtifactService;

	/**
	 * The service for managing memory.
	 */
	memoryService: BaseMemoryService | null;

	/**
	 * The service for managing sessions.
	 */
	sessionService: BaseSessionService;

	/**
	 * The current session.
	 */
	session: Session | null = null;

	/**
	 * The content from the user.
	 */
	userContent: Content | null = null;

	/**
	 * The unique identifier for this invocation.
	 */
	invocationId: string;

	/**
	 * The branch for this invocation.
	 */
	branch: string | null = null;

	/**
	 * Flag to indicate if the invocation should end.
	 */
	endInvocation = false;

	/**
	 * The name of the application.
	 */
	appName: string;

	/**
	 * The ID of the user.
	 */
	userId: string;

	/**
	 * The running streaming tools of this invocation.
	 * Based on Python: active_streaming_tools: Optional[dict[str, ActiveStreamingTool]] = None
	 */
	activeStreamingTools?: Record<string, ActiveStreamingTool> | null;

	/**
	 * Caches necessary data for transcription.
	 * Based on Python: transcription_cache: Optional[list[TranscriptionEntry]] = None
	 */
	transcriptionCache?: TranscriptionEntry[] | null;

	/**
	 * Creates a new invocation context.
	 */
	constructor(options: {
		agent: BaseAgent;
		runConfig: RunConfig;
		requestQueue?: LiveRequestQueue;
		artifactService?: BaseArtifactService;
		memoryService?: BaseMemoryService | null;
		sessionService?: BaseSessionService;
		session?: Session | null;
		userContent?: Content | null;
		invocationId?: string;
		branch?: string | null;
		appName?: string;
		userId?: string;
		endInvocation?: boolean;
		activeStreamingTools?: Record<string, ActiveStreamingTool> | null;
		transcriptionCache?: TranscriptionEntry[] | null;
	}) {
		this.agent = options.agent;
		this.runConfig = options.runConfig;
		this.requestQueue = options.requestQueue || new LiveRequestQueue();
		this.artifactService =
			options.artifactService || new InMemoryArtifactService();
		this.memoryService = options.memoryService || null;
		this.sessionService =
			options.sessionService || new InMemorySessionService();
		this.session = options.session || null;
		this.userContent = options.userContent || null;
		this.invocationId = options.invocationId || generateInvocationId();
		this.branch = options.branch || null;
		this.appName = options.appName || this.agent.name;
		this.userId = options.userId || "default_user";
		this.endInvocation = options.endInvocation || false;
		this.activeStreamingTools = options.activeStreamingTools || null;
		this.transcriptionCache = options.transcriptionCache || null;
	}

	/**
	 * Tracks number of llm calls made.
	 * Based on Python: increment_llm_call_count
	 */
	incrementLlmCallCount(): void {
		// TODO: Implement actual cost management logic if needed
		// console.log('LLM call count incremented (placeholder)');
	}

	/**
	 * Creates a copy of this invocation context with modifications.
	 *
	 * @param modifications The modifications to apply to the context
	 * @returns A new invocation context with the modifications applied
	 */
	withModifications(
		modifications: Partial<{
			agent: BaseAgent;
			runConfig: RunConfig;
			requestQueue: LiveRequestQueue;
			artifactService: BaseArtifactService;
			memoryService: BaseMemoryService | null;
			sessionService: BaseSessionService;
			session: Session | null;
			userContent: Content | null;
			invocationId: string;
			branch: string | null;
			appName: string;
			userId: string;
			endInvocation: boolean;
			activeStreamingTools?: Record<string, ActiveStreamingTool> | null;
			transcriptionCache?: TranscriptionEntry[] | null;
		}>,
	): InvocationContext {
		return new InvocationContext({
			agent: modifications.agent || this.agent,
			runConfig: modifications.runConfig || this.runConfig,
			requestQueue: modifications.requestQueue || this.requestQueue,
			artifactService: modifications.artifactService || this.artifactService,
			memoryService:
				modifications.memoryService !== undefined
					? modifications.memoryService
					: this.memoryService,
			sessionService: modifications.sessionService || this.sessionService,
			session:
				modifications.session !== undefined
					? modifications.session
					: this.session,
			userContent:
				modifications.userContent !== undefined
					? modifications.userContent
					: this.userContent,
			invocationId: modifications.invocationId || this.invocationId,
			branch:
				modifications.branch !== undefined ? modifications.branch : this.branch,
			appName: modifications.appName || this.appName,
			userId: modifications.userId || this.userId,
			endInvocation:
				modifications.endInvocation !== undefined
					? modifications.endInvocation
					: this.endInvocation,
			activeStreamingTools:
				modifications.activeStreamingTools !== undefined
					? modifications.activeStreamingTools
					: this.activeStreamingTools,
			transcriptionCache:
				modifications.transcriptionCache !== undefined
					? modifications.transcriptionCache
					: this.transcriptionCache,
		});
	}
}

/**
 * Context provided during callback execution.
 */
export class CallbackContext {
	/**
	 * The invocation context for this callback.
	 */
	protected _invocationContext: InvocationContext;

	/**
	 * The actions for the event.
	 */
	protected _eventActions: EventActions;

	/**
	 * Creates a new callback context.
	 *
	 * @param invocationContext The invocation context for this callback
	 * @param eventActions The event actions
	 */
	constructor(
		invocationContext: InvocationContext,
		eventActions?: EventActions,
	) {
		this._invocationContext = invocationContext;
		this._eventActions = eventActions || new EventActions();
	}

	/**
	 * Gets the invocation context.
	 */
	get invocationContext(): InvocationContext {
		return this._invocationContext;
	}

	/**
	 * Gets the event actions.
	 */
	get eventActions(): EventActions {
		return this._eventActions;
	}

	/**
	 * Gets the agent from the invocation context.
	 */
	get agent(): BaseAgent {
		return this._invocationContext.agent;
	}

	/**
	 * Gets the run configuration from the invocation context.
	 */
	get runConfig(): RunConfig {
		return this._invocationContext.runConfig;
	}

	/**
	 * Gets the session from the invocation context.
	 */
	get session(): Session | null {
		return this._invocationContext.session;
	}

	/**
	 * Gets the state interface for the callback.
	 */
	get state(): State {
		// In a real implementation, this would be a proper State instance
		// For now, we provide a simplified interface that matches the Python version
		const state = new State();

		return state;
	}

	/**
	 * Checks if the callback context has state delta.
	 * This is used to determine if the event should be generated after callback execution.
	 *
	 * @returns Whether the callback context has state delta
	 */
	hasStateDelta(): boolean {
		// In a real implementation, this would check if the state has been modified
		// For now, we assume no state changes by default
		return this._eventActions.hasStateChanges();
	}
}

/**
 * A read-only view of the invocation context for safe data access.
 */
export class ReadonlyContext {
	/**
	 * The wrapped invocation context.
	 */
	private _context: InvocationContext;

	/**
	 * Creates a new read-only context.
	 *
	 * @param context The invocation context to wrap
	 */
	constructor(context: InvocationContext) {
		this._context = context;
	}

	/**
	 * Gets the agent from the invocation context.
	 */
	get agent(): BaseAgent {
		return this._context.agent;
	}

	/**
	 * Gets the run configuration from the invocation context.
	 */
	get runConfig(): RunConfig {
		return this._context.runConfig;
	}

	/**
	 * Gets the session from the invocation context.
	 */
	get session(): Session | null {
		return this._context.session;
	}

	/**
	 * Gets the user content from the invocation context.
	 */
	get userContent(): Content | null {
		return this._context.userContent;
	}

	/**
	 * Gets the application name from the invocation context.
	 */
	get appName(): string {
		return this._context.appName;
	}

	/**
	 * Gets the user ID from the invocation context.
	 */
	get userId(): string {
		return this._context.userId;
	}

	/**
	 * Gets the artifact service from the invocation context.
	 */
	get artifactService(): BaseArtifactService {
		return this._context.artifactService;
	}

	/**
	 * Gets the memory service from the invocation context.
	 */
	get memoryService(): BaseMemoryService | null {
		return this._context.memoryService;
	}
}

/**
 * Generates a unique identifier for invocation contexts.
 *
 * @returns A unique invocation ID
 */
export function generateInvocationId(): string {
	// Using a combination of timestamp and random string for uniqueness
	const timestamp = Date.now().toString(36);
	const randomStr = Math.random().toString(36).substring(2, 7);
	return `ctx-${timestamp}-${randomStr}`;
}
