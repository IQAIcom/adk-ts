import { Logger } from "@adk/logger";
import { type Part, Type } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { InvocationContext } from "../../agents/invocation-context";
import type { LlmAgent } from "../../agents/llm-agent";
import type { Event } from "../../events/event";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Type for agents that can be used as tools
 */
export type BaseAgentType = LlmAgent;

/**
 * Type guard to check if an agent is an LlmAgent
 */
function isLlmAgent(agent: BaseAgentType): agent is LlmAgent {
	return true;
}

/**
 * Configuration for AgentTool
 */
export interface AgentToolConfig {
	/**
	 * Name of the tool
	 */
	name: string;

	/**
	 * Description of the tool
	 */
	description?: string;

	/**
	 * The agent that will be used as a tool
	 */
	agent: BaseAgentType;

	/**
	 * Optional function declaration schema override
	 */
	functionDeclaration?: FunctionDeclaration;

	/**
	 * Optional key to store the tool output in the state
	 */
	outputKey?: string;

	/**
	 * Optional flag to skip summarization of the agent's response
	 */
	skipSummarization?: boolean;

	/**
	 * Whether the tool is a long running operation
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
 * A tool that uses an agent to perform a task.
 *
 * This tool allows specialized agents to be used as reusable tools
 * within other agents, enabling modular agent composition and
 * domain-specific expertise as services.
 */
export class AgentTool extends BaseTool {
	/**
	 * The agent used by this tool
	 */
	private agent: BaseAgentType;

	/**
	 * The function declaration schema
	 */
	private functionDeclaration?: FunctionDeclaration;

	/**
	 * The key to store the tool output in the state
	 */
	public outputKey?: string;

	/**
	 * Whether to skip summarization of the agent's response
	 */
	private skipSummarization: boolean;

	protected logger = new Logger({ name: "AgentTool" });

	/**
	 * Create a new agent tool
	 */
	constructor(config: AgentToolConfig) {
		super({
			name: config.name,
			description: config.description || config.agent.description,
			isLongRunning: config.isLongRunning || false,
			shouldRetryOnFailure: config.shouldRetryOnFailure || false,
			maxRetryAttempts: config.maxRetryAttempts || 3,
		});

		this.agent = config.agent;
		this.functionDeclaration = config.functionDeclaration;
		this.outputKey = config.outputKey;
		this.skipSummarization = config.skipSummarization || false;
	}

	/**
	 * Get the function declaration for the tool
	 */
	getDeclaration(): FunctionDeclaration {
		if (this.functionDeclaration) {
			return this.functionDeclaration;
		}

		// Use the agent's instruction as a description if available
		const description = isLlmAgent(this.agent)
			? typeof this.agent.instruction === "string"
				? this.agent.instruction
				: this.description
			: this.description;

		// Default minimal function declaration
		return {
			name: this.name,
			description: description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					input: {
						type: Type.STRING,
						description: "The input to provide to the agent",
					},
				},
				required: ["input"],
			},
		};
	}

	/**
	 * Execute the tool by running the agent with the provided input
	 */
	async runAsync(
		params: Record<string, any>,
		context: ToolContext,
	): Promise<any> {
		try {
			// Use the first parameter value if input is not provided
			// This allows support for custom schema parameters
			const input = params.input || Object.values(params)[0];

			if (!isLlmAgent(this.agent)) {
				throw new Error(
					`Agent ${this.name} does not support running as a tool`,
				);
			}

			// Access the parent invocation context through the protected property
			const parentInvocation = (context as any)._invocationContext;

			// Create a child invocation context that shares the same session
			// but has a different invocation ID for tracking
			const childInvocationContext = new InvocationContext({
				invocationId: uuidv4(),
				agent: this.agent,
				session: parentInvocation.session,
				artifactService: parentInvocation.artifactService,
				sessionService: parentInvocation.sessionService,
				memoryService: parentInvocation.memoryService,
				runConfig: parentInvocation.runConfig,
				userContent: {
					role: "user" as const,
					parts: [{ text: String(input) }],
				},
				branch: parentInvocation.branch
					? `${parentInvocation.branch}.${this.agent.name}`
					: this.agent.name,
			});

			// Run the agent and collect the last event
			let lastEvent: Event | null = null;

			for await (const event of this.agent.runAsync(childInvocationContext)) {
				// Append non-partial events to session like Runner does
				// This ensures function responses are included in conversation history
				if (!event.partial) {
					await childInvocationContext.sessionService.appendEvent(
						childInvocationContext.session,
						event,
					);
				}

				if (event.content && event.author === this.agent.name) {
					lastEvent = event;
				}
			}

			// Check if we have a valid last event with content and parts
			if (!lastEvent || !lastEvent.content || !lastEvent.content.parts) {
				return "";
			}

			// Concatenate all text parts from the last event with newlines
			const mergedText = lastEvent.content.parts
				.filter((part: Part) => part.text !== undefined && part.text !== null)
				.map((part: Part) => part.text)
				.join("\n");

			let toolResult: string;
			try {
				toolResult = JSON.parse(mergedText);
			} catch {
				toolResult = mergedText;
			}

			// If an output key is specified, store the result in the state
			if (this.outputKey && context?.state) {
				context.state[this.outputKey] = toolResult;
			}

			return toolResult;
		} catch (error) {
			this.logger.error(`Error executing agent tool ${this.name}:`, error);
			throw new Error(
				`Agent tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
