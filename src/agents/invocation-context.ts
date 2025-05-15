import type { SessionService } from "../memory/services/session-service";
import { RunConfig } from "./run-config";
import type {
	BaseMemoryService,
	SearchMemoryOptions,
	SearchMemoryResponse,
} from "../memory/memory-service";
import type { Content } from "../models/llm-request";
import type { Session } from "..";

/**
 * Contextual data for a specific agent invocation
 */
export class InvocationContext {
	/**
	 * Unique session ID for the current conversation
	 */
	sessionId: string;

	/**
	 * Current conversation history using Content/Part model
	 */
	contents: Content[];

	/**
	 * Run configuration
	 */
	config: RunConfig;

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
	constructor(
		options: {
			sessionId?: string;
			contents?: Content[];
			config?: RunConfig;
			userId?: string;
			appName?: string;
			memoryService?: BaseMemoryService;
			sessionService?: SessionService;
			metadata?: Record<string, any>;
		} = {},
	) {
		this.sessionId = options.sessionId || this.generateSessionId();
		this.contents = options.contents || [];
		this.config = options.config || new RunConfig();
		this.userId = options.userId;
		this.appName = options.appName;
		this.memoryService = options.memoryService;
		this.sessionService = options.sessionService;
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
	 * Adds a Content object to the conversation history
	 */
	addContent(content: Content): void {
		this.contents.push(content);
	}

	/**
	 * Creates a new context with the same configuration but empty conversation history
	 */
	createChildContext(): InvocationContext {
		return new InvocationContext({
			sessionId: this.sessionId,
			config: this.config,
			userId: this.userId,
			appName: this.appName,
			memoryService: this.memoryService,
			sessionService: this.sessionService,
			metadata: { ...this.metadata },
			contents: [],
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

		let session = await this.sessionService.getSession(this.sessionId);

		if (!session) {
			session = await this.sessionService.createSession(
				this.userId,
				this.metadata,
			);
			this.sessionId = session.id;
		}

		session.messages = [...this.contents] as any;
		session.metadata = { ...this.metadata };
		session.updatedAt = new Date();

		this.variables.forEach((value, key) => {
			session!.state.set(key, value);
		});

		await this.sessionService.updateSession(session);

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

		const searchOptions = {
			...options,
			sessionId: options?.sessionId || this.sessionId,
		};

		return await this.memoryService.searchMemory(query, searchOptions);
	}
}
