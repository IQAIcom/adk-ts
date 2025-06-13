import { Logger } from "@adk/helpers/logger";
import type {
	BaseMemoryService,
	SearchMemoryOptions,
} from "../memory/base-memory-service";
import type { BaseLLM } from "../models/base-llm";
import { LLMRegistry } from "../models/llm-registry";
import { LLMRequest, type Message } from "../models/llm-request";
import type { LLMResponse, ToolCall } from "../models/llm-response";
import type { SessionService } from "../sessions/base-session-service";
import type { BaseTool } from "../tools/base/base-tool";
import { ToolContext } from "../tools/tool-context";
import { BaseAgent } from "./base-agent";
import { InvocationContext } from "./invocation-context";
import type { RunConfig } from "./run-config";

/**
 * Configuration for Agent
 */
export interface AgentConfig {
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
	 */
	model: string;

	/**
	 * Instructions for the agent
	 */
	instructions?: string;

	/**
	 * Tools available to the agent
	 */
	tools?: BaseTool[];

	/**
	 * Maximum number of tool execution steps
	 */
	maxToolExecutionSteps?: number;

	/**
	 * Memory service for long-term storage and retrieval
	 */
	memoryService?: BaseMemoryService;

	/**
	 * Session service for managing conversations
	 */
	sessionService?: SessionService;

	/**
	 * User ID for the session (required for session persistence)
	 */
	userId?: string;

	/**
	 * Application name (for multi-app environments)
	 */
	appName?: string;

	/**
	 * Whether to automatically augment prompts with relevant memory
	 */
	useMemoryAugmentation?: boolean;

	/**
	 * The maximum number of memory items to include in augmentation
	 */
	maxMemoryItems?: number;

	/**
	 * The minimum relevance score for memory augmentation (0-1)
	 */
	memoryRelevanceThreshold?: number;
}

/**
 * Standard Agent implementation that uses an LLM
 */
export class Agent extends BaseAgent {
	/**
	 * The LLM model to use
	 */
	private model: string;

	/**
	 * The LLM instance
	 */
	private llm: BaseLLM;

	/**
	 * Instructions for the agent
	 */
	private instructions?: string;

	/**
	 * Tools available to the agent
	 */
	private tools: BaseTool[];

	/**
	 * Maximum number of tool execution steps to prevent infinite loops
	 */
	private maxToolExecutionSteps: number;

	/**
	 * Memory service for long-term storage and retrieval
	 */
	private memoryService?: BaseMemoryService;

	/**
	 * Session service for managing conversations
	 */
	private sessionService?: SessionService;

	/**
	 * User ID for the session
	 */
	private userId?: string;

	/**
	 * Application name
	 */
	private appName?: string;

	/**
	 * Whether to automatically augment prompts with relevant memory
	 */
	private useMemoryAugmentation: boolean;

	/**
	 * The maximum number of memory items to include in augmentation
	 */
	private maxMemoryItems: number;

	/**
	 * The minimum relevance score for memory augmentation (0-1)
	 */
	private memoryRelevanceThreshold: number;

	private logger = new Logger({ name: "LlmAgent" });

	/**
	 * Constructor for Agent
	 */
	constructor(config: AgentConfig) {
		super({
			name: config.name,
			description: config.description,
		});

		this.model = config.model;
		this.instructions = config.instructions;
		this.tools = config.tools || [];
		this.maxToolExecutionSteps = config.maxToolExecutionSteps || 10;
		this.memoryService = config.memoryService;
		this.sessionService = config.sessionService;
		this.userId = config.userId;
		this.appName = config.appName;
		this.useMemoryAugmentation = config.useMemoryAugmentation ?? false;
		this.maxMemoryItems = config.maxMemoryItems ?? 5;
		this.memoryRelevanceThreshold = config.memoryRelevanceThreshold ?? 0.3;

		// Get the LLM instance
		this.llm = LLMRegistry.newLLM(this.model);
	}

	/**
	 * Finds a tool by name
	 */
	private findTool(name: string): BaseTool | undefined {
		return this.tools.find((tool) => tool.name === name);
	}

	/**
	 * Executes a tool call and returns the result
	 */
	private async executeTool(
		toolCall: ToolCall,
		context: InvocationContext,
	): Promise<{ name: string; result: any }> {
		const { name, arguments: argsString } = toolCall.function;

		this.logger.debug(`Executing tool: ${name}`);

		// Find the tool
		const tool = this.findTool(name);
		if (!tool) {
			console.warn(`Tool '${name}' not found`);
			return {
				name,
				result: `Error: Tool '${name}' not found.`,
			};
		}

		try {
			// Parse arguments
			const args = JSON.parse(argsString);

			// Create a tool execution context
			const toolContext = new ToolContext({
				invocationContext: context,
				parameters: args,
			});

			toolContext.toolName = name;
			toolContext.toolId = toolCall.id;

			// Execute the tool
			const result = await tool.runAsync(args, toolContext);

			this.logger.debug(`Tool ${name} execution complete`);

			return {
				name,
				result: typeof result === "string" ? result : JSON.stringify(result),
			};
		} catch (error) {
			console.error(`Error executing tool ${name}:`, error);
			return {
				name,
				result: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Execute multiple tools in parallel
	 */
	private async executeTools(
		toolCalls: ToolCall[],
		context: InvocationContext,
	): Promise<{ name: string; result: any; id: string }[]> {
		// Execute all tools in parallel and include the original tool call ID with the result
		const results = await Promise.all(
			toolCalls.map(async (toolCall) => {
				const result = await this.executeTool(toolCall, context);
				return {
					...result,
					id: toolCall.id, // Include the original tool call ID
				};
			}),
		);
		return results;
	}

	/**
	 * Augments context with relevant memory
	 */
	private async augmentWithMemory(context: InvocationContext): Promise<void> {
		// Skip if memory augmentation is disabled or no memory service
		if (!this.useMemoryAugmentation || !context.memoryService) {
			return;
		}

		try {
			// Extract query from the last user message
			const lastUserMsg = [...context.messages]
				.reverse()
				.find((msg) => msg.role === "user");
			if (!lastUserMsg || !lastUserMsg.content) {
				return;
			}

			// Get the query text
			let query = "";
			if (typeof lastUserMsg.content === "string") {
				query = lastUserMsg.content;
			} else if (Array.isArray(lastUserMsg.content)) {
				// Extract text from content array
				for (const part of lastUserMsg.content) {
					if (part.type === "text") {
						query += `${part.text} `;
					}
				}
			} else if (lastUserMsg.content.type === "text") {
				query = lastUserMsg.content.text;
			}

			if (!query.trim()) {
				return;
			}

			// Search memory with the query
			const searchOptions: SearchMemoryOptions = {
				threshold: this.memoryRelevanceThreshold,
				limit: this.maxMemoryItems,
			};

			const memories = await context.searchMemory(query, searchOptions);

			// Skip if no relevant memories found
			if (!memories.memories.length) {
				return;
			}

			// Generate a summary of relevant memories to add as system message
			const relevantInfo: string[] = [];

			for (const memory of memories.memories) {
				const sessionId = memory.sessionId;
				const events = memory.events as Message[];

				// Format each memory
				const formattedEvents = events.map((event) => {
					const role = event.role === "user" ? "User" : "Assistant";
					let content = "";

					if (typeof event.content === "string") {
						content = event.content;
					} else if (Array.isArray(event.content)) {
						// Extract text from content array
						for (const part of event.content) {
							if (part.type === "text") {
								content += `${part.text} `;
							}
						}
					} else if (event.content && event.content.type === "text") {
						content = event.content.text;
					}

					return `${role}: ${content}`;
				});

				relevantInfo.push(
					`Session ${sessionId.substring(0, 8)}:\n${formattedEvents.join("\n")}`,
				);
			}

			// Add memory information as a system message at the beginning
			if (relevantInfo.length > 0) {
				const memoryMessage: Message = {
					role: "system",
					content: `Relevant information from previous conversations:\n\n${relevantInfo.join("\n\n")}`,
				};

				// Insert after existing system messages
				const lastSystemIndex = context.messages.findIndex(
					(m) => m.role !== "system",
				);
				if (lastSystemIndex > 0) {
					context.messages.splice(lastSystemIndex, 0, memoryMessage);
				} else {
					context.messages.unshift(memoryMessage);
				}
			}
		} catch (error) {
			console.error("Error augmenting with memory:", error);
			// Continue without memory augmentation on error
		}
	}

	/**
	 * Saves the session to memory
	 */
	private async saveToMemory(context: InvocationContext): Promise<void> {
		try {
			if (context.sessionService && this.userId) {
				// Ensure we have the user ID set
				context.userId = context.userId || this.userId;

				// Save the session
				await context.saveSession();
			}
		} catch (error) {
			console.error("Error saving to memory:", error);
			// Continue without saving to memory on error
		}
	}

	/**
	 * Generates a unique session ID
	 */
	private generateSessionId(): string {
		return `${this.name}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
	}

	/**
	 * Runs the agent with the given messages and configuration
	 */
	async run(options: {
		messages: Message[];
		config?: RunConfig;
		sessionId?: string;
	}): Promise<LLMResponse> {
		// Generate session ID if not provided
		const sessionId = options.sessionId || this.generateSessionId();

		const context = new InvocationContext({
			sessionId,
			messages: [...options.messages],
			config: options.config,
			userId: this.userId,
			appName: this.appName,
			memoryService: this.memoryService,
			sessionService: this.sessionService,
		});

		try {
			// Add system message with instructions if provided
			if (this.instructions) {
				context.messages.unshift({
					role: "system",
					content: this.instructions,
				});
			}

			// Add tool declarations if any tools are available
			const functions = this.tools.map((tool) => tool.getDeclaration());

			const responseGenerator = await this.llm.generateContentAsync(
				new LLMRequest({
					messages: context.messages,
					config: {
						...options.config,
						functions: functions.length > 0 ? functions : undefined,
					},
				}),
			);

			let response: LLMResponse | undefined;
			for await (const chunk of responseGenerator) {
				response = chunk;
			}

			if (!response) {
				throw new Error("No response from LLM");
			}

			let stepCount = 0;
			while (stepCount < this.maxToolExecutionSteps) {
				stepCount++;

				this.logger.debug(`Step ${stepCount}: Thinking...`);

				// Request a response from the LLM
				const llmRequest = new LLMRequest({
					messages: context.messages,
					config: {
						...options.config,
						functions: functions.length > 0 ? functions : undefined,
					},
				});

				// Use generateContentAsync instead of generateContent
				const responseIterator = this.llm.generateContentAsync(llmRequest);
				let currentResponse: LLMResponse | undefined;

				for await (const chunk of responseIterator) {
					currentResponse = chunk;
				}

				if (!currentResponse) {
					throw new Error("No response from LLM");
				}

				if (
					currentResponse.tool_calls &&
					currentResponse.tool_calls.length > 0
				) {
					// The LLM wants to use tools
					this.logger.debug(
						`Tool calls: ${JSON.stringify(currentResponse.tool_calls)}`,
					);

					// Add the assistant message with tool_calls to the conversation first
					context.addMessage({
						role: "assistant",
						content: currentResponse.content || "",
						tool_calls: currentResponse.tool_calls,
					});

					// Execute the tools
					const toolResults = await this.executeTools(
						currentResponse.tool_calls,
						context,
					);

					// Add the results to the context manually
					for (const result of toolResults) {
						context.addMessage({
							role: "tool",
							tool_call_id: result.id,
							content: result.result,
							name: result.name,
						});
					}
				} else {
					// This is a final response without tool calls
					this.logger.debug("No tool calls, finishing...");

					// Add the final assistant message to the conversation
					context.addMessage({
						role: "assistant",
						content: currentResponse.content || "",
					});

					// Save to memory if enabled
					await this.saveToMemory(context);

					// Return the final response
					return currentResponse;
				}
			}

			return response;
		} catch (error) {
			console.error("Error in agent execution:", error);
			throw error;
		}
	}

	/**
	 * Runs the agent with streaming support
	 */
	async *runStreaming(options: {
		messages: Message[];
		config?: RunConfig;
		sessionId?: string;
	}): AsyncGenerator<LLMResponse> {
		const context = new InvocationContext({
			sessionId: options.sessionId,
			messages: options.messages,
			config: options.config,
			userId: this.userId,
			appName: this.appName,
			memoryService: this.memoryService,
			sessionService: this.sessionService,
		});

		// Add system instructions if provided
		if (this.instructions) {
			context.messages.unshift({
				role: "system",
				content: this.instructions,
			});
		}

		// Augment with memory if enabled
		await this.augmentWithMemory(context);

		// Execute agent loop (thinking and tool execution)
		let stepCount = 0;
		let hadToolCalls = false;

		while (stepCount < this.maxToolExecutionSteps) {
			this.logger.debug(`Step ${stepCount}: Thinking...`);

			// Get tool declarations
			const toolDeclarations = this.tools
				.map((tool) => tool.getDeclaration())
				.filter((declaration) => declaration !== null);

			// Create the request
			const request = {
				messages: context.messages,
				config: {
					functions: toolDeclarations as any[],
					// Pass through all the runtime config settings
					...context.config,
					// Ensure streaming is enabled
					stream: true,
				},
			};

			// Stream response from LLM
			const responseGenerator = this.llm.generateContentAsync(request, true);

			// Capture the final response for tool execution
			let finalResponse: LLMResponse | null = null;
			hadToolCalls = false;

			// Stream response chunks
			for await (const responseChunk of responseGenerator) {
				// Update current full response
				finalResponse = responseChunk;

				// Yield the chunk
				yield responseChunk;

				// Check if there are tool calls to execute
				hadToolCalls =
					Boolean(responseChunk.function_call) ||
					(responseChunk.tool_calls !== undefined &&
						responseChunk.tool_calls.length > 0);
			}

			if (!finalResponse) {
				throw new Error("No response received from LLM");
			}

			// Add assistant response to conversation history
			context.addMessage({
				role: "assistant",
				content: finalResponse.content || "",
				function_call: finalResponse.function_call,
			});

			// If no tool calls, we're done
			if (!hadToolCalls) {
				this.logger.debug("No tool calls, finishing...");
				break;
			}

			this.logger.debug(`Step ${stepCount + 1}: Executing tools...`);
			stepCount++;

			// Execute function_call for backward compatibility
			if (finalResponse.function_call) {
				const toolCall = {
					id: "function-call",
					function: {
						name: finalResponse.function_call.name,
						arguments: finalResponse.function_call.arguments,
					},
				};

				// For function_call, we don't modify the assistant message that was already added

				const [result] = await this.executeTools([toolCall], context);

				// Add function response to conversation history
				context.addMessage({
					role: "function",
					name: result.name,
					content: JSON.stringify(result.result),
				});
			}
			// Execute tool_calls
			else if (
				finalResponse.tool_calls &&
				finalResponse.tool_calls.length > 0
			) {
				this.logger.debug(
					`Step ${stepCount + 1}: Executing ${finalResponse.tool_calls.length} tool(s)...`,
				);

				// Replace the assistant message with one that includes tool_calls
				// First, remove the last message (which should be the assistant message we just added)
				context.messages.pop();

				// Add the assistant message with tool_calls
				context.addMessage({
					role: "assistant",
					content: finalResponse.content || "",
					tool_calls: finalResponse.tool_calls,
				});

				const results = await this.executeTools(
					finalResponse.tool_calls,
					context,
				);

				// Add tool responses to conversation history
				for (const result of results) {
					context.addMessage({
						role: "tool",
						tool_call_id: result.id,
						content: result.result,
					});
				}
			}
		}

		// Save to memory if enabled
		await this.saveToMemory(context);
	}
}
