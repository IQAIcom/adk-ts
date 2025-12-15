import { BaseAgent, CallbackContext, InvocationContext } from "@adk/agents";
import { Event } from "@adk/events";
import { LlmRequest, LlmResponse } from "@adk/models";
import { BaseTool, ToolContext } from "@adk/tools";
import { Content } from "@google/genai";
import { Langfuse } from "langfuse";
import { BasePlugin } from "./base-plugin";

export class LangfusePlugin extends BasePlugin {
	private client: Langfuse;
	private traces: Map<string, LangfuseTrace> = new Map();
	private spans: Map<string, LangfuseSpan> = new Map();
	private generations: Map<string, LangfuseGeneration> = new Map();

	constructor(options: LangfusePluginOptions) {
		super(options.name ?? "langfuse_plugin");

		this.client = new Langfuse({
			publicKey: options.publicKey,
			secretKey: options.secretKey,
			baseUrl: options.baseUrl ?? "https://us.cloud.langfuse.com",
			release: options.release,
			flushAt: options.flushAt,
			flushInterval: options.flushInterval,
		});
	}

	// ---------------------------------------------
	// Helpers
	// ---------------------------------------------

	private getOrCreateTrace(ctx: InvocationLike) {
		if (this.traces.has(ctx.invocationId)) {
			return this.traces.get(ctx.invocationId)!;
		}

		const trace = this.client.trace({
			id: ctx.invocationId,
			name: "agent-invocation",
			userId: ctx.userId,
			sessionId: ctx.session?.id,
			metadata: {
				appName: ctx.appName,
				branch: ctx.branch,
			},
		});

		this.traces.set(ctx.invocationId, trace);
		return trace;
	}

	private getSpanKey(invocationId: string, name: string) {
		return `${invocationId}:${name}`;
	}

	private getGenerationKey(invocationId: string, model: string) {
		return `${invocationId}:gen:${model}:${crypto.randomUUID()}`;
	}

	// ---------------------------------------------
	// User message
	// ---------------------------------------------
	async onUserMessageCallback(params: {
		userMessage: Content;
		invocationContext: InvocationContext;
	}) {
		const trace = this.getOrCreateTrace(params.invocationContext);

		trace.event({
			name: "user_message",
			metadata: { message: params.userMessage },
			input: params.userMessage,
		});

		return undefined;
	}

	// ---------------------------------------------
	// Run start / finish
	// ---------------------------------------------
	async beforeRunCallback(params: { invocationContext: InvocationContext }) {
		// Initialize trace
		this.getOrCreateTrace(params.invocationContext);
		return undefined;
	}

	async afterRunCallback(params: {
		invocationContext: InvocationContext;
		result?: any;
	}) {
		const trace = this.traces.get(params.invocationContext.invocationId);

		if (trace) {
			// Update trace with final output if available
			if (params.result !== undefined) {
				trace.update({
					output: params.result,
				});
			}

			// Finalize the trace
			trace.update({ statusMessage: "completed" });
		}

		return undefined;
	}

	// ---------------------------------------------
	// Event callback
	// ---------------------------------------------
	async onEventCallback(params: {
		invocationContext: InvocationContext;
		event: Event;
	}) {
		const trace = this.getOrCreateTrace(params.invocationContext);

		// Extract event type and payload
		const eventType = params.event.constructor.name || "event";
		const eventPayload = {
			id: params.event.id,
			author: params.event.author,
			timestamp: params.event.timestamp,
			content: params.event.content,
			partial: params.event.partial,
			branch: params.event.branch,
		};

		trace.event({
			name: eventType,
			metadata: eventPayload,
			input: params.event.content,
		});

		return undefined;
	}

	// ---------------------------------------------
	// Agent callbacks
	// ---------------------------------------------
	async beforeAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
	}) {
		const trace = this.getOrCreateTrace(
			params.callbackContext.invocationContext,
		);

		const spanKey = this.getSpanKey(
			params.callbackContext.invocationId,
			`agent:${params.agent.name}`,
		);

		const span = trace.span({
			name: `agent:${params.agent.name}`,
			metadata: {
				agentName: params.agent.name,
				agentType: params.agent.constructor.name,
			},
			input: params.callbackContext.invocationContext.userContent,
		});

		this.spans.set(spanKey, span);

		return undefined;
	}

	async afterAgentCallback(params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
		result?: any;
	}) {
		const spanKey = this.getSpanKey(
			params.callbackContext.invocationId,
			`agent:${params.agent.name}`,
		);

		console.log("spanKey", spanKey);
		const span = this.spans.get(spanKey);

		if (span) {
			span.update({
				output: params.result,
				metadata: {
					completed: true,
				},
			});
			span.end();
			this.spans.delete(spanKey);
		}

		return undefined;
	}

	// ---------------------------------------------
	// LLM callbacks
	// ---------------------------------------------
	async beforeModelCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
	}) {
		const trace = this.getOrCreateTrace(
			params.callbackContext.invocationContext,
		);

		console.log("trace", JSON.stringify(trace, null, 2));

		const genKey = this.getGenerationKey(
			params.callbackContext.invocationId,
			params.llmRequest.model || "unknown",
		);

		console.log("genKey", genKey);

		// Extract model parameters from config
		const modelParameters: Record<string, any> = {};
		if (params.llmRequest.config) {
			const config = params.llmRequest.config;
			if (config.temperature !== undefined)
				modelParameters.temperature = config.temperature;
			if (config.maxOutputTokens !== undefined)
				modelParameters.maxTokens = config.maxOutputTokens;
			if (config.topP !== undefined) modelParameters.topP = config.topP;
			if (config.topK !== undefined) modelParameters.topK = config.topK;
			if (config.stopSequences !== undefined)
				modelParameters.stopSequences = config.stopSequences;
		}

		// Convert Content[] to a format suitable for Langfuse
		const input = params.llmRequest.contents.map((content) => ({
			role: content.role,
			parts: content.parts,
		}));

		const generation = trace.generation({
			name: `llm:${params.llmRequest.model || "unknown"}`,
			model: params.llmRequest.model,
			modelParameters,
			input,
			metadata: {
				hasTools: Object.keys(params.llmRequest.toolsDict).length > 0,
				systemInstruction: params.llmRequest.getSystemInstructionText(),
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
		const model = params.llmRequest?.model || "unknown";

		// Find the most recent generation for this invocation and model
		const genKey = Array.from(this.generations.keys())
			.reverse()
			.find((key) =>
				key.startsWith(`${params.callbackContext.invocationId}:gen:${model}`),
			);

		if (genKey) {
			const generation = this.generations.get(genKey);

			if (generation) {
				// Extract output from LlmResponse
				const output = params.llmResponse.content
					? {
							role: params.llmResponse.content.role,
							parts: params.llmResponse.content.parts,
						}
					: params.llmResponse.text || params.llmResponse.errorMessage;

				// Extract usage metadata if available
				const usageDetails: Record<string, number> = {};
				if (params.llmResponse.usageMetadata) {
					const usage = params.llmResponse.usageMetadata;
					if (usage.promptTokenCount !== undefined) {
						usageDetails.input = usage.promptTokenCount;
					}
					if (usage.candidatesTokenCount !== undefined) {
						usageDetails.output = usage.candidatesTokenCount;
					}
					if (usage.totalTokenCount !== undefined) {
						usageDetails.total = usage.totalTokenCount;
					}
					// Handle cached tokens if available
					if (usage.cachedContentTokenCount !== undefined) {
						usageDetails.cached = usage.cachedContentTokenCount;
					}
				}

				generation.update({
					output,
					...(Object.keys(usageDetails).length > 0 && {
						usage_details: usageDetails,
					}),
					metadata: {
						finishReason: params.llmResponse.finishReason,
						responseId: params.llmResponse.id,
						partial: params.llmResponse.partial,
						turnComplete: params.llmResponse.turnComplete,
						...(params.llmResponse.groundingMetadata && {
							groundingMetadata: params.llmResponse.groundingMetadata,
						}),
					},
				});

				generation.end();
				this.generations.delete(genKey);
			}
		}

		return undefined;
	}

	async onModelErrorCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
		error: Error;
	}) {
		const model = params.llmRequest.model || "unknown";

		// Find the most recent generation for this invocation and model
		const genKey = Array.from(this.generations.keys())
			.reverse()
			.find((key) =>
				key.startsWith(`${params.callbackContext.invocationId}:gen:${model}`),
			);

		if (genKey) {
			const generation = this.generations.get(genKey);

			if (generation) {
				generation.update({
					level: "ERROR",
					statusMessage: params.error.message,
					output: {
						error: params.error.message,
					},
					metadata: {
						error: {
							name: params.error.name,
							message: params.error.message,
							stack: params.error.stack,
						},
					},
				});

				generation.end();
				this.generations.delete(genKey);
			}
		}

		return undefined;
	}

	// ---------------------------------------------
	// Tool callbacks
	// ---------------------------------------------
	async beforeToolCallback(params: {
		tool: BaseTool;
		toolArgs: any;
		toolContext: ToolContext;
	}) {
		const trace = this.getOrCreateTrace(params.toolContext.invocationContext);
		const spanKey = this.getSpanKey(
			params.toolContext.invocationId,
			`tool:${params.tool.name}`,
		);

		const span = trace.span({
			name: `tool:${params.tool.name}`,
			metadata: {
				toolName: params.tool.name,
				toolDescription: params.tool.description,
			},
			input: params.toolArgs,
		});

		this.spans.set(spanKey, span);

		return undefined;
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolArgs: any;
		toolContext: ToolContext;
		result: any;
	}) {
		const spanKey = this.getSpanKey(
			params.toolContext.invocationId,
			`tool:${params.tool.name}`,
		);
		const span = this.spans.get(spanKey);

		if (span) {
			span.update({
				output: params.result,
				metadata: {
					completed: true,
				},
			});
			span.end();
			this.spans.delete(spanKey);
		}

		return undefined;
	}

	async onToolErrorCallback(params: {
		tool: BaseTool;
		toolArgs: any;
		toolContext: ToolContext;
		error: Error;
	}) {
		const spanKey = this.getSpanKey(
			params.toolContext.invocationId,
			`tool:${params.tool.name}`,
		);
		const span = this.spans.get(spanKey);

		if (span) {
			span.update({
				level: "ERROR",
				statusMessage: params.error.message,
				output: {
					error: params.error.message,
				},
				metadata: {
					error: {
						name: params.error.name,
						message: params.error.message,
						stack: params.error.stack,
					},
				},
			});
			span.end();
			this.spans.delete(spanKey);
		}

		return undefined;
	}

	// ---------------------------------------------
	// Cleanup
	// ---------------------------------------------
	async flush() {
		await this.client.flushAsync();
	}

	async close() {
		// Ensure all pending events are sent before shutting down
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
	"invocationId" | "userId" | "session" | "appName" | "branch"
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
