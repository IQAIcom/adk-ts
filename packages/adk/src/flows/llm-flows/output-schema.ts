import { jsonrepair } from "jsonrepair";
import type { InvocationContext } from "../../agents/invocation-context";
import { Event } from "../../events/event";
import { Logger } from "../../logger";
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

		// Skip validation if individual schema validation is disabled for this agent
		// (e.g., when used in SequentialAgent/ParallelAgent where container handles validation)
		if (
			"disableIndividualSchemaValidation" in agent &&
			agent.disableIndividualSchemaValidation
		) {
			this.logger.debug(
				`Skipping individual schema validation for agent ${agent.name} (disabled by container agent)`,
			);
			return;
		}

		// Extract text content from response parts
		const textContent = llmResponse.content.parts
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
			// Prepare candidate JSON text by stripping fences
			const candidate = this.stripCodeFences(textContent);

			// Validate by trying JSON first, then raw text for primitive schemas
			const validated: any = (() => {
				try {
					const parsedJson = this.tryParseJson(candidate, agent.name);
					return (agent.outputSchema as any).parse(parsedJson);
				} catch {
					return (agent.outputSchema as any).parse(candidate);
				}
			})();

			// Normalize content to string
			const normalized =
				typeof validated === "string"
					? validated
					: JSON.stringify(validated, null, 2);

			// Update the response parts with the validated content
			llmResponse.content.parts = llmResponse.content.parts.map((part) => {
				if (part && typeof part === "object" && "text" in part) {
					return {
						...part,
						text: normalized,
					};
				}
				return part;
			});

			this.logger.debug("Output schema validation successful", {
				agent: agent.name,
				originalLength: normalized.length,
				validatedKeys:
					typeof validated === "object" && validated !== null
						? Object.keys(validated)
						: [],
			});
		} catch (error) {
			// Create error message with detailed information
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const detailedError = `Output schema validation failed for agent '${agent.name}': ${errorMessage}`;

			this.logger.error(detailedError, {
				agent: agent.name,
				responseContent:
					textContent.substring(0, 200) +
					(textContent.length > 200 ? "..." : ""),
				error: errorMessage,
			});

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

	// Strip common code fences and surrounding explanatory text from LLM output.
	private stripCodeFences(raw: string): string {
		// Prefer explicit triple-backtick fenced blocks (```json or ```)
		const fencePattern = /```(?:json)?\s*([\s\S]*?)```/i;
		const fenceMatch = raw.match(fencePattern);
		if (fenceMatch?.[1]) {
			return fenceMatch[1].trim();
		}

		// Remove lines that look like prose before the JSON (e.g. "Here's the JSON:")
		const lines = raw.split(/\r?\n/).map((l) => l.trim());
		const startIdx = lines.findIndex(
			(l) => l.startsWith("{") || l.startsWith("["),
		);
		if (startIdx >= 0) {
			return lines.slice(startIdx).join("\n").trim();
		}

		return raw.trim();
	}

	// Try parsing JSON; if parse fails, attempt to repair using jsonrepair and parse again.
	private tryParseJson(candidate: string, agentName: string): any {
		try {
			return JSON.parse(candidate);
		} catch (err) {
			this.logger.debug("Initial JSON.parse failed, attempting jsonrepair", {
				agent: agentName,
			});
			try {
				const repaired = jsonrepair(candidate as string);
				return JSON.parse(repaired);
			} catch (repairErr) {
				// If repair also fails, rethrow the original parse error
				throw err;
			}
		}
	}
}

/**
 * Export the response processor instance
 */
export const responseProcessor = new OutputSchemaResponseProcessor();
