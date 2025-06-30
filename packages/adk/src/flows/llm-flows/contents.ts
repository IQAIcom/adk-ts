import type { Content } from "@google/genai";
import type { InvocationContext } from "../../agents/invocation-context";
import type { LlmAgent } from "../../agents/llm-agent";
import { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import { BaseLlmRequestProcessor } from "./base-llm-processor";
import {
	REQUEST_EUC_FUNCTION_CALL_NAME,
	removeClientFunctionCallId,
} from "./functions";

/**
 * Content LLM request processor that builds the contents for the LLM request.
 * This processor handles event filtering, rearrangement, and content building.
 */
class ContentLlmRequestProcessor extends BaseLlmRequestProcessor {
	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event, void, unknown> {
		const agent = invocationContext.agent;

		// Only process LlmAgent instances
		if (!this.isLlmAgent(agent)) {
			return;
		}

		if (agent.includeContents === "default") {
			// Include full conversation history
			llmRequest.contents = getContents(
				invocationContext.branch,
				invocationContext.session.events,
				agent.name,
			);
		} else if (agent.includeContents !== "none") {
			// Include current turn context only (no conversation history)
			llmRequest.contents = getCurrentTurnContents(
				invocationContext.branch,
				invocationContext.session.events,
				agent.name,
			);
		}

		// This processor doesn't yield any events, just configures the request
		// Empty async generator - no events to yield
		for await (const _ of []) {
			yield _;
		}
	}

	/**
	 * Type guard to check if agent is an LlmAgent
	 */
	private isLlmAgent(agent: any): agent is LlmAgent {
		return agent && typeof agent === "object" && "canonicalModel" in agent;
	}
}

/**
 * Exported instance of the content request processor
 */
export const requestProcessor = new ContentLlmRequestProcessor();

/**
 * Rearranges the async function_response events in the history.
 */
function rearrangeEventsForAsyncFunctionResponsesInHistory(
	events: Event[],
): Event[] {
	const functionCallIdToResponseEventsIndex: Record<string, number> = {};

	// Build mapping of function call IDs to event indices
	for (let i = 0; i < events.length; i++) {
		const event = events[i];
		// Safety check: ensure the event has the getFunctionResponses method
		if (!event || typeof event.getFunctionResponses !== "function") {
			continue; // Skip malformed events
		}
		const functionResponses = event.getFunctionResponses();
		if (functionResponses) {
			for (const functionResponse of functionResponses) {
				const functionCallId = functionResponse.id;
				if (functionCallId) {
					functionCallIdToResponseEventsIndex[functionCallId] = i;
				}
			}
		}
	}

	const resultEvents: Event[] = [];

	for (const event of events) {
		// Safety check: ensure the event has the required methods
		if (
			!event ||
			typeof event.getFunctionResponses !== "function" ||
			typeof event.getFunctionCalls !== "function"
		) {
			// If event is malformed, just add it to results and continue
			resultEvents.push(event);
			continue;
		}

		if (event.getFunctionResponses().length > 0) {
			// function_response should be handled together with function_call below.
			continue;
		}

		const functionCalls = event.getFunctionCalls();
		if (functionCalls.length > 0) {
			const functionResponseEventsIndices = new Set<number>();

			for (const functionCall of functionCalls) {
				const functionCallId = functionCall.id;
				if (
					functionCallId &&
					functionCallId in functionCallIdToResponseEventsIndex
				) {
					functionResponseEventsIndices.add(
						functionCallIdToResponseEventsIndex[functionCallId],
					);
				}
			}

			resultEvents.push(event);

			if (functionResponseEventsIndices.size === 0) {
				continue;
			}

			if (functionResponseEventsIndices.size === 1) {
				const index = Array.from(functionResponseEventsIndices)[0];
				resultEvents.push(events[index]);
			} else {
				// Merge all async function_response as one response event
				const eventsToMerge = Array.from(functionResponseEventsIndices)
					.sort((a, b) => a - b)
					.map((i) => events[i]);
				resultEvents.push(mergeFunctionResponseEvents(eventsToMerge));
			}
		} else {
			resultEvents.push(event);
		}
	}

	return resultEvents;
}

/**
 * Rearranges the events for the latest function_response.
 *
 * If the latest function_response is for an async function_call, all events
 * between the initial function_call and the latest function_response will be
 * removed.
 */
function rearrangeEventsForLatestFunctionResponse(events: Event[]): Event[] {
	if (!events.length) {
		return events;
	}

	const lastEvent = events[events.length - 1];

	// Safety check: ensure the event has the getFunctionResponses method
	if (!lastEvent || typeof lastEvent.getFunctionResponses !== "function") {
		// Event is not properly formed, skip processing
		return events;
	}

	const functionResponses = lastEvent.getFunctionResponses();

	if (!functionResponses || functionResponses.length === 0) {
		// No need to process, since the latest event is not function_response.
		return events;
	}

	// Rest of the function continues with function response processing...

	const functionResponsesIds = new Set<string>();
	for (const functionResponse of functionResponses) {
		if (functionResponse.id) {
			functionResponsesIds.add(functionResponse.id);
		}
	}

	// Check if the previous event has matching function calls
	if (events.length >= 2) {
		const prevEvent = events[events.length - 2];
		if (!prevEvent || typeof prevEvent.getFunctionCalls !== "function") {
			return events; // Safety check failed
		}
		const functionCalls = prevEvent.getFunctionCalls();
		if (functionCalls) {
			for (const functionCall of functionCalls) {
				// The latest function_response is already matched
				if (functionCall.id && functionResponsesIds.has(functionCall.id)) {
					return events;
				}
			}
		}
	}

	let functionCallEventIdx = -1;

	// Look for corresponding function call event reversely
	for (let idx = events.length - 2; idx >= 0; idx--) {
		const event = events[idx];
		if (!event || typeof event.getFunctionCalls !== "function") {
			continue; // Skip malformed events
		}
		const functionCalls = event.getFunctionCalls();
		if (functionCalls) {
			for (const functionCall of functionCalls) {
				if (functionCall.id && functionResponsesIds.has(functionCall.id)) {
					functionCallEventIdx = idx;
					break;
				}
			}
			if (functionCallEventIdx !== -1) {
				// In case the last response event only have part of the responses
				// for the function calls in the function call event
				for (const functionCall of functionCalls) {
					if (functionCall.id) {
						functionResponsesIds.add(functionCall.id);
					}
				}
				break;
			}
		}
	}

	if (functionCallEventIdx === -1) {
		return events;
	}

	// Collect all function response between last function response event
	// and function call event
	const functionResponseEvents: Event[] = [];
	for (let idx = functionCallEventIdx + 1; idx < events.length - 1; idx++) {
		const event = events[idx];
		if (!event || typeof event.getFunctionResponses !== "function") {
			continue; // Skip malformed events
		}
		const functionResponses = event.getFunctionResponses();
		if (
			functionResponses?.some((fr) => fr.id && functionResponsesIds.has(fr.id))
		) {
			functionResponseEvents.push(event);
		}
	}
	functionResponseEvents.push(events[events.length - 1]);

	const resultEvents = events.slice(0, functionCallEventIdx + 1);
	resultEvents.push(mergeFunctionResponseEvents(functionResponseEvents));

	return resultEvents;
}

/**
 * Gets the contents for the LLM request.
 * Applies filtering, rearrangement, and content processing to events.
 */
function getContents(
	currentBranch: string | undefined,
	events: Event[],
	agentName = "",
): Content[] {
	const filteredEvents: Event[] = [];

	// Parse the events, leaving the contents and the function calls and
	// responses from the current agent.
	for (const event of events) {
		if (
			!event.content ||
			!event.content.role ||
			!event.content.parts ||
			event.content.parts.length === 0
		) {
			// Skip events without content, or generated neither by user nor by model
			// or has no parts.
			// E.g. events purely for mutating session states.
			continue;
		}

		// Skip events that have no meaningful content (no text, function calls, or function responses)
		const hasAnyContent = event.content.parts.some(
			(part) => part.text || part.functionCall || part.functionResponse,
		);
		if (!hasAnyContent) {
			continue;
		}

		if (!isEventBelongsToBranch(currentBranch, event)) {
			// Skip events not belong to current branch.
			continue;
		}

		if (isAuthEvent(event)) {
			// Skip auth event
			continue;
		}

		filteredEvents.push(
			isOtherAgentReply(agentName, event) ? convertForeignEvent(event) : event,
		);
	}

	// Rearrange events for proper function call/response pairing
	let resultEvents = rearrangeEventsForLatestFunctionResponse(filteredEvents);
	resultEvents =
		rearrangeEventsForAsyncFunctionResponsesInHistory(resultEvents);

	const contents = [];
	for (const event of resultEvents) {
		const content = JSON.parse(JSON.stringify(event.content)); // Deep copy
		removeClientFunctionCallId(content);
		contents.push(content);
	}

	return contents;
}

/**
 * Gets contents for the current turn only (no conversation history).
 *
 * When include_contents='none', we want to include:
 * - The current user input
 * - Tool calls and responses from the current turn
 * But exclude conversation history from previous turns.
 *
 * In multi-agent scenarios, the "current turn" for an agent starts from an
 * actual user or from another agent.
 */
function getCurrentTurnContents(
	currentBranch: string | undefined,
	events: Event[],
	agentName = "",
): Content[] {
	// Find the latest event that starts the current turn and process from there
	for (let i = events.length - 1; i >= 0; i--) {
		const event = events[i];
		if (event.author === "user" || isOtherAgentReply(agentName, event)) {
			return getContents(currentBranch, events.slice(i), agentName);
		}
	}
	return [];
}

/**
 * Checks whether the event is a reply from another agent.
 */
function isOtherAgentReply(currentAgentName: string, event: Event): boolean {
	return Boolean(
		currentAgentName &&
			event.author !== currentAgentName &&
			event.author !== "user",
	);
}

/**
 * Converts an event authored by another agent as a user-content event.
 *
 * This is to provide another agent's output as context to the current agent, so
 * that current agent can continue to respond, such as summarizing previous
 * agent's reply, etc.
 */
function convertForeignEvent(event: Event): Event {
	if (!event.content || !event.content.parts) {
		return event;
	}

	const content: Content = {
		role: "user" as const,
		parts: [{ text: "For context:" }],
	};

	for (const part of event.content.parts) {
		if (part.text) {
			content.parts.push({
				text: `[${event.author}] said: ${part.text}`,
			});
		} else if (part.functionCall) {
			content.parts.push({
				text: `[${event.author}] called tool \`${part.functionCall.name}\` with parameters: ${JSON.stringify(part.functionCall.args)}`,
			});
		} else if (part.functionResponse) {
			content.parts.push({
				text: `[${event.author}] \`${part.functionResponse.name}\` tool returned result: ${JSON.stringify(part.functionResponse.response)}`,
			});
		} else {
			// Fallback to the original part for non-text and non-functionCall parts.
			content.parts.push(part);
		}
	}

	return new Event({
		timestamp: event.timestamp,
		author: "user",
		content: content,
		branch: event.branch,
	});
}

/**
 * Merges a list of function_response events into one event.
 *
 * The key goal is to ensure:
 * 1. function_call and function_response are always of the same number.
 * 2. The function_call and function_response are consecutively in the content.
 */
function mergeFunctionResponseEvents(functionResponseEvents: Event[]): Event {
	if (!functionResponseEvents.length) {
		throw new Error("At least one function_response event is required.");
	}

	const mergedEvent = JSON.parse(JSON.stringify(functionResponseEvents[0])); // Deep copy
	const partsInMergedEvent = mergedEvent.content.parts;

	if (!partsInMergedEvent) {
		throw new Error("There should be at least one function_response part.");
	}

	const partIndicesInMergedEvent: Record<string, number> = {};
	for (let idx = 0; idx < partsInMergedEvent.length; idx++) {
		const part = partsInMergedEvent[idx];
		if (part.functionResponse?.id) {
			partIndicesInMergedEvent[part.functionResponse.id] = idx;
		}
	}

	for (const event of functionResponseEvents.slice(1)) {
		if (!event.content.parts) {
			throw new Error("There should be at least one function_response part.");
		}

		for (const part of event.content.parts) {
			if (part.functionResponse?.id) {
				const functionCallId = part.functionResponse.id;
				if (functionCallId in partIndicesInMergedEvent) {
					partsInMergedEvent[partIndicesInMergedEvent[functionCallId]] = part;
				} else {
					partsInMergedEvent.push(part);
					partIndicesInMergedEvent[functionCallId] =
						partsInMergedEvent.length - 1;
				}
			} else {
				partsInMergedEvent.push(part);
			}
		}
	}

	return mergedEvent;
}

/**
 * Checks if event belongs to a branch.
 * Event belongs to a branch, when event.branch is prefix of the invocation branch.
 */
function isEventBelongsToBranch(
	invocationBranch: string | undefined,
	event: Event,
): boolean {
	if (!invocationBranch || !event.branch) {
		return true;
	}
	return invocationBranch.startsWith(event.branch);
}

/**
 * Checks if event is an auth event.
 */
function isAuthEvent(event: Event): boolean {
	if (!event.content.parts) {
		return false;
	}

	for (const part of event.content.parts) {
		if (
			part.functionCall &&
			part.functionCall.name === REQUEST_EUC_FUNCTION_CALL_NAME
		) {
			return true;
		}
		if (
			part.functionResponse &&
			part.functionResponse.name === REQUEST_EUC_FUNCTION_CALL_NAME
		) {
			return true;
		}
	}

	return false;
}
