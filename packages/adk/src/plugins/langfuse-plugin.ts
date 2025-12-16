import { BaseAgent, CallbackContext, InvocationContext } from "@adk/agents";
import { Event } from "@adk/events";
import { LlmRequest, LlmResponse } from "@adk/models";
import { BaseTool, ToolContext } from "@adk/tools";
import { Content, Part } from "@google/genai";
import { Langfuse } from "langfuse";
import { BasePlugin } from "./base-plugin";

export class LangfusePlugin extends BasePlugin {
	private client: Langfuse;
	private traces: Map<string, LangfuseTrace> = new Map();
	private spanStack: Map<string, LangfuseSpan[]> = new Map();
	private currentGeneration: Map<string, LangfuseGeneration> = new Map();

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
	private serializeContents(contents?: Content[]): any {
		if (!contents || contents.length === 0) return null;
		return contents.map((c) => this.serializeContent(c));
	}

	/**
	 * Extracts text from Content for display purposes
	 */
	private extractTextFromContent(content?: Content): string {
		if (!content || !content.parts) return "";
		return content.parts
			.filter((part) => part.text)
			.map((part) => part.text)
			.join("\n");
	}

	/**
	 * Gets the current parent span for nesting
	 */
	private getCurrentSpan(invocationId: string): LangfuseSpan | undefined {
		const stack = this.spanStack.get(invocationId);
		return stack && stack.length > 0 ? stack[stack.length - 1] : undefined;
	}

	/**
	 * Pushes a span onto the stack
	 */
	private pushSpan(invocationId: string, span: LangfuseSpan): void {
		if (!this.spanStack.has(invocationId)) {
			this.spanStack.set(invocationId, []);
		}
		this.spanStack.get(invocationId)!.push(span);
	}

	/**
	 * Pops a span from the stack
	 */
	private popSpan(invocationId: string): void {
		const stack = this.spanStack.get(invocationId);
		if (stack && stack.length > 0) {
			stack.pop();
		}
	}

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
			},
		});

		this.traces.set(ctx.invocationId, trace);
		return trace;
	}

	async onUserMessageCallback(params: {
		userMessage: Content;
		invocationContext: InvocationContext;
	}) {
		// Trace is already created with the user input, so we just ensure it exists
		this.getOrCreateTrace(params.invocationContext);
		return undefined;
	}

	async beforeRunCallback(params: { invocationContext: InvocationContext }) {
		this.getOrCreateTrace(params.invocationContext);
		return undefined;
	}

	async afterRunCallback(params: {
		invocationContext: InvocationContext;
		result?: any;
	}) {
		const trace = this.traces.get(params.invocationContext.invocationId);

		if (trace) {
			if (params.result !== undefined) {
				const output =
					typeof params.result === "object" && params.result.content
						? this.extractTextFromContent(params.result.content)
						: params.result;

				trace.update({
					output,
				});
			}
			trace.update({ statusMessage: "completed" });
		}

		return undefined;
	}

	async onEventCallback(params: {
		invocationContext: InvocationContext;
		event: Event;
	}) {
		const trace = this.getOrCreateTrace(params.invocationContext);

		// Log events as trace-level events for visibility
		trace.event({
			name: params.event.constructor.name || "event",
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

		const parentSpan = this.getCurrentSpan(params.callbackContext.invocationId);

		const span = parentSpan
			? parentSpan.span({
					name: params.agent.name,
					metadata: {
						agentType: params.agent.constructor.name,
						branch: params.callbackContext.invocationContext.branch,
					},
				})
			: trace.span({
					name: params.agent.name,
					metadata: {
						agentType: params.agent.constructor.name,
						branch: params.callbackContext.invocationContext.branch,
					},
				});

		this.pushSpan(params.callbackContext.invocationId, span);
		return undefined;
	}

	async afterAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
		result?: any;
	}) {
		const currentSpan = this.getCurrentSpan(
			params.callbackContext.invocationId,
		);

		if (currentSpan) {
			const output =
				typeof params.result === "object" && params.result.content
					? this.extractTextFromContent(params.result.content)
					: params.result;

			currentSpan.update({
				output,
			});
			currentSpan.end();
			this.popSpan(params.callbackContext.invocationId);
		}

		return undefined;
	}

	async beforeModelCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
	}) {
		const trace = this.getOrCreateTrace(
			params.callbackContext.invocationContext,
		);

		const parentSpan = this.getCurrentSpan(params.callbackContext.invocationId);

		const genKey = `${params.callbackContext.invocationId}:${params.llmRequest.model}`;

		const generation = parentSpan
			? parentSpan.generation({
					name: params.llmRequest.model || "unknown",
					model: params.llmRequest.model,
					input: this.serializeContents(params.llmRequest.contents),
					metadata: {
						systemInstruction: params.llmRequest.getSystemInstructionText(),
						hasTools: Object.keys(params.llmRequest.toolsDict).length > 0,
						toolCount: Object.keys(params.llmRequest.toolsDict).length,
						toolNames: Object.keys(params.llmRequest.toolsDict),
					},
				})
			: trace.generation({
					name: params.llmRequest.model || "unknown",
					model: params.llmRequest.model,
					input: this.serializeContents(params.llmRequest.contents),
					metadata: {
						systemInstruction: params.llmRequest.getSystemInstructionText(),
						hasTools: Object.keys(params.llmRequest.toolsDict).length > 0,
						toolCount: Object.keys(params.llmRequest.toolsDict).length,
						toolNames: Object.keys(params.llmRequest.toolsDict),
					},
				});

		this.currentGeneration.set(genKey, generation);
		return undefined;
	}

	async afterModelCallback(params: {
		callbackContext: CallbackContext;
		llmResponse: LlmResponse;
		llmRequest?: LlmRequest;
	}) {
		const model = params.llmRequest?.model || "unknown";
		const genKey = `${params.callbackContext.invocationId}:${model}`;

		const generation = this.currentGeneration.get(genKey);
		if (!generation) return undefined;

		generation.update({
			output: this.serializeContent(params.llmResponse.content),
			usage_details: params.llmResponse.usageMetadata && {
				input: params.llmResponse.usageMetadata.promptTokenCount,
				output: params.llmResponse.usageMetadata.candidatesTokenCount,
				total: params.llmResponse.usageMetadata.totalTokenCount,
			},
			metadata: {
				finishReason: params.llmResponse.finishReason,
				textPreview:
					params.llmResponse.text ||
					this.extractTextFromContent(params.llmResponse.content),
			},
		});

		generation.end();
		this.currentGeneration.delete(genKey);
		return undefined;
	}

	async beforeToolCallback(params: {
		tool: BaseTool;
		toolArgs: any;
		toolContext: ToolContext;
	}) {
		const trace = this.getOrCreateTrace(params.toolContext.invocationContext);

		const parentSpan = this.getCurrentSpan(params.toolContext.invocationId);

		const span = parentSpan
			? parentSpan.span({
					name: params.tool.name,
					input: params.toolArgs,
					metadata: {
						toolType: params.tool.constructor.name,
						functionCallId: params.toolContext.functionCallId,
					},
				})
			: trace.span({
					name: params.tool.name,
					input: params.toolArgs,
					metadata: {
						toolType: params.tool.constructor.name,
						functionCallId: params.toolContext.functionCallId,
					},
				});

		this.pushSpan(params.toolContext.invocationId, span);
		return undefined;
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolContext: ToolContext;
		result: any;
	}) {
		const currentSpan = this.getCurrentSpan(params.toolContext.invocationId);

		if (currentSpan) {
			currentSpan.update({
				output: params.result,
				metadata: {
					resultType: typeof params.result,
					resultPreview:
						typeof params.result === "string"
							? params.result.slice(0, 200)
							: JSON.stringify(params.result, null, 2).slice(0, 200),
				},
			});
			currentSpan.end();
			this.popSpan(params.toolContext.invocationId);
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

export interface LangfuseTrace {
	event(params: {
		name: string;
		metadata?: Record<string, any>;
		input?: any;
		output?: any;
	}): void;

	span(params: {
		name: string;
		metadata?: Record<string, any>;
		input?: any;
		output?: any;
	}): LangfuseSpan;

	generation(params: {
		name: string;
		model?: string;
		modelParameters?: Record<string, any>;
		input?: any;
		output?: any;
		metadata?: Record<string, any>;
		usage_details?: Record<string, number>;
	}): LangfuseGeneration;

	update(params: {
		output?: any;
		statusMessage?: string;
		metadata?: Record<string, any>;
	}): void;
}

export interface LangfuseSpan {
	span(params: {
		name: string;
		metadata?: Record<string, any>;
		input?: any;
		output?: any;
	}): LangfuseSpan;

	generation(params: {
		name: string;
		model?: string;
		modelParameters?: Record<string, any>;
		input?: any;
		output?: any;
		metadata?: Record<string, any>;
		usage_details?: Record<string, number>;
	}): LangfuseGeneration;

	update(params: {
		output?: any;
		metadata?: Record<string, any>;
		level?: "DEFAULT" | "DEBUG" | "WARNING" | "ERROR";
		statusMessage?: string;
	}): void;

	end(): void;
}

export interface LangfuseGeneration {
	update(params: {
		output?: any;
		usage_details?: Record<string, number>;
		metadata?: Record<string, any>;
		level?: "DEFAULT" | "DEBUG" | "WARNING" | "ERROR";
		statusMessage?: string;
	}): void;

	end(): void;
}
