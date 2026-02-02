import type { Event } from "../../events/event";
import { LlmRequest } from "../../models/llm-request";
import { LLMRegistry } from "../../models/llm-registry";
import type { Session } from "../../sessions/session";
import type { SessionSummary, SummaryProvider } from "../types";

const DEFAULT_SUMMARIZATION_PROMPT = `You are a helpful assistant tasked with summarizing a conversation session.
Please analyze the following conversation and provide a structured summary.

Conversation:
{events}

Respond with a JSON object containing:
- "summary": A concise summary (2-4 sentences) capturing the main points
- "topics": An array of key topics discussed (2-5 topics)
- "keyFacts": An array of important facts or decisions made (2-5 facts)

Respond ONLY with the JSON object, no additional text.`;

interface LlmSummaryProviderConfig {
	/**
	 * The model ID to use for summarization (e.g., "gpt-4o-mini", "gemini-2.0-flash")
	 */
	model: string;

	/**
	 * Custom prompt template. Use {events} as placeholder for event content.
	 */
	prompt?: string;
}

/**
 * Summary provider that uses an LLM to generate session summaries.
 */
export class LlmSummaryProvider implements SummaryProvider {
	private modelId: string;
	private prompt: string;

	/**
	 * Creates a new LLM summary provider
	 */
	constructor(config: LlmSummaryProviderConfig) {
		this.modelId = config.model;
		this.prompt = config.prompt || DEFAULT_SUMMARIZATION_PROMPT;
	}

	/**
	 * Generates summaries from a session using the configured LLM
	 */
	async getSummaries(session: Session): Promise<SessionSummary[]> {
		if (!session.events || session.events.length === 0) {
			return [];
		}

		const events = session.events.filter(
			(event) => event.content?.parts?.length,
		);

		if (events.length === 0) {
			return [];
		}

		const eventsText = this.formatEventsForSummarization(events);
		const promptWithEvents = this.prompt.replace("{events}", eventsText);

		const model = LLMRegistry.newLLM(this.modelId);

		const llmRequest = new LlmRequest({
			contents: [
				{
					role: "user",
					parts: [{ text: promptWithEvents }],
				},
			],
		});

		let responseText = "";
		for await (const response of model.generateContentAsync(llmRequest)) {
			responseText += response.content?.parts
				?.map((part) => part.text || "")
				.join("");
		}

		responseText = responseText.trim();

		if (!responseText) {
			return [];
		}

		try {
			const parsed = this.parseResponse(responseText);

			const summary: SessionSummary = {
				summary: parsed.summary || responseText,
				topics: parsed.topics,
				keyFacts: parsed.keyFacts,
				startTimestamp: events[0]?.timestamp,
				endTimestamp: events[events.length - 1]?.timestamp,
				eventCount: events.length,
			};

			return [summary];
		} catch {
			// If JSON parsing fails, use the raw response as the summary
			return [
				{
					summary: responseText,
					startTimestamp: events[0]?.timestamp,
					endTimestamp: events[events.length - 1]?.timestamp,
					eventCount: events.length,
				},
			];
		}
	}

	/**
	 * Formats events into a readable text format for summarization
	 */
	private formatEventsForSummarization(events: Event[]): string {
		const lines: string[] = [];

		for (const event of events) {
			const timestamp = new Date(event.timestamp * 1000).toISOString();
			const author = event.author;

			if (event.content?.parts) {
				for (const part of event.content.parts) {
					if (part.text) {
						lines.push(`[${timestamp}] ${author}: ${part.text}`);
					} else if (part.functionCall) {
						lines.push(
							`[${timestamp}] ${author}: Called tool '${part.functionCall.name}' with args ${JSON.stringify(part.functionCall.args)}`,
						);
					} else if (part.functionResponse) {
						lines.push(
							`[${timestamp}] ${author}: Tool '${part.functionResponse.name}' returned: ${JSON.stringify(part.functionResponse.response)}`,
						);
					}
				}
			}
		}

		return lines.join("\n");
	}

	/**
	 * Parses the LLM response, handling both JSON and markdown-wrapped JSON
	 */
	private parseResponse(text: string): {
		summary?: string;
		topics?: string[];
		keyFacts?: string[];
	} {
		// Try to extract JSON from markdown code blocks
		const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		const jsonText = jsonMatch ? jsonMatch[1].trim() : text;

		return JSON.parse(jsonText);
	}
}
