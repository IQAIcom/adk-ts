import { BaseAgent, CallbackContext, InvocationContext } from "@adk/agents";
import { Event } from "@adk/events";
import { LlmRequest, LlmResponse } from "@adk/models";
import { BaseTool, ToolContext } from "@adk/tools";
import { Content } from "@google/genai";

export abstract class BasePlugin {
	readonly name: string;

	constructor(name: string) {
		this.name = name;
	}

	async onUserMessageCallback?(_params: {
		invocationContext: InvocationContext;
		userMessage: Content;
	}): Promise<Content | undefined> {
		return undefined;
	}

	async beforeRunCallback?(_params: {
		invocationContext: InvocationContext;
	}): Promise<Event | undefined> {
		return undefined;
	}

	async onEventCallback?(_params: {
		invocationContext: InvocationContext;
		event: Event;
	}): Promise<Event | undefined> {
		return undefined;
	}

	async afterRunCallback?(_params: {
		invocationContext: InvocationContext;
		result?: any;
	}): Promise<void> {
		return;
	}

	async close?(): Promise<void> {
		return;
	}

	async beforeAgentCallback?(_params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
	}): Promise<Content | undefined> {
		return undefined;
	}

	async afterAgentCallback?(_params: {
		agent: BaseAgent;
		callbackContext: CallbackContext;
		result?: any;
	}): Promise<Content | undefined> {
		return undefined;
	}

	async beforeModelCallback?(_params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
	}): Promise<LlmResponse | undefined> {
		return undefined;
	}

	async afterModelCallback?(_params: {
		callbackContext: CallbackContext;
		llmResponse: LlmResponse;
		llmRequest?: LlmRequest;
	}): Promise<LlmResponse | undefined> {
		return undefined;
	}

	async onModelErrorCallback?(_params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
		error: unknown;
	}): Promise<LlmResponse | undefined> {
		return undefined;
	}

	async beforeToolCallback?(_params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
	}): Promise<Record<string, any> | undefined> {
		return undefined;
	}

	async afterToolCallback?(_params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		result: Record<string, any>;
	}): Promise<Record<string, any> | undefined> {
		return undefined;
	}

	async onToolErrorCallback?(_params: {
		tool: BaseTool;
		toolArgs: Record<string, any>;
		toolContext: ToolContext;
		error: unknown;
	}): Promise<Record<string, any> | undefined> {
		return undefined;
	}
}
