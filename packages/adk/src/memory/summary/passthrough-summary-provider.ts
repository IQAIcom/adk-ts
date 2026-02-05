import type { Session } from "../../sessions/session";
import type { MemoryContent, MemorySummaryProvider } from "../types";

/**
 * A pass-through summary provider that extracts text from session events
 * without any LLM summarization.
 *
 * Use this when you want to store the full conversation text without
 * summarization, or when you want to handle summarization externally.
 *
 * @example
 * ```typescript
 * const memoryService = new MemoryService({
 *   storage: new InMemoryStorageProvider(),
 *   summaryProvider: new PassthroughSummaryProvider(),
 * });
 * ```
 */
export class PassthroughSummaryProvider implements MemorySummaryProvider {
	/**
	 * Extract text from session events without summarization.
	 * Returns MemoryContent with rawText populated.
	 */
	async summarize(session: Session): Promise<MemoryContent> {
		const rawText = this.extractText(session);

		return {
			rawText,
		};
	}

	/**
	 * Extract text from all session events.
	 */
	private extractText(session: Session): string {
		const parts: string[] = [];

		for (const event of session.events) {
			// Handle text property directly (from LlmResponse)
			if (event.text) {
				parts.push(`${event.author}: ${event.text}`);
				continue;
			}

			// Handle content with parts (Google GenAI format)
			if (event.content?.parts && Array.isArray(event.content.parts)) {
				const textParts = event.content.parts
					.filter(
						(part: { text?: string }) =>
							typeof part.text === "string" && part.text.length > 0,
					)
					.map((part: { text: string }) => part.text);

				if (textParts.length > 0) {
					parts.push(`${event.author}: ${textParts.join(" ")}`);
				}
			}
		}

		return parts.join("\n");
	}
}
