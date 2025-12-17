import { BaseAgent, CallbackContext, InvocationContext } from "@adk/agents";
import { Event } from "@adk/events";
import { LlmRequest, LlmResponse } from "@adk/models";
import { BaseTool, ToolContext } from "@adk/tools";
import { Content, Part } from "@google/genai";
import {
	Langfuse,
	LangfuseGenerationClient,
	LangfuseSpanClient,
	LangfuseTraceClient,
} from "langfuse";
import { BasePlugin } from "./base-plugin";

export class LangfusePlugin extends BasePlugin {
	private client: Langfuse;
	private traces: Map<string, LangfuseTraceClient> = new Map();

	// Changed to track spans per invocation with a hierarchy
	private agentSpans: Map<string, LangfuseSpanClient> = new Map();
	private toolSpans: Map<string, LangfuseSpanClient> = new Map();
	private generations: Map<string, LangfuseGenerationClient> = new Map();

	constructor(options: LangfusePluginOptions) {
		super(options.name ?? "langfuse_plugin");
		this.client = new Langfuse({
			publicKey: options.publicKey,
			secretKey: options.secretKey,
			baseUrl: options.baseUrl ?? "https://us.cloud.langfuse.com",
			release: options.release,
			flushAt: options.flushAt ?? 1,
			flushInterval: options.flushInterval ?? 1000,
		});
	}

	/**
	 * Serializes Google GenAI Content to a clean format for Langfuse
	 */
	private serializeContent(content?: Content) {
		if (!content) return null;

		return {
			role: content.role,
			parts: content.parts?.map((part) => this.serializePart(part)) || [],
		};
	}

	/**
	 * Serializes a Part to extract meaningful data
	 */
	private serializePart(part: Part) {
		const serialized: any = {};

		if (part.text !== undefined) {
			serialized.text = part.text;
		}

		if (part.functionCall) {
			serialized.functionCall = {
				name: part.functionCall.name,
				args: part.functionCall.args,
				id: part.functionCall.id,
			};
		}

		if (part.functionResponse) {
			serialized.functionResponse = {
				name: part.functionResponse.name,
				response: part.functionResponse.response,
				id: part.functionResponse.id,
			};
		}

		if (part.inlineData) {
			serialized.inlineData = {
				mimeType: part.inlineData.mimeType,
				data: `<${part.inlineData.data?.length || 0} bytes>`,
			};
		}

		if (part.fileData) {
			serialized.fileData = {
				mimeType: part.fileData.mimeType,
				fileUri: part.fileData.fileUri,
			};
		}

		if (part.thought !== undefined) {
			serialized.thought = part.thought;
		}

		if (part.executableCode) {
			serialized.executableCode = {
				language: part.executableCode.language,
				code: part.executableCode.code,
			};
		}

		if (part.codeExecutionResult) {
			serialized.codeExecutionResult = {
				outcome: part.codeExecutionResult.outcome,
				output: part.codeExecutionResult.output,
			};
		}

		return serialized;
	}

	/**
	 * Serializes an array of Content objects
	 */
	private serializeContents(contents?: Content[]) {
		if (!contents || contents.length === 0) return null;
		return contents.map((c) => this.serializeContent(c));
	}

	/**
	 * Extracts text from Content for display purposes
	 */
	private extractTextFromContent(content?: Content) {
		if (!content || !content.parts) return "";
		return content.parts
			.filter((part) => part.text)
			.map((part) => part.text)
			.join("\n");
	}

	/**
	 * Gets the agent span key
	 */
	private getAgentSpanKey(invocationId: string, agentName: string) {
		return `${invocationId}:agent:${agentName}`;
	}

	/**
	 * Gets the tool span key
	 */
	private getToolSpanKey(
		invocationId: string,
		toolName: string,
		functionCallId?: string,
	): string {
		return `${invocationId}:tool:${toolName}:${functionCallId || "unknown"}`;
	}

	/**
	 * Gets the generation key
	 */
	private getGenerationKey(invocationId: string, model?: string) {
		return `${invocationId}:gen:${model || "unknown"}`;
	}

	/**
	 * Gets or creates the root trace for an invocation
	 */
	private getOrCreateTrace(ctx: InvocationLike) {
		if (this.traces.has(ctx.invocationId)) {
			return this.traces.get(ctx.invocationId)!;
		}

		// Extract user input text from Content
		const userInput = ctx.userContent?.parts?.[0]?.text || "";

		const trace = this.client.trace({
			id: ctx.invocationId,
			name: `${ctx.agent.name}-invocation`,
			userId: ctx.userId,
			sessionId: ctx.session?.id,
			input: userInput,
			metadata: {
				appName: ctx.appName,
				branch: ctx.branch,
				agentName: ctx.agent.name,
				agentType: ctx.agent.constructor.name,
			},
		});

		this.traces.set(ctx.invocationId, trace);
		return trace;
	}

	async onUserMessageCallback(params: {
		userMessage: Content;
		invocationContext: InvocationContext;
	}) {
		// Create trace with user input
		const trace = this.getOrCreateTrace(params.invocationContext);

		// Log user message as an event for visibility
		trace.event({
			name: "user_message",
			input: this.serializeContent(params.userMessage),
			metadata: {
				textPreview: this.extractTextFromContent(params.userMessage),
			},
		});

		return undefined;
	}

	async beforeRunCallback(params: { invocationContext: InvocationContext }) {
		const trace = this.getOrCreateTrace(params.invocationContext);

		// Log run start
		trace.event({
			name: "run_start",
			metadata: {
				agentName: params.invocationContext.agent.name,
				sessionId: params.invocationContext.session.id,
				timestamp: Date.now(),
			},
		});

		return undefined;
	}

	async afterRunCallback(params: {
		invocationContext: InvocationContext;
		result?: any;
	}) {
		const trace = this.traces.get(params.invocationContext.invocationId);

		if (trace) {
			// Extract and format output
			let output: any;
			let outputText = "";

			if (params.result !== undefined) {
				if (typeof params.result === "object" && params.result.content) {
					output = this.serializeContent(params.result.content);
					outputText = this.extractTextFromContent(params.result.content);
				} else {
					output = params.result;
					outputText =
						typeof params.result === "string"
							? params.result
							: JSON.stringify(params.result);
				}

				trace.update({
					output,
					metadata: {
						outputText,
						completedAt: Date.now(),
					},
				});
			}

			// Log run completion event
			trace.event({
				name: "run_complete",
				output,
				metadata: {
					outputPreview: outputText.slice(0, 200),
					timestamp: Date.now(),
				},
			});
		}

		return undefined;
	}

	async onEventCallback(params: {
		invocationContext: InvocationContext;
		event: Event;
	}) {
		const trace = this.getOrCreateTrace(params.invocationContext);
		const agentSpanKey = this.getAgentSpanKey(
			params.invocationContext.invocationId,
			params.event.author,
		);
		const agentSpan = this.agentSpans.get(agentSpanKey);

		// Log events under the current agent span if available, otherwise under trace
		const parent = agentSpan || trace;

		parent.event({
			name: `${params.event.author}:${params.event.constructor.name}`,
			input: this.serializeContent(params.event.content),
			metadata: {
				id: params.event.id,
				author: params.event.author,
				partial: params.event.partial,
				branch: params.event.branch,
				timestamp: params.event.timestamp,
				isFinalResponse: params.event.isFinalResponse(),
				hasFunctionCalls: params.event.getFunctionCalls().length > 0,
				hasFunctionResponses: params.event.getFunctionResponses().length > 0,
				textPreview: this.extractTextFromContent(params.event.content),
			},
		});

		return undefined;
	}

	async beforeAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
	}) {
		const trace = this.getOrCreateTrace(
			params.callbackContext.invocationContext,
		);

		const agentSpanKey = this.getAgentSpanKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);

		// Get input for the agent
		const userContent = params.callbackContext.invocationContext.userContent;
		const input = userContent ? this.serializeContent(userContent) : null;

		// Check if there's a parent agent span (for sub-agents)
		const parentAgent = params.agent.parentAgent;
		const parentSpan = parentAgent
			? this.agentSpans.get(
					this.getAgentSpanKey(
						params.callbackContext.invocationId,
						parentAgent.name,
					),
				)
			: undefined;

		// Create agent span either under parent agent or trace
		const span = parentSpan
			? parentSpan.span({
					name: params.agent.name,
					input,
					metadata: {
						agentType: params.agent.constructor.name,
						description: params.agent.description,
						branch: params.callbackContext.invocationContext.branch,
						hasSubAgents: params.agent.subAgents.length > 0,
						subAgentCount: params.agent.subAgents.length,
						subAgentNames: params.agent.subAgents.map((a) => a.name),
						parentAgent: parentAgent?.name,
						inputText: userContent
							? this.extractTextFromContent(userContent)
							: "",
					},
				})
			: trace.span({
					name: params.agent.name,
					input,
					metadata: {
						agentType: params.agent.constructor.name,
						description: params.agent.description,
						branch: params.callbackContext.invocationContext.branch,
						hasSubAgents: params.agent.subAgents.length > 0,
						subAgentCount: params.agent.subAgents.length,
						subAgentNames: params.agent.subAgents.map((a) => a.name),
						inputText: userContent
							? this.extractTextFromContent(userContent)
							: "",
					},
				});

		this.agentSpans.set(agentSpanKey, span);
		return undefined;
	}

	async afterAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
		result?: any;
	}) {
		const agentSpanKey = this.getAgentSpanKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);
		const agentSpan = this.agentSpans.get(agentSpanKey);

		if (agentSpan) {
			// Extract and format output
			let output: any;
			let outputText = "";

			if (params.result !== undefined) {
				if (typeof params.result === "object" && params.result.content) {
					output = this.serializeContent(params.result.content);
					outputText = this.extractTextFromContent(params.result.content);
				} else {
					output = params.result;
					outputText =
						typeof params.result === "string"
							? params.result
							: JSON.stringify(params.result);
				}
			}

			agentSpan.update({
				output,
				metadata: {
					outputText,
					completedAt: Date.now(),
				},
			});
			agentSpan.end();

			// Propagate output to parent agent span if exists
			const parentAgent = params.agent.parentAgent;
			if (parentAgent) {
				const parentSpanKey = this.getAgentSpanKey(
					params.callbackContext.invocationId,
					parentAgent.name,
				);
				const parentSpan = this.agentSpans.get(parentSpanKey);

				if (parentSpan) {
					// Log sub-agent completion in parent
					parentSpan.event({
						name: `${params.agent.name}_completed`,
						output,
						metadata: {
							subAgentName: params.agent.name,
							outputPreview: outputText.slice(0, 200),
							timestamp: Date.now(),
						},
					});
				}
			}

			this.agentSpans.delete(agentSpanKey);
		}

		return undefined;
	}

	async beforeModelCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
	}) {
		const agentSpanKey = this.getAgentSpanKey(
			params.callbackContext.invocationId,
			params.callbackContext.agentName,
		);
		const agentSpan = this.agentSpans.get(agentSpanKey);

		// Create generation under the current agent span
		if (!agentSpan) {
			console.warn(
				`No agent span found for ${agentSpanKey}, cannot create generation`,
			);
			return undefined;
		}

		const genKey = this.getGenerationKey(
			params.callbackContext.invocationId,
			params.llmRequest.model,
		);

		const inputContents = this.serializeContents(params.llmRequest.contents);
		const systemInstruction = params.llmRequest.getSystemInstructionText();

		const generation = agentSpan.generation({
			name: `${params.callbackContext.agentName}:llm`,
			model: params.llmRequest.model,
			input: inputContents,
			metadata: {
				systemInstruction,
				hasTools: Object.keys(params.llmRequest.toolsDict).length > 0,
				toolCount: Object.keys(params.llmRequest.toolsDict).length,
				toolNames: Object.keys(params.llmRequest.toolsDict),
				modelConfig: params.llmRequest.config
					? {
							temperature: params.llmRequest.config.temperature,
							maxOutputTokens: params.llmRequest.config.maxOutputTokens,
							topK: params.llmRequest.config.topK,
							topP: params.llmRequest.config.topP,
						}
					: undefined,
				contentCount: params.llmRequest.contents?.length || 0,
				lastContentPreview:
					params.llmRequest.contents?.length > 0
						? this.extractTextFromContent(
								params.llmRequest.contents[
									params.llmRequest.contents.length - 1
								],
							)
						: "",
			},
		});

		this.generations.set(genKey, generation);
		return undefined;
	}

	async afterModelCallback(params: {
		callbackContext: CallbackContext;
		llmResponse: LlmResponse;
		llmRequest?: LlmRequest;
	}) {
		const genKey = this.getGenerationKey(
			params.callbackContext.invocationId,
			params.llmRequest?.model,
		);

		const generation = this.generations.get(genKey);
		if (!generation) return undefined;

		const outputContent = this.serializeContent(params.llmResponse.content);
		const outputText =
			params.llmResponse.text ||
			this.extractTextFromContent(params.llmResponse.content);

		generation.update({
			output: outputContent,
			usage: params.llmResponse.usageMetadata && {
				input: params.llmResponse.usageMetadata.promptTokenCount,
				output: params.llmResponse.usageMetadata.candidatesTokenCount,
				total: params.llmResponse.usageMetadata.totalTokenCount,
			},
			metadata: {
				finishReason: params.llmResponse.finishReason,
				textPreview: outputText?.slice(0, 500),
				outputText,
				partial: params.llmResponse.partial,
				turnComplete: params.llmResponse.turnComplete,
				candidateIndex: params.llmResponse.candidateIndex,
			},
		});

		generation.end();

		// Log generation completion in agent span
		const agentSpanKey = this.getAgentSpanKey(
			params.callbackContext.invocationId,
			params.callbackContext.agentName,
		);
		const agentSpan = this.agentSpans.get(agentSpanKey);

		if (agentSpan) {
			agentSpan.event({
				name: "llm_response",
				output: outputContent,
				metadata: {
					model: params.llmRequest?.model,
					finishReason: params.llmResponse.finishReason,
					outputPreview: outputText?.slice(0, 200),
					tokenCount: params.llmResponse.usageMetadata?.totalTokenCount,
					timestamp: Date.now(),
				},
			});
		}

		this.generations.delete(genKey);
		return undefined;
	}

	async onModelErrorCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
		error: Error;
	}) {
		const genKey = this.getGenerationKey(
			params.callbackContext.invocationId,
			params.llmRequest.model,
		);

		const generation = this.generations.get(genKey);
		if (generation) {
			generation.update({
				level: "ERROR",
				statusMessage: params.error.message,
				metadata: {
					errorName: params.error.name,
					errorStack: params.error.stack,
					errorMessage: params.error.message,
					model: params.llmRequest.model,
					systemInstruction: params.llmRequest.getSystemInstructionText(),
				},
			});
			generation.end();
			this.generations.delete(genKey);
		}

		// Also log error event in agent span
		const agentSpanKey = this.getAgentSpanKey(
			params.callbackContext.invocationId,
			params.callbackContext.agentName,
		);
		const agentSpan = this.agentSpans.get(agentSpanKey);

		if (agentSpan) {
			agentSpan.event({
				name: "llm_error",
				metadata: {
					errorName: params.error.name,
					errorMessage: params.error.message,
					errorStack: params.error.stack,
					model: params.llmRequest.model,
					timestamp: Date.now(),
				},
			});
		}

		return undefined;
	}

	async beforeToolCallback(params: {
		tool: BaseTool;
		toolArgs: any;
		toolContext: ToolContext;
	}) {
		const agentSpanKey = this.getAgentSpanKey(
			params.toolContext.invocationId,
			params.toolContext.agentName,
		);
		const agentSpan = this.agentSpans.get(agentSpanKey);

		// Create tool span under the current agent span
		if (!agentSpan) {
			console.warn(
				`No agent span found for ${agentSpanKey}, cannot create tool span`,
			);
			return undefined;
		}

		const toolSpanKey = this.getToolSpanKey(
			params.toolContext.invocationId,
			params.tool.name,
			params.toolContext.functionCallId,
		);

		const span = agentSpan.span({
			name: `${params.tool.name}`,
			input: params.toolArgs,
			metadata: {
				toolType: params.tool.constructor.name,
				description: params.tool.description,
				functionCallId: params.toolContext.functionCallId,
				isLongRunning: params.tool.isLongRunning,
				shouldRetryOnFailure: params.tool.shouldRetryOnFailure,
				maxRetryAttempts: params.tool.maxRetryAttempts,
				argsPreview:
					typeof params.toolArgs === "string"
						? params.toolArgs.slice(0, 200)
						: JSON.stringify(params.toolArgs, null, 2).slice(0, 200),
			},
		});

		this.toolSpans.set(toolSpanKey, span);
		return undefined;
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolArgs: any;
		toolContext: ToolContext;
		result: any;
	}) {
		const toolSpanKey = this.getToolSpanKey(
			params.toolContext.invocationId,
			params.tool.name,
			params.toolContext.functionCallId,
		);
		const toolSpan = this.toolSpans.get(toolSpanKey);

		if (toolSpan) {
			const resultPreview =
				typeof params.result === "string"
					? params.result.slice(0, 200)
					: JSON.stringify(params.result, null, 2).slice(0, 200);

			toolSpan.update({
				output: params.result,
				metadata: {
					resultType: typeof params.result,
					resultPreview,
					completedAt: Date.now(),
				},
			});
			toolSpan.end();

			// Log tool completion in agent span
			const agentSpanKey = this.getAgentSpanKey(
				params.toolContext.invocationId,
				params.toolContext.agentName,
			);
			const agentSpan = this.agentSpans.get(agentSpanKey);

			if (agentSpan) {
				agentSpan.event({
					name: `${params.tool.name}_completed`,
					output: params.result,
					metadata: {
						toolName: params.tool.name,
						functionCallId: params.toolContext.functionCallId,
						resultPreview,
						timestamp: Date.now(),
					},
				});
			}

			this.toolSpans.delete(toolSpanKey);
		}

		return undefined;
	}

	async onToolErrorCallback(params: {
		tool: BaseTool;
		toolArgs: any;
		toolContext: ToolContext;
		error: Error;
	}) {
		const toolSpanKey = this.getToolSpanKey(
			params.toolContext.invocationId,
			params.tool.name,
			params.toolContext.functionCallId,
		);
		const toolSpan = this.toolSpans.get(toolSpanKey);

		if (toolSpan) {
			toolSpan.update({
				level: "ERROR",
				statusMessage: params.error.message,
				metadata: {
					errorName: params.error.name,
					errorStack: params.error.stack,
					errorMessage: params.error.message,
					toolArgs: params.toolArgs,
					argsPreview:
						typeof params.toolArgs === "string"
							? params.toolArgs.slice(0, 200)
							: JSON.stringify(params.toolArgs, null, 2).slice(0, 200),
				},
			});
			toolSpan.end();
			this.toolSpans.delete(toolSpanKey);
		}

		// Also log error event in agent span
		const agentSpanKey = this.getAgentSpanKey(
			params.toolContext.invocationId,
			params.toolContext.agentName,
		);
		const agentSpan = this.agentSpans.get(agentSpanKey);

		if (agentSpan) {
			agentSpan.event({
				name: `${params.tool.name}_error`,
				metadata: {
					errorName: params.error.name,
					errorMessage: params.error.message,
					errorStack: params.error.stack,
					toolName: params.tool.name,
					functionCallId: params.toolContext.functionCallId,
					toolArgs: params.toolArgs,
					timestamp: Date.now(),
				},
			});
		}

		return undefined;
	}

	async flush() {
		await this.client.flushAsync();
	}

	async close() {
		await this.client.shutdownAsync();
	}
}

export interface LangfusePluginOptions {
	name?: string;
	publicKey: string;
	secretKey: string;
	baseUrl?: string;
	release?: string;
	flushAt?: number;
	flushInterval?: number;
}

export type InvocationLike = Pick<
	InvocationContext,
	| "invocationId"
	| "userId"
	| "session"
	| "appName"
	| "branch"
	| "userContent"
	| "agent"
>;
