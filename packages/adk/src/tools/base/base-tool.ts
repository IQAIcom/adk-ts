import { Logger } from "@adk/logger";
import type { FunctionDeclaration, LlmRequest } from "@adk/models";
import type { Tool } from "@google/genai";
import type { ToolContext } from "../tool-context";

/**
 * Configuration for tool initialization
 */
export interface ToolConfig {
	/**
	 * Name of the tool
	 */
	name: string;

	/**
	 * Description of the tool
	 */
	description: string;

	/**
	 * Whether the tool is a long running operation, which typically returns a
	 * resource id first and finishes the operation later.
	 */
	isLongRunning?: boolean;

	/**
	 * Whether the tool execution should be retried on failure
	 */
	shouldRetryOnFailure?: boolean;

	/**
	 * Maximum retry attempts
	 */
	maxRetryAttempts?: number;
}

/**
 * API variant types
 */
export type ApiVariant = "google" | "openai" | "anthropic";

/**
 * The base class for all tools
 */
export abstract class BaseTool {
	/**
	 * Name of the tool
	 */
	name: string;

	/**
	 * Description of the tool
	 */
	description: string;

	/**
	 * Whether the tool is a long running operation, which typically returns a
	 * resource id first and finishes the operation later.
	 */
	isLongRunning: boolean;

	/**
	 * Whether the tool execution should be retried on failure
	 */
	shouldRetryOnFailure: boolean;

	/**
	 * Maximum retry attempts
	 */
	maxRetryAttempts: number;

	/**
	 * Base delay for retry in ms (will be used with exponential backoff)
	 */
	baseRetryDelay = 1000;

	/**
	 * Maximum delay for retry in ms
	 */
	maxRetryDelay = 10000;

	protected logger = new Logger({ name: "BaseTool" });

	/**
	 * Constructor for BaseTool
	 */
	constructor(config: ToolConfig) {
		this.name = config.name;
		this.description = config.description;
		this.isLongRunning = config.isLongRunning || false;
		this.shouldRetryOnFailure = config.shouldRetryOnFailure || false;
		this.maxRetryAttempts = config.maxRetryAttempts || 3;

		// Validate tool name format
		if (!/^[a-zA-Z0-9_]+$/.test(this.name)) {
			throw new Error(
				`Invalid tool name: "${this.name}". Tool names must contain only alphanumeric characters and underscores.`,
			);
		}

		// Validate description
		if (!this.description || this.description.length < 3) {
			throw new Error(
				`Tool description for "${this.name}" is too short. Provide a meaningful description.`,
			);
		}
	}

	/**
	 * Gets the OpenAPI specification of this tool in the form of a FunctionDeclaration
	 *
	 * NOTE:
	 * - Required if subclass uses the default implementation of processLlmRequest
	 *   to add function declaration to LLM request.
	 * - Otherwise, can return null, e.g. for a built-in GoogleSearch tool.
	 *
	 * @returns The FunctionDeclaration of this tool, or null if it doesn't need to be
	 *          added to LlmRequest.config.
	 */
	getDeclaration(): FunctionDeclaration | null {
		return null;
	}

	/**
	 * Validates the arguments against the schema in the function declaration
	 * @param args Arguments to validate
	 * @returns True if arguments are valid
	 */
	validateArguments(args: Record<string, any>): boolean {
		// Get the function declaration
		const declaration = this.getDeclaration();
		if (!declaration || !declaration.parameters) {
			return true; // No validation possible
		}

		// Check required parameters
		const required = declaration.parameters.required || [];
		for (const param of required) {
			if (!(param in args)) {
				console.error(
					`Missing required parameter "${param}" for tool "${this.name}"`,
				);
				return false;
			}
		}

		// Basic type validation could be added here in the future
		return true;
	}

	/**
	 * Runs the tool with the given arguments and context
	 *
	 * NOTE:
	 * - Required if this tool needs to run at the client side.
	 * - Otherwise, can be skipped, e.g. for a built-in GoogleSearch tool.
	 *
	 * @param args The LLM-filled arguments
	 * @param context The context of the tool
	 * @returns The result of running the tool
	 */
	async runAsync(
		args: Record<string, any>,
		context: ToolContext,
	): Promise<any> {
		throw new Error(`${this.constructor.name} runAsync is not implemented`);
	}

	/**
	 * Processes the outgoing LLM request for this tool.
	 *
	 * Use cases:
	 * - Most common use case is adding this tool to the LLM request.
	 * - Some tools may just preprocess the LLM request before it's sent out.
	 *
	 * @param toolContext The context of the tool
	 * @param llmRequest The outgoing LLM request, mutable by this method
	 */
	async processLlmRequest(
		_toolContext: ToolContext,
		llmRequest: LlmRequest,
	): Promise<void> {
		const functionDeclaration = this.getDeclaration();
		if (!functionDeclaration) {
			return;
		}

		// Add this tool to the tools dictionary
		llmRequest.toolsDict[this.name] = this;

		// Find existing tool with function declarations
		const toolWithFunctionDeclarations =
			this.findToolWithFunctionDeclarations(llmRequest);

		if (toolWithFunctionDeclarations) {
			// Add to existing tool
			if (!toolWithFunctionDeclarations.functionDeclarations) {
				toolWithFunctionDeclarations.functionDeclarations = [];
			}

			// Deduplicate by function name to avoid provider errors like
			// "Duplicate function declaration found: <name>"
			const alreadyExists =
				toolWithFunctionDeclarations.functionDeclarations.some(
					(fd: any) => fd?.name === functionDeclaration.name,
				);
			if (alreadyExists) {
				return;
			}
			toolWithFunctionDeclarations.functionDeclarations.push(
				functionDeclaration,
			);
		} else {
			// Create new tool configuration
			if (!llmRequest.config) {
				llmRequest.config = {};
			}
			if (!llmRequest.config.tools) {
				llmRequest.config.tools = [];
			}
			llmRequest.config.tools.push({
				functionDeclarations: [functionDeclaration],
			});
		}
	}

	/**
	 * Gets the API variant for this tool
	 */
	protected get apiVariant(): ApiVariant {
		// Default implementation - can be overridden by subclasses
		return "google";
	}

	/**
	 * Executes the tool with error handling and retries
	 *
	 * @param args Arguments for the tool
	 * @param context Tool execution context
	 * @returns Result of the tool execution or error information
	 */
	async safeExecute(
		args: Record<string, any>,
		context: ToolContext,
	): Promise<any> {
		// Validate arguments
		if (!this.validateArguments(args)) {
			return {
				error: "Invalid arguments",
				message: "The provided arguments do not match the tool's requirements.",
			};
		}

		let lastError: Error | null = null;
		let attempts = 0;

		// Attempt execution with retries if configured
		while (
			attempts <= (this.shouldRetryOnFailure ? this.maxRetryAttempts : 0)
		) {
			try {
				if (attempts > 0) {
					this.logger.debug(
						`Retrying tool ${this.name} (attempt ${attempts} of ${this.maxRetryAttempts})...`,
					);

					const delay = Math.min(
						this.baseRetryDelay * 2 ** (attempts - 1) + Math.random() * 1000,
						this.maxRetryDelay,
					);

					await new Promise((resolve) => setTimeout(resolve, delay));
				}

				const result = await this.runAsync(args, context);
				return { result };
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				console.error(`Error executing tool ${this.name}:`, lastError.message);
				attempts++;
			}
		}

		// If we get here, all attempts failed
		return {
			error: "Execution failed",
			message: lastError?.message || "Unknown error occurred",
			tool: this.name,
		};
	}

	/**
	 * Helper method to find a tool with function declarations in the LLM request
	 */
	private findToolWithFunctionDeclarations(
		llmRequest: LlmRequest,
	): Tool | null {
		if (!llmRequest.config || !llmRequest.config.tools) {
			return null;
		}
		const toolWithFunctionDeclaration =
			(llmRequest.config.tools.find(
				(tool) =>
					"functionDeclarations" in tool &&
					tool.functionDeclarations &&
					tool.functionDeclarations.length > 0,
			) as Tool) || null;

		return toolWithFunctionDeclaration;
	}
}
