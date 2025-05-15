import type { BaseLLM } from "../models/base-llm";
import { LLMRegistry } from "../models/llm-registry";
import type { SessionService } from "../memory/services/session-service";
import type { RunConfig } from "./run-config";
import { InvocationContext } from "./invocation-context";
import { ToolContext } from "../tools/tool-context";
import type {
	BaseMemoryService,
	SearchMemoryOptions,
} from "../memory/memory-service";
import {
	LLMRequest,
	type Content,
	type Part,
	type Role,
	type TextPart,
	type FunctionCallPart,
	type FunctionCallData,
	type FunctionResponsePart,
} from "../models/llm-request";
import { LLMResponse } from "../models/llm-response";
import type { BaseTool } from "../tools/base/base-tool";
import { BaseAgent } from "./base-agent";

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
		functionCallData: FunctionCallData,
		invocationContext: InvocationContext,
	): Promise<{ name: string; result: any }> {
		const { name, args } = functionCallData;
		if (process.env.DEBUG === "true") {
			console.log(`Executing tool: ${name} with args:`, args);
		}

		// Find the tool
		const tool = this.findTool(name);
		if (!tool) {
			console.warn(`Tool '${name}' not found`);
			return {
				name,
				result: { error: `Tool '${name}' not found.` },
			};
		}

		try {
			// Create a tool execution context
			const toolContext = new ToolContext({
				invocationContext,
				parameters: args,
			});

			toolContext.toolName = name;

			// Execute the tool
			const result = await tool.runAsync(args, toolContext);
			if (process.env.DEBUG === "true") {
				console.log(`Tool ${name} execution complete`);
			}

			return { name, result };
		} catch (error) {
			console.error(`Error executing tool ${name}:`, error);
			return {
				name,
				result: {
					error: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
				},
			};
		}
	}

	/**
	 * Execute multiple tools in parallel
	 */
	private async executeTools(
		functionCallParts: FunctionCallPart[],
		context: InvocationContext,
	): Promise<{ name: string; result: any }[]> {
		// Execute all tools in parallel and include the original tool call ID with the result
		const results = await Promise.all(
			functionCallParts.map(async (part) => {
				const result = await this.executeTool(part.functionCall, context);
				return {
					...result,
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
			const lastUserContent = [...(context.contents || [])]
				.reverse()
				.find((c: Content) => c.role === "user");
			if (!lastUserContent || !lastUserContent.parts) {
				return;
			}

			// Get the query text
			let query = "";
			for (const part of lastUserContent.parts) {
				if ("text" in part) {
					query += `${(part as TextPart).text} `;
				}
			}
			query = query.trim();

			if (!query) {
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
				const events = memory.events as Content[];

				// Format each memory
				const formattedEvents = events.map((eventContent) => {
					const role = eventContent.role === "user" ? "User" : "Assistant";
					let textContent = "";
					for (const part of eventContent.parts) {
						if ("text" in part) {
							textContent += `${(part as TextPart).text} `;
						}
					}
					return `${role}: ${textContent.trim()}`;
				});

				relevantInfo.push(
					`Session ${sessionId.substring(0, 8)}:\n${formattedEvents.join("\n")}`,
				);
			}

			// Add memory information as a system message at the beginning
			if (relevantInfo.length > 0) {
				const memorySystemContent: Content = {
					role: "system" as Role,
					parts: [
						{
							text: `Relevant information from previous conversations:\n\n${relevantInfo.join("\n\n")}`,
						},
					],
				};

				// Insert after existing system messages
				const lastSystemIndex = (context.contents || []).findIndex(
					(c: Content) => c.role !== ("system" as Role),
				);
				if (lastSystemIndex > 0) {
					(context.contents || []).splice(
						lastSystemIndex,
						0,
						memorySystemContent,
					);
				} else {
					(context.contents || []).unshift(memorySystemContent);
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
		contents: Content[];
		config?: RunConfig;
		sessionId?: string;
	}): Promise<LLMResponse> {
		const sessionId = options.sessionId || this.generateSessionId();
		const context = new InvocationContext({
			sessionId,
			contents: [...options.contents],
			config: options.config,
			userId: this.userId,
			appName: this.appName,
			memoryService: this.memoryService,
			sessionService: this.sessionService,
		});

		let finalResponseForCatch: LLMResponse | undefined;

		try {
			if (this.instructions) {
				context.addContent({
					role: "system" as Role,
					parts: [{ text: this.instructions }],
				});
			}

			const functions = this.tools.map((tool) => tool.getDeclaration());
			const currentContents = [...(context.contents || [])];

			if (this.instructions) {
				const systemInstructionContent: Content = {
					role: "system" as Role,
					parts: [{ text: this.instructions }],
				};
				if (
					!currentContents.find(
						(c) =>
							c.role === ("system" as Role) &&
							c.parts.some(
								(p: Part) => "text" in p && p.text === this.instructions,
							),
					)
				) {
					currentContents.unshift(systemInstructionContent);
				}
			}

			let stepCount = 0;
			let accumulatedFinalResponse: LLMResponse | undefined;

			// eslint-disable-next-line no-constant-condition
			while (true) {
				stepCount++;
				if (stepCount > this.maxToolExecutionSteps) {
					throw new Error("Maximum tool execution steps reached.");
				}

				if (process.env.DEBUG === "true") {
					console.log(`\n[Agent] Step ${stepCount}: Thinking...`);
				}

				const llmRequest = new LLMRequest({
					contents: currentContents,
					config: {
						...options.config,
						functions: functions.length > 0 ? functions : undefined,
					},
				});

				const responseIterator = this.llm.generateContentAsync(llmRequest);
				let currentIterationFinalContent: Content | undefined;

				for await (const chunk of responseIterator) {
					if (chunk.content) {
						currentIterationFinalContent = chunk.content;
					}
					if (!chunk.is_partial || chunk.turn_complete) {
						currentIterationFinalContent = chunk.content;
						accumulatedFinalResponse = chunk;
					}
				}

				if (!currentIterationFinalContent) {
					if (accumulatedFinalResponse?.content) {
						currentIterationFinalContent = accumulatedFinalResponse.content;
					} else {
						throw new Error(
							"No response content from LLM after iterating all chunks.",
						);
					}
				}

				if (!currentIterationFinalContent) {
					throw new Error(
						"currentIterationFinalContent is unexpectedly undefined before processing.",
					);
				}

				currentContents.push(currentIterationFinalContent);
				finalResponseForCatch = accumulatedFinalResponse;

				const functionCallParts: FunctionCallPart[] = [];
				if (currentIterationFinalContent.parts) {
					for (const part of currentIterationFinalContent.parts) {
						if ("functionCall" in part) {
							functionCallParts.push(part as FunctionCallPart);
						}
					}
				}

				if (functionCallParts.length > 0) {
					if (process.env.DEBUG === "true") {
						console.log("[Agent] Executing tools...");
					}
					const toolResults = await this.executeTools(
						functionCallParts,
						context,
					);

					for (const result of toolResults) {
						const functionResponseContent: Content = {
							role: "function",
							parts: [
								{
									functionResponse: {
										name: result.name,
										response: result.result,
									},
								} as FunctionResponsePart,
							],
						};
						currentContents.push(functionResponseContent);
					}
				} else {
					if (process.env.DEBUG === "true") {
						console.log("[Agent] No tool calls, finishing...");
					}
					await this.saveToMemory(context);
					if (!accumulatedFinalResponse) {
						if (!currentIterationFinalContent) {
							throw new Error(
								"Cannot create LLMResponse: currentIterationFinalContent is undefined.",
							);
						}
						return new LLMResponse({ content: currentIterationFinalContent });
					}
					return accumulatedFinalResponse;
				}
			}
		} catch (error) {
			console.error("Error in agent execution:", error);
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			if (finalResponseForCatch) {
				return new LLMResponse({
					...finalResponseForCatch,
					content: finalResponseForCatch.content || {
						role: "model",
						parts: [{ text: `Error after response: ${errorMessage}` }],
					},
					error_code: "AGENT_EXECUTION_SUBSEQUENT_ERROR",
					error_message: errorMessage,
				});
			}
			return new LLMResponse({
				content: {
					role: "model",
					parts: [{ text: `Error in agent execution: ${errorMessage}` }],
				},
				error_code: "AGENT_EXECUTION_ERROR",
				error_message: errorMessage,
			});
		}
	}

	/**
	 * Runs the agent with streaming support
	 */
	async *runStreaming(options: {
		contents: Content[];
		config?: RunConfig;
		sessionId?: string;
	}): AsyncGenerator<LLMResponse> {
		const sessionId = options.sessionId || this.generateSessionId();
		const context = new InvocationContext({
			sessionId,
			contents: [...options.contents],
			config: options.config,
			userId: this.userId,
			appName: this.appName,
			memoryService: this.memoryService,
			sessionService: this.sessionService,
		});

		const currentContents = [...(context.contents || [])];

		if (this.instructions) {
			const systemInstructionContent: Content = {
				role: "system" as Role,
				parts: [{ text: this.instructions }],
			};
			if (
				!currentContents.find(
					(c) =>
						c.role === ("system" as Role) &&
						c.parts.some(
							(p: Part) => "text" in p && p.text === this.instructions,
						),
				)
			) {
				currentContents.unshift(systemInstructionContent);
			}
		}
		await this.augmentWithMemory(context);

		let stepCount = 0;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			stepCount++;
			if (stepCount > this.maxToolExecutionSteps) {
				yield new LLMResponse({
					content: {
						role: "model",
						parts: [{ text: "Maximum tool execution steps reached." }],
					},
					error_code: "MAX_STEPS_REACHED",
					error_message: "Maximum tool execution steps reached.",
					turn_complete: true,
				});
				return;
			}

			if (process.env.DEBUG === "true") {
				console.log(`\n[Agent] Step ${stepCount}: Thinking...`);
			}

			const toolDeclarations = this.tools
				.map((tool) => tool.getDeclaration())
				.filter((declaration) => declaration !== null);

			const request = new LLMRequest({
				contents: currentContents,
				config: {
					...(options.config || {}),
					functions: toolDeclarations.length > 0 ? toolDeclarations : undefined,
				},
			});

			const responseGenerator = this.llm.generateContentAsync(request, true);

			let accumulatedModelContent: Content = { role: "model", parts: [] };
			let finalChunkForToolProcessing: LLMResponse | null = null;
			let hasPendingFunctionCalls = false;

			for await (const responseChunk of responseGenerator) {
				yield responseChunk;

				if (responseChunk.content) {
					if (
						responseChunk.content.role === accumulatedModelContent.role ||
						!accumulatedModelContent.role
					) {
						accumulatedModelContent.parts.push(...responseChunk.content.parts);
						if (responseChunk.content.role)
							accumulatedModelContent.role = responseChunk.content.role;
					} else {
						accumulatedModelContent = {
							role: responseChunk.content.role,
							parts: [...responseChunk.content.parts],
						};
					}

					for (const part of responseChunk.content.parts) {
						if ("functionCall" in part) {
							hasPendingFunctionCalls = true;
						}
					}
				}

				if (
					responseChunk.turn_complete ||
					(!responseChunk.is_partial && hasPendingFunctionCalls)
				) {
					finalChunkForToolProcessing = responseChunk;
					if (hasPendingFunctionCalls) break;
				}
				if (responseChunk.turn_complete && !hasPendingFunctionCalls) {
					finalChunkForToolProcessing = responseChunk;
					break;
				}
			}

			if (
				!finalChunkForToolProcessing ||
				!finalChunkForToolProcessing.content
			) {
				if (!accumulatedModelContent.parts.length && !hasPendingFunctionCalls) {
					break;
				}
				if (accumulatedModelContent.parts.length > 0) {
					finalChunkForToolProcessing = new LLMResponse({
						content: accumulatedModelContent,
						turn_complete: true,
					});
				} else {
					yield new LLMResponse({
						content: {
							role: "model",
							parts: [
								{
									text: "No suitable response from LLM stream for processing.",
								},
							],
						},
						error_code: "STREAM_PROCESSING_ERROR",
						error_message:
							"No complete response with content received from LLM stream for tool processing.",
						turn_complete: true,
					});
					return;
				}
			}

			const modelResponseContentToAdd = finalChunkForToolProcessing?.content;

			if (!modelResponseContentToAdd && !hasPendingFunctionCalls) {
				break;
			}

			if (modelResponseContentToAdd) {
				currentContents.push(modelResponseContentToAdd);
			}

			const functionCallPartsToExecute: FunctionCallPart[] = [];
			if (modelResponseContentToAdd?.parts) {
				for (const part of modelResponseContentToAdd.parts) {
					if ("functionCall" in part) {
						functionCallPartsToExecute.push(part as FunctionCallPart);
					}
				}
			}

			if (functionCallPartsToExecute.length > 0) {
				if (process.env.DEBUG === "true") {
					console.log("[Agent] Executing tools...");
				}
				const toolResults = await this.executeTools(
					functionCallPartsToExecute,
					context,
				);
				for (const result of toolResults) {
					const functionResponseContent: Content = {
						role: "function",
						parts: [
							{
								functionResponse: {
									name: result.name,
									response: result.result,
								},
							} as FunctionResponsePart,
						],
					};
					currentContents.push(functionResponseContent);
				}
			} else {
				if (process.env.DEBUG === "true") {
					console.log("[Agent] No tool calls, finishing stream...");
				}
				break;
			}
		}
		await this.saveToMemory(context);
	}
}
