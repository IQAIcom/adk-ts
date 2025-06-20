import { Logger } from "@adk/helpers/logger";
import { Event } from "../../events/event";
import type { InvocationContext } from "../../agents/invocation-context";

const logger = new Logger({ name: "BaseLlmFlow" });

/**
 * A basic flow that calls the LLM in a loop until a final response is generated.
 * This flow ends when it transfers to another agent.
 *
 * This matches the Python implementation's BaseLlmFlow class.
 */
export abstract class BaseLlmFlow {
	/**
	 * Request processors that modify the LLM request before sending
	 */
	protected requestProcessors: any[] = [];

	/**
	 * Response processors that modify the LLM response after receiving
	 */
	protected responseProcessors: any[] = [];

	/**
	 * Constructor for BaseLlmFlow
	 */
	constructor() {
		// Initialize processor arrays
		this.requestProcessors = [];
		this.responseProcessors = [];
	}

	/**
	 * Runs the flow using async API (text-based conversation)
	 */
	async *runAsync(
		invocationContext: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		logger.debug(`Running flow for agent: ${invocationContext.agent.name}`);

		try {
			// Run one step at a time until completion or transfer
			while (!invocationContext.endInvocation) {
				yield* this.runOneStepAsync(invocationContext);

				// Break if the agent has completed or transferred
				if (invocationContext.endInvocation) {
					break;
				}
			}
		} catch (error) {
			logger.error("Error in flow execution:", error);

			// Yield error event
			const errorEvent = new Event({
				invocationId: invocationContext.invocationId,
				author: invocationContext.agent.name,
				branch: invocationContext.branch,
				content: {
					parts: [
						{
							text: `Flow error: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
				},
			});

			errorEvent.errorCode = "FLOW_EXECUTION_ERROR";
			errorEvent.errorMessage =
				error instanceof Error ? error.message : String(error);

			yield errorEvent;
		}
	}

	/**
	 * Runs the flow using live API (video/audio-based conversation)
	 */
	async *runLive(
		invocationContext: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		logger.debug(
			`Running live flow for agent: ${invocationContext.agent.name}`,
		);

		// For now, delegate to runAsync
		// In a full implementation, this would handle live audio/video connections
		yield* this.runAsync(invocationContext);
	}

	/**
	 * Runs one step of the flow
	 * This is where the main LLM interaction logic happens
	 */
	protected async *runOneStepAsync(
		invocationContext: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		logger.debug("Running one step of the flow");

		// For now, provide a simple implementation
		// In a full implementation, this would:
		// 1. Preprocess the request
		// 2. Call the LLM
		// 3. Postprocess the response
		// 4. Handle function calls
		// 5. Handle agent transfers

		// Simple placeholder implementation
		const event = new Event({
			invocationId: invocationContext.invocationId,
			author: invocationContext.agent.name,
			branch: invocationContext.branch,
			content: {
				parts: [
					{
						text: "Flow step completed. Full implementation needed.",
					},
				],
			},
		});

		// Mark as turn complete to end the flow
		event.turnComplete = true;
		invocationContext.endInvocation = true;

		yield event;
	}

	/**
	 * Preprocesses the LLM request
	 */
	protected async *preprocessAsync(
		invocationContext: InvocationContext,
		llmRequest: any, // Would be LlmRequest in full implementation
	): AsyncGenerator<Event, void, unknown> {
		// Run request processors
		for (const processor of this.requestProcessors) {
			// In full implementation, would call processor(invocationContext, llmRequest)
			logger.debug("Running request processor:", processor);
		}

		// No events yielded during preprocessing by default
		// Need at least one yield to make this a valid generator
		for await (const _ of []) {
			yield;
		}
	}

	/**
	 * Postprocesses the LLM response
	 */
	protected async *postprocessAsync(
		invocationContext: InvocationContext,
		llmRequest: any,
		llmResponse: any,
		modelResponseEvent: Event,
	): AsyncGenerator<Event, void, unknown> {
		// Run response processors
		for (const processor of this.responseProcessors) {
			// In full implementation, would call processor(invocationContext, llmResponse)
			logger.debug("Running response processor:", processor);
		}

		// No events yielded during postprocessing by default
		// Need at least one yield to make this a valid generator
		for await (const _ of []) {
			yield;
		}
	}
}
