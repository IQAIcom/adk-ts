import { BaseAgent, CallbackContext, InvocationContext } from "@adk/agents";
import { Event } from "@adk/events";
import { LlmRequest, LlmResponse } from "@adk/models";
import { BaseTool, ToolContext } from "@adk/tools";
import { Content } from "@google/genai";
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

	private toPlainText(data: any): string {
		if (data === null || data === undefined) return "";
		if (typeof data === "string") return data;

		// Handle Content parts (Google GenAI)
		if (typeof data === "object" && data.parts) {
			return data.parts
				.map((p: any) => {
					if (p.text) return p.text;
					if (p.functionCall) return `[Call: ${p.functionCall.name}]`;
					if (p.functionResponse)
						return `[Response: ${p.functionResponse.name}]`;
					if (p.thought) return `[Thought: ${p.thought}]`;
					return "";
				})
				.filter(Boolean)
				.join("\n");
		}

		if (Array.isArray(data))
			return data.map((i) => this.toPlainText(i)).join("\n");
		if (typeof data === "object" && data.content)
			return this.toPlainText(data.content);

		try {
			return JSON.stringify(data);
		} catch {
			return String(data);
		}
	}

	private getAgentSpanKey(invocationId: string, agentName: string) {
		return `${invocationId}:agent:${agentName}`;
	}

	private getOrCreateTrace(ctx: InvocationLike) {
		let trace = this.traces.get(ctx.invocationId);
		if (trace) return trace;

		trace = this.client.trace({
			id: ctx.invocationId,
			name: `${ctx.agent.name}-session`,
			userId: ctx.userId,
			sessionId: ctx.session?.id,
			input: this.toPlainText(ctx.userContent),
			metadata: { appName: ctx.appName, branch: ctx.branch },
		});

		this.traces.set(ctx.invocationId, trace);
		return trace;
	}

	async onUserMessageCallback(params: {
		invocationContext: InvocationContext;
		userMessage: Content;
	}): Promise<Content | undefined> {
		const trace = this.getOrCreateTrace(params.invocationContext);
		trace.update({ input: this.toPlainText(params.userMessage) });
		return undefined;
	}

	async beforeRunCallback(params: {
		invocationContext: InvocationContext;
	}): Promise<Event | undefined> {
		this.getOrCreateTrace(params.invocationContext);
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

		parent.event({
			name: `Event: ${params.event.constructor.name}`,
			input: this.toPlainText(params.event.content),
			metadata: { author: params.event.author },
		});
		return undefined;
	}

	async afterRunCallback(params: {
		invocationContext: InvocationContext;
		result?: any;
	}): Promise<void> {
		const trace = this.traces.get(params.invocationContext.invocationId);

		console.log(
			"this.toPlainText(params.result)",
			this.toPlainText(params.result),
			"Here we are",
		);

		if (trace) {
			trace.update({ output: this.toPlainText(params.result) });
			this.traces.delete(params.invocationContext.invocationId);
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

		const parentAgent = params.agent.parentAgent;
		const parentSpan = parentAgent
			? this.agentSpans.get(
					this.getAgentSpanKey(
						params.callbackContext.invocationId,
						parentAgent.name,
					),
				)
			: trace;

		const span = parentSpan!.span({
			name: `Agent: ${params.agent.name}`,
			input: this.toPlainText(
				params.callbackContext.invocationContext.userContent,
			),
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
		if (span) {
			span.update({ output: this.toPlainText(params.result) });
			span.end();
			this.agentSpans.delete(agentSpanKey);
		}
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
		const parent =
			agentSpan ||
			this.getOrCreateTrace(params.callbackContext.invocationContext);

		const generation = parent.generation({
			name: `Model: ${params.callbackContext.agentName}`,
			model: params.llmRequest.model,
			input: this.toPlainText(params.llmRequest.contents),
		});

		this.generations.set(params.callbackContext.invocationId, generation);
		return undefined;
	}

	async afterModelCallback(params: {
		callbackContext: CallbackContext;
		llmResponse: LlmResponse;
		llmRequest?: LlmRequest;
	}): Promise<LlmResponse | undefined> {
		const gen = this.generations.get(params.callbackContext.invocationId);
		if (gen) {
			gen.update({
				output: this.toPlainText(params.llmResponse.content),
				usage: {
					input: params.llmResponse.usageMetadata?.promptTokenCount,
					output: params.llmResponse.usageMetadata?.candidatesTokenCount,
				},
			});
			gen.end();
			this.generations.delete(params.callbackContext.invocationId);
		}
		return undefined;
	}

	async onModelErrorCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
		error: unknown;
	}): Promise<LlmResponse | undefined> {
		const gen = this.generations.get(params.callbackContext.invocationId);
		if (gen) {
			gen.update({ level: "ERROR", statusMessage: String(params.error) });
			gen.end();
			this.generations.delete(params.callbackContext.invocationId);
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
		const parent =
			agentSpan || this.getOrCreateTrace(params.toolContext as any);

		const toolSpan = parent.span({
			name: `Tool: ${params.tool.name}`,
			input: this.toPlainText(params.toolArgs),
		});

		this.toolSpans.set(
			`${params.toolContext.invocationId}:${params.toolContext.functionCallId}`,
			toolSpan,
		);
		return undefined;
	}

	async afterToolCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		result: Record<string, any>;
	}): Promise<Record<string, any> | undefined> {
		const key = `${params.toolContext.invocationId}:${params.toolContext.functionCallId}`;
		const span = this.toolSpans.get(key);
		if (span) {
			span.update({ output: this.toPlainText(params.result) });
			span.end();
			this.toolSpans.delete(key);
		}
		return undefined;
	}

	async onToolErrorCallback(params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		error: unknown;
	}): Promise<Record<string, any> | undefined> {
		const key = `${params.toolContext.invocationId}:${params.toolContext.functionCallId}`;
		const span = this.toolSpans.get(key);
		if (span) {
			span.update({ level: "ERROR", statusMessage: String(params.error) });
			span.end();
			this.toolSpans.delete(key);
		}
		return undefined;
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
