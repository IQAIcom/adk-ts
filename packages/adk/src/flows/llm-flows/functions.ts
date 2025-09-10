import type { Content, FunctionCall, Part } from "@google/genai";
import { context, trace } from "@opentelemetry/api";
import type { InvocationContext } from "../../agents/invocation-context";
import type { LlmAgent } from "../../agents/llm-agent";
import { Event } from "../../events/event";
import { EventActions } from "../../events/event-actions";
import type { AuthConfig } from "../../auth/auth-config";
import type { AuthToolArguments } from "../../auth/auth-tool";
import type { BaseTool } from "../../tools/base/base-tool";
import { ToolContext } from "../../tools/tool-context";
import { telemetryService } from "../../telemetry";

export const AF_FUNCTION_CALL_ID_PREFIX = "adk-";
export const REQUEST_EUC_FUNCTION_CALL_NAME = "adk_request_credential";

/**
 * Generates a client function call ID
 */
export function generateClientFunctionCallId(): string {
	return `${AF_FUNCTION_CALL_ID_PREFIX}${crypto.randomUUID()}`;
}

/**
 * Populates function calls with client function call IDs if missing
 */
export function populateClientFunctionCallId(modelResponseEvent: Event): void {
	const functionCalls = modelResponseEvent.getFunctionCalls();
	if (!functionCalls) {
		return;
	}

	for (const functionCall of functionCalls) {
		if (!functionCall.id) {
			functionCall.id = generateClientFunctionCallId();
		}
	}
}

/**
 * Removes client function call IDs from content
 */
export function removeClientFunctionCallId(content: Content): void {
	if (content?.parts) {
		for (const part of content.parts) {
			if (part.functionCall?.id?.startsWith(AF_FUNCTION_CALL_ID_PREFIX)) {
				part.functionCall.id = undefined;
			}
			if (part.functionResponse?.id?.startsWith(AF_FUNCTION_CALL_ID_PREFIX)) {
				part.functionResponse.id = undefined;
			}
		}
	}
}

/**
 * Gets long running function call IDs from a list of function calls
 */
export function getLongRunningFunctionCalls(
	functionCalls: FunctionCall[],
	toolsDict: Record<string, BaseTool>,
): Set<string> {
	const longRunningToolIds = new Set<string>();

	for (const functionCall of functionCalls) {
		if (
			functionCall.id &&
			functionCall.name in toolsDict &&
			toolsDict[functionCall.name].isLongRunning
		) {
			longRunningToolIds.add(functionCall.id);
		}
	}

	return longRunningToolIds;
}

/**
 * Generates an auth event for credential requests
 */
export function generateAuthEvent(
	invocationContext: InvocationContext,
	functionResponseEvent: Event,
): Event | null {
	if (!functionResponseEvent.actions.requestedAuthConfigs) {
		return null;
	}

	const parts: Part[] = [];
	const longRunningToolIds = new Set<string>();

	for (const [functionCallId, authConfig] of Object.entries(
		functionResponseEvent.actions.requestedAuthConfigs,
	)) {
		const requestEucFunctionCall: FunctionCall = {
			name: REQUEST_EUC_FUNCTION_CALL_NAME,
			args: {
				function_call_id: functionCallId,
				auth_config: authConfig,
			} as AuthToolArguments,
		};

		requestEucFunctionCall.id = generateClientFunctionCallId();
		longRunningToolIds.add(requestEucFunctionCall.id);
		parts.push({ functionCall: requestEucFunctionCall });
	}

	return new Event({
		invocationId: invocationContext.invocationId,
		author: invocationContext.agent.name,
		branch: invocationContext.branch,
		content: {
			parts,
			role: functionResponseEvent.content.role,
		} as Content,
		longRunningToolIds,
	});
}

/**
 * Handles function calls asynchronously
 */
export async function handleFunctionCallsAsync(
	invocationContext: InvocationContext,
	functionCallEvent: Event,
	toolsDict: Record<string, BaseTool>,
	filters?: Set<string>,
): Promise<Event | null> {
	const agent = invocationContext.agent;

	// Only process LlmAgent instances
	if (!isLlmAgent(agent)) {
		return null;
	}

	const functionCalls = functionCallEvent.getFunctionCalls();
	if (!functionCalls) {
		return null;
	}

	const functionResponseEvents: Event[] = [];

	for (const functionCall of functionCalls) {
		if (filters && functionCall.id && !filters.has(functionCall.id)) {
			continue;
		}

		const { tool, toolContext } = getToolAndContext(
			invocationContext,
			functionCallEvent,
			functionCall,
			toolsDict,
		);

		// Execute tool
		const functionArgs = functionCall.args || {};

		// Create tracing span for tool execution (matching Python pattern)
		const tracer = telemetryService.getTracer();
		const span = tracer.startSpan(`execute_tool ${tool.name}`);
		const spanContext = trace.setSpan(context.active(), span);

		try {
			// Execute tool within the span context
			const functionResponse = await context.with(spanContext, async () => {
				const result = await callToolAsync(tool, functionArgs, toolContext);

				// Handle long running tools
				if (tool.isLongRunning && !result) {
					return null;
				}

				// Build function response event
				const functionResponseEvent = buildResponseEvent(
					tool,
					result,
					toolContext,
					invocationContext,
				);

				// Trace the tool call with the complete response event (matching Python)
				// This must be called within the span context so the span is active
				telemetryService.traceToolCall(
					tool,
					functionArgs,
					functionResponseEvent,
				);

				return { result, event: functionResponseEvent };
			});

			// Handle long running tools that returned null
			if (!functionResponse) {
				continue;
			}

			functionResponseEvents.push(functionResponse.event);
			span.setStatus({ code: 1 }); // OK
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: 2, message: (error as Error).message });
			throw error;
		} finally {
			span.end();
		}
	}

	if (!functionResponseEvents.length) {
		return null;
	}

	return mergeParallelFunctionResponseEvents(functionResponseEvents);
}

/**
 * Handles function calls in live mode
 */
export async function handleFunctionCallsLive(
	invocationContext: InvocationContext,
	functionCallEvent: Event,
	toolsDict: Record<string, BaseTool>,
): Promise<Event | null> {
	// For now, use the same logic as async handling
	// Complex streaming functionality can be added later
	return handleFunctionCallsAsync(
		invocationContext,
		functionCallEvent,
		toolsDict,
	);
}

/**
 * Gets tool and context for a function call
 */
function getToolAndContext(
	invocationContext: InvocationContext,
	functionCallEvent: Event,
	functionCall: FunctionCall,
	toolsDict: Record<string, BaseTool>,
): { tool: BaseTool; toolContext: ToolContext } {
	if (!(functionCall.name in toolsDict)) {
		throw new Error(
			`Function ${functionCall.name} is not found in the tools_dict.`,
		);
	}

	const toolContext = new ToolContext(invocationContext, {
		functionCallId: functionCall.id || "",
	});

	const tool = toolsDict[functionCall.name];

	return { tool, toolContext };
}

/**
 * Calls tool asynchronously
 */
async function callToolAsync(
	tool: BaseTool,
	args: Record<string, any>,
	toolContext: ToolContext,
): Promise<any> {
	return await tool.runAsync(args, toolContext);
}

/**
 * Builds a function response event
 */
function buildResponseEvent(
	tool: BaseTool,
	functionResult: any,
	toolContext: ToolContext,
	invocationContext: InvocationContext,
): Event {
	// Specs requires the result to be a dict
	let result = functionResult;
	if (typeof functionResult !== "object" || functionResult === null) {
		result = { result: functionResult };
	}

	const partFunctionResponse: Part = {
		functionResponse: {
			name: tool.name,
			response: result,
			id: toolContext.functionCallId,
		},
	};

	const content: Content = {
		role: "user",
		parts: [partFunctionResponse],
	};

	return new Event({
		invocationId: invocationContext.invocationId,
		author: invocationContext.agent.name,
		content,
		actions: toolContext.actions,
		branch: invocationContext.branch,
	});
}

/**
 * Merges parallel function response events
 */
export function mergeParallelFunctionResponseEvents(
	functionResponseEvents: Event[],
): Event {
	if (!functionResponseEvents.length) {
		throw new Error("No function response events provided.");
	}

	if (functionResponseEvents.length === 1) {
		return functionResponseEvents[0];
	}

	const mergedParts: Part[] = [];
	for (const event of functionResponseEvents) {
		if (event.content?.parts) {
			for (const part of event.content.parts) {
				mergedParts.push(part);
			}
		}
	}

	// Use the first event as the "base" for common attributes
	const baseEvent = functionResponseEvents[0];

	// Merge actions from all events
	const mergedActions = new EventActions();
	const mergedRequestedAuthConfigs: Record<string, AuthConfig> = {};

	for (const event of functionResponseEvents) {
		Object.assign(
			mergedRequestedAuthConfigs,
			event.actions.requestedAuthConfigs,
		);
		// Copy actions properties
		Object.assign(mergedActions, event.actions);
	}
	mergedActions.requestedAuthConfigs = mergedRequestedAuthConfigs;

	// Create the new merged event
	const mergedEvent = new Event({
		invocationId: Event.newId(),
		author: baseEvent.author,
		branch: baseEvent.branch,
		content: { role: "user", parts: mergedParts },
		actions: mergedActions,
	});

	// Use the base_event timestamp
	mergedEvent.timestamp = baseEvent.timestamp;
	return mergedEvent;
}

/**
 * Type guard to check if agent is an LlmAgent
 */
function isLlmAgent(agent: any): agent is LlmAgent {
	return agent && typeof agent === "object" && "canonicalModel" in agent;
}
