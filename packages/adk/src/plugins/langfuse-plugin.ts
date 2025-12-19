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
	private agentSpans: Map<string, LangfuseSpanClient> = new Map();
	private toolSpans: Map<string, LangfuseSpanClient> = new Map();
	private generations: Map<string, LangfuseGenerationClient> = new Map();
	private lastEventByInvocation: Map<string, Event> = new Map();
	private tokenUsage = new Map<
		string,
		{ inputTokens: number; outputTokens: number; totalTokens: number }
	>();
	private modelsUsed = new Map<string, Set<string>>();

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
	 * Converts any data to plain text, handling various formats
	 */
	private toPlainText(data: any): string {
		if (data === null || data === undefined) return "";
		if (typeof data === "string") return data;
		if (typeof data === "number" || typeof data === "boolean")
			return String(data);

		// Handle Content object (Google GenAI)
		if (typeof data === "object" && data.parts && Array.isArray(data.parts)) {
			const text = data.parts
				.map((p: Part) => {
					if (p.text) return p.text;
					if (p.functionCall) return `[Function Call: ${p.functionCall.name}]`;
					if (p.functionResponse)
						return `[Function Response: ${p.functionResponse.name}]`;
					if (p.thought) return `[Thought: ${p.thought}]`;
					if (p.executableCode) return `[Code: ${p.executableCode.language}]`;
					if (p.codeExecutionResult)
						return `[Code Result: ${p.codeExecutionResult.outcome}]`;
					return "";
				})
				.filter(Boolean)
				.join("\n");
			return text;
		}

		// Handle array of Content objects
		if (Array.isArray(data)) {
			return data
				.map((i) => this.toPlainText(i))
				.filter(Boolean)
				.join("\n\n");
		}

		// Handle nested content property
		if (typeof data === "object" && data.content) {
			return this.toPlainText(data.content);
		}

		// Handle Event objects
		if (
			typeof data === "object" &&
			data.constructor?.name === "Event" &&
			data.content
		) {
			return this.toPlainText(data.content);
		}

		// Last resort: stringify
		try {
			return JSON.stringify(data, null, 2);
		} catch (_error) {
			return String(data);
		}
	}

	/**
	 * Serializes Content to structured format for Langfuse
	 */
	private serializeContent(content?: Content): any {
		if (!content) return null;

		return {
			role: content.role,
			parts: content.parts?.map((part) => this.serializePart(part)) || [],
		};
	}

	/**
	 * Serializes a Part to extract meaningful data
	 */
	private serializePart(part: Part): any {
		const serialized: any = {};

		if (part.text !== undefined) serialized.text = part.text;
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
				dataSize: part.inlineData.data?.length || 0,
			};
		}
		if (part.fileData) {
			serialized.fileData = {
				mimeType: part.fileData.mimeType,
				fileUri: part.fileData.fileUri,
			};
		}
		if (part.thought !== undefined) serialized.thought = part.thought;
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
	private serializeContents(contents?: Content[]): any {
		if (!contents || contents.length === 0) return null;
		return contents.map((c) => this.serializeContent(c));
	}

	private recordModelUsage(
		invocationId: string,
		agentName: string,
		model?: string,
	) {
		if (!model) return;

		const key = `${invocationId}:${agentName}`;
		if (!this.modelsUsed.has(key)) {
			this.modelsUsed.set(key, new Set());
		}
		this.modelsUsed.get(key)!.add(model);
	}

	private recordTokenUsage(
		invocationId: string,
		usage?: {
			input?: number;
			output?: number;
			total?: number;
		},
	) {
		if (!usage) return;

		const current = this.tokenUsage.get(invocationId) ?? {
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
		};

		this.tokenUsage.set(invocationId, {
			inputTokens: current.inputTokens + (usage.input ?? 0),
			outputTokens: current.outputTokens + (usage.output ?? 0),
			totalTokens: current.totalTokens + (usage.total ?? 0),
		});
	}

	private getAgentSpanKey(invocationId: string, agentName: string): string {
		return `${invocationId}:agent:${agentName}`;
	}

	private getToolSpanKey(
		invocationId: string,
		functionCallId?: string,
	): string {
		return `${invocationId}:tool:${functionCallId || "unknown"}`;
	}

	private getGenerationKey(invocationId: string, model?: string): string {
		return `${invocationId}:gen:${model || "unknown"}`;
	}

	private getOrCreateTrace(ctx: InvocationLike): LangfuseTraceClient {
		let trace = this.traces.get(ctx.invocationId);
		if (trace) return trace;

		const userInput = this.toPlainText(ctx.userContent);

		trace = this.client.trace({
			id: ctx.invocationId,
			name: `${ctx.agent.name}-session`,
			userId: ctx.userId,
			sessionId: ctx.session.id,
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
		invocationContext: InvocationContext;
		userMessage: Content;
	}): Promise<Content | undefined> {
		const trace = this.getOrCreateTrace(params.invocationContext);
		const userInput = this.toPlainText(params.userMessage);

		trace.update({ input: userInput });
		trace.event({
			name: "user_message",
			input: this.serializeContent(params.userMessage),
			metadata: {
				textPreview: userInput.slice(0, 200),
			},
		});

		return undefined;
	}

	async beforeRunCallback(params: {
		invocationContext: InvocationContext;
	}): Promise<Event | undefined> {
		const trace = this.getOrCreateTrace(params.invocationContext);

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

	async onEventCallback(params: {
		invocationContext: InvocationContext;
		event: Event;
	}): Promise<Event | undefined> {
		const trace = this.getOrCreateTrace(params.invocationContext);
		const agentSpan = this.agentSpans.get(
			this.getAgentSpanKey(
				params.invocationContext.invocationId,
				params.event.author,
			),
		);
		const parent = agentSpan || trace;

		const eventText = this.toPlainText(params.event.content);

		// Store this event as the last event for this invocation
		// The last event with actual content (not function calls) will be the output
		if (
			params.event.content?.parts?.some((p) => p.text || p.codeExecutionResult)
		) {
			this.lastEventByInvocation.set(
				params.invocationContext.invocationId,
				params.event,
			);
		}

		const name =
			params.event.getFunctionCalls().length > 0
				? `${params.event.author}.function_call`
				: params.event.isFinalResponse()
					? `${params.event.author}.final_response`
					: `${params.event.author}.event`;

		parent.event({
			name,
			input: this.serializeContent(params.event.content),
			metadata: {
				eventId: params.event.id,
				eventType: params.event.constructor.name,
				partial: params.event.partial,
				branch: params.event.branch,
				timestamp: params.event.timestamp,
				isFinalResponse: params.event.isFinalResponse(),
				hasFunctionCalls: params.event.getFunctionCalls().length > 0,
				hasFunctionResponses: params.event.getFunctionResponses().length > 0,
				textPreview: eventText.slice(0, 200),
				finishReason: params.event.finishReason,
			},
		});

		return undefined;
	}

	async afterRunCallback(params: {
		invocationContext: InvocationContext;
		result?: any;
	}): Promise<void> {
		const trace = this.traces.get(params.invocationContext.invocationId);
		if (!trace) return;

		// Use the last event as output instead of params.result
		const lastEvent = this.lastEventByInvocation.get(
			params.invocationContext.invocationId,
		);

		let output: any;
		let outputText = "";

		if (lastEvent?.content) {
			// Use the last event's content as the output
			output = this.serializeContent(lastEvent.content);
			outputText = this.toPlainText(lastEvent.content);
		} else if (params.result !== undefined) {
			// Fallback to params.result if available
			if (typeof params.result === "object" && params.result.content) {
				output = this.serializeContent(params.result.content);
				outputText = this.toPlainText(params.result.content);
			} else if (params.result instanceof Event) {
				output = this.serializeContent(params.result.content);
				outputText = this.toPlainText(params.result.content);
			} else {
				output = params.result;
				outputText = this.toPlainText(params.result);
			}
		}

		if (output || outputText) {
			trace.update({
				output: outputText || output,
				metadata: {
					outputText,
					completedAt: Date.now(),
					resultType: lastEvent ? "event" : typeof params.result,
				},
			});

			trace.event({
				name: "run_complete",
				output,
				metadata: {
					outputPreview: outputText.slice(0, 200),
					timestamp: Date.now(),
				},
			});
		}

        const usage = this.tokenUsage.get(params.invocationContext.invocationId);

		if (usage) {
			trace.update({
				metadata: {
					usage: {
						input: usage.inputTokens,
						output: usage.outputTokens,
						total: usage.totalTokens,
					},
					totalInputTokens: usage.inputTokens,
					totalOutputTokens: usage.outputTokens,
					totalTokens: usage.totalTokens,
				},
			});
		}

		// Clean up
		this.lastEventByInvocation.delete(params.invocationContext.invocationId);
		this.tokenUsage.delete(params.invocationContext.invocationId);

		for (const key of this.modelsUsed.keys()) {
			if (key.startsWith(params.invocationContext.invocationId)) {
				this.modelsUsed.delete(key);
			}
		}
	}

	async beforeAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
	}): Promise<Content | undefined> {
		const trace = this.getOrCreateTrace(
			params.callbackContext.invocationContext,
		);
		const agentSpanKey = this.getAgentSpanKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);

		const userContent = params.callbackContext.invocationContext.userContent;
		const input = userContent ? this.serializeContent(userContent) : null;
		const inputText = this.toPlainText(userContent);

		const parentAgent = params.agent.parentAgent;
		const parentSpan = parentAgent
			? this.agentSpans.get(
					this.getAgentSpanKey(
						params.callbackContext.invocationId,
						parentAgent.name,
					),
				)
			: undefined;

		const parent = parentSpan || trace;

		const span = parent.span({
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
				inputText,
			},
		});

		this.agentSpans.set(agentSpanKey, span);
		return undefined;
	}

	async afterAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
		result?: any;
	}): Promise<Content | undefined> {
		const agentSpanKey = this.getAgentSpanKey(
			params.callbackContext.invocationId,
			params.agent.name,
		);
		const span = this.agentSpans.get(agentSpanKey);
		const modelKey = `${params.callbackContext.invocationId}:${params.agent.name}`;
		const models = Array.from(this.modelsUsed.get(modelKey) ?? []);

		if (!span) return undefined;

		// Use the last event for this invocation as the agent output
		const lastEvent = this.lastEventByInvocation.get(
			params.callbackContext.invocationId,
		);

		let output: any;
		let outputText = "";

		if (lastEvent?.content) {
			output = this.serializeContent(lastEvent.content);
			outputText = this.toPlainText(lastEvent.content);
		} else if (params.result !== undefined) {
			if (typeof params.result === "object" && params.result.content) {
				output = this.serializeContent(params.result.content);
				outputText = this.toPlainText(params.result.content);
			} else {
				output = params.result;
				outputText = this.toPlainText(params.result);
			}
		}

		span.update({
			output,
			metadata: {
				outputText,
				completedAt: Date.now(),
				...(models.length > 0 && { modelsUsed: models }),
			},
		});

		span.end();

		// Propagate to parent agent
		const parentAgent = params.agent.parentAgent;
		if (parentAgent) {
			const parentSpanKey = this.getAgentSpanKey(
				params.callbackContext.invocationId,
				parentAgent.name,
			);
			const parentSpan = this.agentSpans.get(parentSpanKey);

			if (parentSpan) {
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
		return undefined;
	}

	async beforeModelCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
	}): Promise<LlmResponse | undefined> {
		const agentSpan = this.agentSpans.get(
			this.getAgentSpanKey(
				params.callbackContext.invocationId,
				params.callbackContext.agentName,
			),
		);

		if (!agentSpan) return undefined;

		const genKey = this.getGenerationKey(
			params.callbackContext.invocationId,
			params.llmRequest.model,
		);

		const inputContents = this.serializeContents(params.llmRequest.contents);
		const systemInstruction = params.llmRequest.getSystemInstructionText();

		const generation = agentSpan.generation({
			name: params.callbackContext.agentName,
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
			},
		});

		this.generations.set(genKey, generation);
		return undefined;
	}

	async afterModelCallback(params: {
		callbackContext: CallbackContext;
		llmResponse: LlmResponse;
		llmRequest?: LlmRequest;
	}): Promise<LlmResponse | undefined> {
		const genKey = this.getGenerationKey(
			params.callbackContext.invocationId,
			params.llmRequest?.model,
		);

		const generation = this.generations.get(genKey);
		if (!generation) return undefined;

		const outputContent = this.serializeContent(params.llmResponse.content);
		const outputText =
			params.llmResponse.text || this.toPlainText(params.llmResponse.content);

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

		if (params.llmResponse.usageMetadata) {
			this.recordTokenUsage(params.callbackContext.invocationId, {
				input: params.llmResponse.usageMetadata.promptTokenCount,
				output: params.llmResponse.usageMetadata.candidatesTokenCount,
				total: params.llmResponse.usageMetadata.totalTokenCount,
			});
		}

		this.recordModelUsage(
			params.callbackContext.invocationId,
			params.callbackContext.agentName,
			params.llmRequest.model,
		);

		generation.end();

		// Log in agent span
		const agentSpan = this.agentSpans.get(
			this.getAgentSpanKey(
				params.callbackContext.invocationId,
				params.callbackContext.agentName,
			),
		);

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
		error: unknown;
	}): Promise<LlmResponse | undefined> {
		const genKey = this.getGenerationKey(
			params.callbackContext.invocationId,
			params.llmRequest.model,
		);

		const generation = this.generations.get(genKey);
		if (generation) {
			const errorMessage =
				params.error instanceof Error
					? params.error.message
					: String(params.error);
			const errorStack =
				params.error instanceof Error ? params.error.stack : undefined;

			generation.update({
				level: "ERROR",
				statusMessage: errorMessage,
				metadata: {
					errorName:
						params.error instanceof Error ? params.error.name : "Error",
					errorStack,
					errorMessage,
					model: params.llmRequest.model,
					systemInstruction: params.llmRequest.getSystemInstructionText(),
				},
			});
			generation.end();
			this.generations.delete(genKey);
		}

		// Log in agent span
		const agentSpan = this.agentSpans.get(
			this.getAgentSpanKey(
				params.callbackContext.invocationId,
				params.callbackContext.agentName,
			),
		);

		if (agentSpan) {
			agentSpan.event({
				name: "llm_error",
				metadata: {
					errorMessage:
						params.error instanceof Error
							? params.error.message
							: String(params.error),
					errorStack:
						params.error instanceof Error ? params.error.stack : undefined,
					model: params.llmRequest.model,
					timestamp: Date.now(),
				},
			});
		}

		return undefined;
	}

	async beforeToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
	}): Promise<Record<string, any> | undefined> {
		const agentSpan = this.agentSpans.get(
			this.getAgentSpanKey(
				params.toolContext.invocationId,
				params.toolContext.agentName,
			),
		);

		if (!agentSpan) return undefined;

		const toolSpanKey = this.getToolSpanKey(
			params.toolContext.invocationId,
			params.toolContext.functionCallId,
		);

		const argsText = this.toPlainText(params.toolArgs);

		const toolSpan = agentSpan.span({
			name: params.tool.name,
			input: params.toolArgs,
			metadata: {
				toolType: params.tool.constructor.name,
				description: params.tool.description,
				functionCallId: params.toolContext.functionCallId,
				isLongRunning: params.tool.isLongRunning,
				shouldRetryOnFailure: params.tool.shouldRetryOnFailure,
				maxRetryAttempts: params.tool.maxRetryAttempts,
				argsPreview: argsText.slice(0, 200),
			},
		});

		this.toolSpans.set(toolSpanKey, toolSpan);
		return undefined;
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		result: Record<string, any>;
	}): Promise<Record<string, any> | undefined> {
		const toolSpanKey = this.getToolSpanKey(
			params.toolContext.invocationId,
			params.toolContext.functionCallId,
		);
		const toolSpan = this.toolSpans.get(toolSpanKey);

		if (!toolSpan) return undefined;

		const resultText = this.toPlainText(params.result);

		toolSpan.update({
			output: params.result,
			metadata: {
				resultType: typeof params.result,
				resultPreview: resultText.slice(0, 200),
				completedAt: Date.now(),
			},
		});
		toolSpan.end();

		// Log in agent span
		const agentSpan = this.agentSpans.get(
			this.getAgentSpanKey(
				params.toolContext.invocationId,
				params.toolContext.agentName,
			),
		);

		if (agentSpan) {
			agentSpan.event({
				name: `${params.tool.name}_completed`,
				output: params.result,
				metadata: {
					toolName: params.tool.name,
					functionCallId: params.toolContext.functionCallId,
					resultPreview: resultText.slice(0, 200),
					timestamp: Date.now(),
				},
			});
		}

		this.toolSpans.delete(toolSpanKey);
		return undefined;
	}

	async onToolErrorCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		error: unknown;
	}): Promise<Record<string, any> | undefined> {
		const toolSpanKey = this.getToolSpanKey(
			params.toolContext.invocationId,
			params.toolContext.functionCallId,
		);
		const toolSpan = this.toolSpans.get(toolSpanKey);

		if (toolSpan) {
			const errorMessage =
				params.error instanceof Error
					? params.error.message
					: String(params.error);
			const errorStack =
				params.error instanceof Error ? params.error.stack : undefined;
			const argsText = this.toPlainText(params.toolArgs);

			toolSpan.update({
				level: "ERROR",
				statusMessage: errorMessage,
				metadata: {
					errorName:
						params.error instanceof Error ? params.error.name : "Error",
					errorStack,
					errorMessage,
					toolArgs: params.toolArgs,
					argsPreview: argsText.slice(0, 200),
				},
			});
			toolSpan.end();
			this.toolSpans.delete(toolSpanKey);
		}

		// Log in agent span
		const agentSpan = this.agentSpans.get(
			this.getAgentSpanKey(
				params.toolContext.invocationId,
				params.toolContext.agentName,
			),
		);

		if (agentSpan) {
			agentSpan.event({
				name: `${params.tool.name}_error`,
				metadata: {
					errorMessage:
						params.error instanceof Error
							? params.error.message
							: String(params.error),
					errorStack:
						params.error instanceof Error ? params.error.stack : undefined,
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

	async close(): Promise<void> {
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
