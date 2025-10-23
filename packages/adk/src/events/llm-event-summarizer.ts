import type { Content } from "@google/genai";
import type { BaseLlm } from "../models/base-llm";
import { LlmRequest } from "../models/llm-request";
import { Event } from "./event";
import { EventActions } from "./event-actions";
import type { EventsSummarizer } from "./events-summarizer";

const DEFAULT_SUMMARIZATION_PROMPT = `You are a helpful assistant tasked with summarizing a conversation history.
Please provide a concise summary of the following events, capturing the key information and context.
Focus on the main topics discussed, important decisions made, and any action items or results.

Events to summarize:
{events}

Provide your summary in a clear, concise format.`;

/**
 * LLM-based event summarizer that uses a language model to generate summaries.
 */
export class LlmEventSummarizer implements EventsSummarizer {
	private model: BaseLlm;
	private prompt: string;

	/**
	 * Creates a new LLM event summarizer.
	 * @param model - The LLM model to use for summarization
	 * @param prompt - Optional custom prompt template. Use {events} as placeholder for event content.
	 */
	constructor(model: BaseLlm, prompt?: string) {
		this.model = model;
		this.prompt = prompt || DEFAULT_SUMMARIZATION_PROMPT;
	}

	/**
	 * Summarizes events using the configured LLM.
	 */
	async maybeSummarizeEvents(events: Event[]): Promise<Event | undefined> {
		if (!events || events.length === 0) {
			return undefined;
		}

		const eventsText = this.formatEventsForSummarization(events);
		const promptWithEvents = this.prompt.replace("{events}", eventsText);

		const llmRequest = new LlmRequest({
			contents: [
				{
					role: "user",
					parts: [{ text: promptWithEvents }],
				},
			],
		});

		let summaryText = "";
		for await (const response of this.model.generateContentAsync(llmRequest)) {
			summaryText += response.content?.parts
				?.map((part) => part.text || "")
				.join("");
		}

		summaryText = summaryText.trim();

		if (!summaryText) {
			return undefined;
		}

		const summaryContent: Content = {
			role: "model",
			parts: [{ text: summaryText }],
		};

		const compactionEvent = new Event({
			invocationId: Event.newId(),
			author: "user",
			actions: new EventActions({
				compaction: {
					startTimestamp: events[0].timestamp,
					endTimestamp: events[events.length - 1].timestamp,
					compactedContent: summaryContent,
				},
			}),
		});

		return compactionEvent;
	}

	/**
	 * Formats events into a readable text format for summarization.
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
}
