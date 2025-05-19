import type {
	BaseMemoryService,
	SearchMemoryOptions,
	SearchMemoryResponse,
} from "../memory/base-memory-service";
import type { Event } from "../events/event";
import type { SessionService } from "../sessions/base-session-service";
import type { Session } from "../sessions/session";
import { RunConfig } from "./run-config";
import type { BaseArtifactService } from "../artifacts/base-artifact-service";
import type { BaseAgent } from "./base-agent";

/**
 * Contextual data for a specific agent invocation
 */
export class InvocationContext {
	/**
	 * Unique ID for this specific invocation
	 */
	invocationId: string;

	/**
	 * Unique session ID for the current conversation
	 */
	sessionId: string;

	/**
	 * Current conversation history as events
	 */
	events: Event[];

	/**
	 * Run configuration
	 */
	runConfig: RunConfig;

	/**
	 * User identifier associated with the session
	 */
	userId?: string;

	/**
	 * Application name (for multi-app environments)
	 */
	appName?: string;

	/**
	 * Memory service for long-term storage
	 */
	memoryService?: BaseMemoryService;

	/**
	 * Session service for session management
	 */
	sessionService?: SessionService;

	/**
	 * Artifact service for managing artifacts
	 */
	artifactService?: BaseArtifactService;

	/**
	 * The agent currently being executed in this context.
	 */
	agent?: BaseAgent;

	/**
	 * The name of the agent currently being executed.
	 */
	currentAgentName?: string;

	/**
	 * Additional context metadata
	 */
	metadata: Record<string, any>;

	/**
	 * Variables stored in the context
	 */
	private variables: Map<string, any>;

	/**
	 * In-memory storage for node execution results
	 */
	memory: Map<string, any> = new Map<string, any>();

	/**
	 * Constructor for InvocationContext
	 */
	constructor(options: {
		invocationId: string;
		sessionId?: string;
		events?: Event[];
		runConfig?: RunConfig;
		userId?: string;
		appName?: string;
		memoryService?: BaseMemoryService;
		sessionService?: SessionService;
		artifactService?: BaseArtifactService;
		agent?: BaseAgent;
		currentAgentName?: string;
		metadata?: Record<string, any>;
	}) {
		this.invocationId = options.invocationId;
		this.sessionId = options.sessionId || this.generateSessionId();
		this.events = options.events || [];
		this.runConfig = options.runConfig || new RunConfig();
		this.userId = options.userId;
		this.appName = options.appName;
		this.memoryService = options.memoryService;
		this.sessionService = options.sessionService;
		this.artifactService = options.artifactService;
		this.agent = options.agent;
		this.currentAgentName = options.currentAgentName;
		this.metadata = options.metadata || {};
		this.variables = new Map<string, any>();
	}

	/**
	 * Generates a unique session ID
	 */
	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Sets a variable in the context
	 */
	setVariable(name: string, value: any): void {
		this.variables.set(name, value);
	}

	/**
	 * Gets a variable from the context
	 */
	getVariable<T>(name: string, defaultValue?: T): T | undefined {
		return (
			this.variables.has(name) ? this.variables.get(name) : defaultValue
		) as T | undefined;
	}

	/**
	 * Adds an event to the conversation history
	 */
	addEvent(event: Event): void {
		this.events.push(event);
	}

	/**
	 * Creates a new context with the same configuration but empty event history
	 */
	createChildContext(): InvocationContext {
		return new InvocationContext({
			invocationId: this.invocationId,
			sessionId: this.sessionId,
			runConfig: this.runConfig,
			userId: this.userId,
			appName: this.appName,
			memoryService: this.memoryService,
			sessionService: this.sessionService,
			artifactService: this.artifactService,
			metadata: { ...this.metadata },
		});
	}

	/**
	 * Loads a session from the session service
	 * @returns The loaded session or undefined if not found
	 */
	async loadSession(): Promise<Session | undefined> {
		if (!this.sessionService) {
			return undefined;
		}

		return await this.sessionService.getSession(this.sessionId);
	}

	/**
	 * Saves the current conversation to a session
	 * @returns The saved session
	 */
	async saveSession(): Promise<Session | undefined> {
		if (!this.sessionService || !this.userId) {
			return undefined;
		}

		// Get existing session or create a new one
		let session = await this.sessionService.getSession(this.sessionId);

		if (!session) {
			// Create a new session
			session = await this.sessionService.createSession(
				this.userId,
				this.metadata,
			);
			this.sessionId = session.id;
		}

		// Update session with current events
		session.events = [...this.events];
		session.metadata = { ...this.metadata };
		session.updatedAt = new Date();

		// Save state variables
		for (const [key, value] of this.variables.entries()) {
			session?.state.set(key, value);
		}

		// Update the session
		await this.sessionService.updateSession(session);

		// If we have a memory service, add to memory
		if (this.memoryService) {
			await this.memoryService.addSessionToMemory(session);
		}

		return session;
	}

	/**
	 * Searches memory for relevant information
	 * @param query The search query
	 * @param options Search options
	 * @returns Search results or empty response if no memory service
	 */
	async searchMemory(
		query: string,
		options?: SearchMemoryOptions,
	): Promise<SearchMemoryResponse> {
		if (!this.memoryService) {
			return { memories: [] };
		}

		// If no session ID provided in options, use the current session ID
		const searchOptions = {
			...options,
			sessionId: options?.sessionId || this.sessionId,
		};

		return await this.memoryService.searchMemory(query, searchOptions);
	}
}

// Utility function to generate InvocationContext IDs, if needed externally
// Though runner currently generates its own.
export function generateInvocationContextId(): string {
	return `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
