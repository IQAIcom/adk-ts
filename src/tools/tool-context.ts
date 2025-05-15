import type { AuthHandler } from "../auth/auth-handler";
import type {
	SearchMemoryOptions,
	SearchMemoryResponse,
} from "../memory/memory-service";
import type { Content } from "../models/llm-request";
import type { InvocationContext } from "../agents/invocation-context";
import type { Session } from "..";

/**
 * Context for tool execution
 */
export interface IToolContext {
	/**
	 * Name of the tool being executed
	 */
	toolName: string;

	/**
	 * ID of the tool call
	 */
	toolId: string;

	/**
	 * Additional parameters for the tool
	 */
	parameters: Record<string, any>;

	/**
	 * Gets a parameter value
	 */
	getParameter<T>(name: string, defaultValue?: T): T | undefined;

	/**
	 * Sets a parameter value
	 */
	setParameter(name: string, value: any): void;
}

/**
 * Context for tool execution
 */
export class ToolContext implements IToolContext {
	/**
	 * The parent invocation context
	 */
	private invocationContext: InvocationContext;

	/**
	 * Authentication handler for the tool
	 */
	auth?: AuthHandler;

	/**
	 * Additional parameters for the tool
	 */
	parameters: Record<string, any>;

	/**
	 * Tool name
	 */
	toolName = "";

	/**
	 * Tool ID
	 */
	toolId = "";

	/**
	 * Variables stored in the context
	 */
	private _variables: Map<string, any>;

	/**
	 * Constructor for ToolContext
	 */
	constructor(options: {
		invocationContext: InvocationContext;
		auth?: AuthHandler;
		parameters?: Record<string, any>;
	}) {
		this.invocationContext = options.invocationContext;
		this.auth = options.auth;
		this.parameters = options.parameters || {};
		this._variables = new Map<string, any>();
	}

	/**
	 * Gets a parameter value
	 */
	getParameter<T>(name: string, defaultValue?: T): T | undefined {
		return name in this.parameters
			? (this.parameters[name] as T)
			: defaultValue;
	}

	/**
	 * Sets a parameter value
	 */
	setParameter(name: string, value: any): void {
		this.parameters[name] = value;
	}

	// Delegate to invocation context
	get sessionId(): string {
		return this.invocationContext.sessionId;
	}
	get contents() {
		return this.invocationContext.contents;
	}
	get config() {
		return this.invocationContext.config;
	}
	get userId() {
		return this.invocationContext.userId;
	}
	get appName() {
		return this.invocationContext.appName;
	}
	get memoryService() {
		return this.invocationContext.memoryService;
	}
	get sessionService() {
		return this.invocationContext.sessionService;
	}
	get metadata() {
		return this.invocationContext.metadata;
	}

	// Variable management
	get variables(): Map<string, any> {
		return this._variables;
	}
	setVariable(name: string, value: any): void {
		this._variables.set(name, value);
	}
	getVariable<T>(name: string, defaultValue?: T): T | undefined {
		return (
			this._variables.has(name) ? this._variables.get(name) : defaultValue
		) as T | undefined;
	}

	// Delegate session operations
	addContent(content: Content): void {
		this.invocationContext.addContent(content);
	}
	async loadSession(): Promise<Session | undefined> {
		return this.invocationContext.loadSession();
	}
	async saveSession(): Promise<Session | undefined> {
		return this.invocationContext.saveSession();
	}
	async searchMemory(
		query: string,
		options?: SearchMemoryOptions,
	): Promise<SearchMemoryResponse> {
		return this.invocationContext.searchMemory(query, options);
	}
}
