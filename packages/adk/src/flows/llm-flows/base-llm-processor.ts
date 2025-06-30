import type { InvocationContext } from "../../agents/invocation-context";
import type { Event } from "../../events/event";
import type { LlmRequest } from "../../models/llm-request";
import type { LlmResponse } from "../../models/llm-response";

/**
 * Base class for LLM request processors.
 */
export abstract class BaseLlmRequestProcessor {
	/**
	 * Runs the processor on the given invocation context and LLM request.
	 * @param invocationContext The invocation context
	 * @param llmRequest The LLM request to process
	 * @returns An async generator yielding events
	 */
	abstract runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event, void, unknown>;
}

/**
 * Base class for LLM response processors.
 */
export abstract class BaseLlmResponseProcessor {
	/**
	 * Processes the LLM response.
	 * @param invocationContext The invocation context
	 * @param llmResponse The LLM response to process
	 * @returns An async generator yielding events
	 */
	abstract runAsync(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
	): AsyncGenerator<Event, void, unknown>;
}
