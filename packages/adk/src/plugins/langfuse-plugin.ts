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
			flushAt: options.flushAt ?? 1,
			flushInterval: options.flushInterval ?? 1000,
		});
	}

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

	async onUserMessageCallback(params: {
		userMessage: Content;
		invocationContext: InvocationContext;
	}) {
		const trace = this.getOrCreateTrace(params.invocationContext);

		trace.event({
			name: "user_message",
			input: params.userMessage,
		});

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
				trace.update({ output: params.result });
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

		trace.event({
			name: params.event.constructor.name || "event",
			input: params.event.content,
			metadata: {
				id: params.event.id,
				author: params.event.author,
				partial: params.event.partial,
				branch: params.event.branch,
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

		const spanKey = this.getSpanKey(
			params.callbackContext.invocationId,
			`agent:${params.agent.name}`,
		);

		const span = trace.span({
			name: `agent:${params.agent.name}`,
			input: params.callbackContext.invocationContext.userContent,
			metadata: {
				agentType: params.agent.constructor.name,
			},
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

		const span = this.spans.get(spanKey);

		if (span) {
			span.update({ output: params.result });
			span.end();
			this.spans.delete(spanKey);
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

		const genKey = this.getGenerationKey(
			params.callbackContext.invocationId,
			params.llmRequest.model || "unknown",
		);

		console.info("[Langfuse] LLM start", {
			genKey,
			model: params.llmRequest.model,
		});

		const generation = trace.generation({
			name: `llm:${params.llmRequest.model || "unknown"}`,
			model: params.llmRequest.model,
			input: params.llmRequest.contents,
			metadata: {
				systemInstruction: params.llmRequest.getSystemInstructionText(),
				hasTools: Object.keys(params.llmRequest.toolsDict).length > 0,
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

		const genKey = Array.from(this.generations.keys())
			.reverse()
			.find((key) =>
				key.startsWith(`${params.callbackContext.invocationId}:gen:${model}`),
			);

		if (!genKey) return undefined;

		const generation = this.generations.get(genKey);
		if (!generation) return undefined;

		generation.update({
			output: params.llmResponse.text ?? params.llmResponse.content,
			usage_details: params.llmResponse.usageMetadata && {
				input: params.llmResponse.usageMetadata.promptTokenCount,
				output: params.llmResponse.usageMetadata.candidatesTokenCount,
				total: params.llmResponse.usageMetadata.totalTokenCount,
			},
			metadata: {
				finishReason: params.llmResponse.finishReason,
			},
		});

		generation.end();
		this.generations.delete(genKey);
		return undefined;
	}

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
			input: params.toolArgs,
		});

		this.spans.set(spanKey, span);
		return undefined;
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolContext: ToolContext;
		result: any;
	}) {
		const spanKey = this.getSpanKey(
			params.toolContext.invocationId,
			`tool:${params.tool.name}`,
		);

		const span = this.spans.get(spanKey);

		if (span) {
			span.update({ output: params.result });
			span.end();
			this.spans.delete(spanKey);
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
