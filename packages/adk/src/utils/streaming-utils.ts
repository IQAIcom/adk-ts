import type { Event } from "../events/event";

/**
 * Utility function to extract text-only deltas from an event stream.
 *
 * This is a convenience helper for simple use cases where you only need
 * the streaming text output without full Event objects. For more complex
 * use cases requiring tool calls, metadata, or usage tracking, use the
 * full Event stream from `runAsync()` directly.
 *
 * @example
 * ```typescript
 * import { textStreamFrom } from '@iqai/adk/utils';
 *
 * const events = runner.runAsync({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   newMessage: { role: 'user', parts: [{ text: 'Tell me a story' }] }
 * });
 *
 * // Simple text-only streaming
 * for await (const text of textStreamFrom(events)) {
 *   process.stdout.write(text);
 * }
 * ```
 *
 * @param events - AsyncIterable of Event objects from runner.runAsync()
 * @returns AsyncGenerator yielding only text deltas as strings
 */
export async function* textStreamFrom(
	events: AsyncIterable<Event>,
): AsyncGenerator<string, void, unknown> {
	for await (const event of events) {
		// Only yield text from partial (streaming) events
		if (event.partial && event.content?.parts) {
			// Extract text from all parts that contain text
			for (const part of event.content.parts) {
				if (part.text) {
					yield part.text;
				}
			}
		}
	}
}

/**
 * Utility function to collect the complete text from an event stream.
 *
 * This helper accumulates all text deltas and returns the final complete
 * text once streaming is finished. Useful when you want streaming behavior
 * but need the full text at the end.
 *
 * @example
 * ```typescript
 * import { collectTextFrom } from '@iqai/adk/utils';
 *
 * const events = runner.runAsync({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   newMessage: { role: 'user', parts: [{ text: 'Hello' }] }
 * });
 *
 * const fullText = await collectTextFrom(events);
 * console.log(fullText); // Complete response text
 * ```
 *
 * @param events - AsyncIterable of Event objects from runner.runAsync()
 * @returns Promise resolving to the complete text
 */
export async function collectTextFrom(
	events: AsyncIterable<Event>,
): Promise<string> {
	let fullText = "";
	for await (const text of textStreamFrom(events)) {
		fullText += text;
	}
	return fullText;
}

/**
 * Utility function to get both streaming text and the final event.
 *
 * This helper yields text deltas during streaming and returns the final
 * complete Event object at the end. Useful when you want to stream text
 * but also need access to metadata like usage stats and tool calls.
 *
 * @example
 * ```typescript
 * import { streamTextWithFinalEvent } from '@iqai/adk/utils';
 *
 * const events = runner.runAsync({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   newMessage: { role: 'user', parts: [{ text: 'Calculate 2+2' }] }
 * });
 *
 * const { textStream, finalEvent } = streamTextWithFinalEvent(events);
 *
 * // Stream the text as it arrives
 * for await (const text of textStream) {
 *   process.stdout.write(text);
 * }
 *
 * // Get the final event with metadata
 * const final = await finalEvent;
 * console.log('Tokens used:', final.usageMetadata?.totalTokens);
 * console.log('Tool calls:', final.getFunctionCalls());
 * ```
 *
 * @param events - AsyncIterable of Event objects from runner.runAsync()
 * @returns Object with textStream AsyncGenerator and finalEvent Promise
 */
export function streamTextWithFinalEvent(events: AsyncIterable<Event>): {
	textStream: AsyncGenerator<string, void, unknown>;
	finalEvent: Promise<Event | undefined>;
} {
	let finalEventResolve: (event: Event | undefined) => void;
	const finalEventPromise = new Promise<Event | undefined>((resolve) => {
		finalEventResolve = resolve;
	});

	const textStream = async function* (): AsyncGenerator<string, void, unknown> {
		let lastEvent: Event | undefined;

		for await (const event of events) {
			lastEvent = event;

			// Yield text from partial events
			if (event.partial && event.content?.parts) {
				for (const part of event.content.parts) {
					if (part.text) {
						yield part.text;
					}
				}
			}
		}

		// Resolve with the last (final) event
		finalEventResolve(lastEvent);
	};

	return {
		textStream: textStream(),
		finalEvent: finalEventPromise,
	};
}
