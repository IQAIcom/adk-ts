import { Logger } from "@adk/logger";
import type { InvocationContext } from "../../agents/invocation-context";
import { Event } from "../../events/event";
import type { LlmResponse } from "../../models/llm-response";
import { BaseLlmResponseProcessor } from "./base-llm-processor";

/**
 * Response processor for Output Schema validation and parsing
 *
 * This processor validates and parses LLM responses against the agent's output schema if specified.
 * It runs during the response processing phase and ensures that the response content conforms to
 * the expected structure defined by the agent's Zod schema.
 *
 * Key features:
 * - Validates JSON responses against Zod schemas
 * - Parses and formats valid responses
 * - Generates detailed error events for validation failures
 * - Updates response content with validated, typed data
 *
 * The processor only runs for agents that have an outputSchema configured and skips
 * processing for responses without content or for agents without schemas.
 */
class OutputSchemaResponseProcessor extends BaseLlmResponseProcessor {
	private logger = new Logger({ name: "OutputSchemaResponseProcessor" });

	async *runAsync(
		invocationContext: InvocationContext,
		llmResponse: LlmResponse,
	): AsyncGenerator<Event> {
		// Check if response has content to process
		if (
			!llmResponse ||
			!llmResponse.content ||
			!llmResponse.content.parts ||
			llmResponse.content.parts.length === 0
		) {
			return;
		}

		const agent = invocationContext.agent;

		// Only process agents with output schema
		if (!("outputSchema" in agent) || !agent.outputSchema) {
			return;
		}

		// Extract text content from response parts
		let textContent = llmResponse.content.parts
			.map((part) => {
				if (part && typeof part === "object" && "text" in part) {
					return part.text || "";
				}
				return "";
			})
			.join("");

		// Skip empty content
		if (!textContent.trim()) {
			return;
		}

		try {
			// Parse and validate the JSON content against the schema
			const parsed = JSON.parse(textContent);
			const validated = (agent.outputSchema as any).parse(parsed);

			// Update the response content with validated data
			// This ensures downstream processors get the validated, typed data
			textContent = JSON.stringify(validated, null, 2);

			// Update the response parts with the validated content
			llmResponse.content.parts = llmResponse.content.parts.map((part) => {
				if (part && typeof part === "object" && "text" in part) {
					return {
						...part,
						text: textContent,
					};
				}
				return part;
			});

			this.logger.debug(
				{
					agent: agent.name,
					originalLength: textContent.length,
					validatedKeys: Object.keys(validated),
				},
				"Output schema validation successful",
			);
		} catch (error) {
			// Create error message with detailed information
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const detailedError = `Output schema validation failed for agent '${agent.name}': ${errorMessage}`;

			this.logger.error(
				{
					agent: agent.name,
					responseContent:
						textContent.substring(0, 200) +
						(textContent.length > 200 ? "..." : ""),
					err: error instanceof Error ? error : new Error(String(error)),
				},
				detailedError,
			);

			// Update response with error information
			llmResponse.errorCode = "OUTPUT_SCHEMA_VALIDATION_FAILED";
			llmResponse.errorMessage = detailedError;
			llmResponse.error = new Error(detailedError);

			// Create error event
			const errorEvent = new Event({
				id: Event.newId(),
				invocationId: invocationContext.invocationId,
				author: agent.name,
				branch: invocationContext.branch,
				content: {
					role: "assistant",
					parts: [
						{
							text: `Error: ${detailedError}`,
						},
					],
				},
			});

			// Set error properties on the event (it extends LlmResponse)
			errorEvent.errorCode = "OUTPUT_SCHEMA_VALIDATION_FAILED";
			errorEvent.errorMessage = detailedError;
			errorEvent.error = new Error(detailedError);

			yield errorEvent;
		}
	}
}

/**
 * Export the response processor instance
 */
export const responseProcessor = new OutputSchemaResponseProcessor();
