import { describe, it, expect } from "vitest";
import {
	textStreamFrom,
	collectTextFrom,
	streamTextWithFinalEvent,
} from "../../utils/streaming-utils";
import { Event } from "../../events/event";

// Helper function to create mock Event objects
function createMockEvent(
	text: string,
	partial = true,
	author = "assistant",
): Event {
	return new Event({
		author,
		content: {
			parts: [{ text }],
		},
		partial,
	});
}

// Helper to create an async generator from events
async function* createEventStream(events: Event[]): AsyncGenerator<Event> {
	for (const event of events) {
		yield event;
	}
}

describe("textStreamFrom", () => {
	it("should extract text from partial events", async () => {
		const events = [
			createMockEvent("Hello", true),
			createMockEvent(" world", true),
			createMockEvent("!", false), // Final event
		];

		const textChunks: string[] = [];
		for await (const text of textStreamFrom(createEventStream(events))) {
			textChunks.push(text);
		}

		expect(textChunks).toEqual(["Hello", " world"]);
	});

	it("should ignore non-partial events", async () => {
		const events = [
			createMockEvent("Hello", true),
			createMockEvent(" world", false), // Non-partial, should be ignored
		];

		const textChunks: string[] = [];
		for await (const text of textStreamFrom(createEventStream(events))) {
			textChunks.push(text);
		}

		expect(textChunks).toEqual(["Hello"]);
	});

	it("should handle events with multiple text parts", async () => {
		const event = new Event({
			author: "assistant",
			content: {
				parts: [{ text: "Part 1" }, { text: "Part 2" }],
			},
			partial: true,
		});

		const textChunks: string[] = [];
		for await (const text of textStreamFrom(createEventStream([event]))) {
			textChunks.push(text);
		}

		expect(textChunks).toEqual(["Part 1", "Part 2"]);
	});

	it("should handle events with no text parts", async () => {
		const event = new Event({
			author: "assistant",
			content: {
				parts: [{ functionCall: { name: "test", args: {} } }],
			},
			partial: true,
		});

		const textChunks: string[] = [];
		for await (const text of textStreamFrom(createEventStream([event]))) {
			textChunks.push(text);
		}

		expect(textChunks).toEqual([]);
	});

	it("should handle empty event stream", async () => {
		const textChunks: string[] = [];
		for await (const text of textStreamFrom(createEventStream([]))) {
			textChunks.push(text);
		}

		expect(textChunks).toEqual([]);
	});

	it("should handle events with undefined content", async () => {
		const event = new Event({
			author: "assistant",
			partial: true,
		});

		const textChunks: string[] = [];
		for await (const text of textStreamFrom(createEventStream([event]))) {
			textChunks.push(text);
		}

		expect(textChunks).toEqual([]);
	});

	it("should stream a complete story example", async () => {
		const events = [
			createMockEvent("Once", true),
			createMockEvent(" upon", true),
			createMockEvent(" a", true),
			createMockEvent(" time", true),
			createMockEvent("...", false), // Final
		];

		const textChunks: string[] = [];
		for await (const text of textStreamFrom(createEventStream(events))) {
			textChunks.push(text);
		}

		expect(textChunks).toEqual(["Once", " upon", " a", " time"]);
		expect(textChunks.join("")).toBe("Once upon a time");
	});
});

describe("collectTextFrom", () => {
	it("should collect all text from stream", async () => {
		const events = [
			createMockEvent("Hello", true),
			createMockEvent(" world", true),
			createMockEvent("!", true),
			createMockEvent("", false),
		];

		const fullText = await collectTextFrom(createEventStream(events));
		expect(fullText).toBe("Hello world!");
	});

	it("should return empty string for empty stream", async () => {
		const fullText = await collectTextFrom(createEventStream([]));
		expect(fullText).toBe("");
	});

	it("should collect only partial event text", async () => {
		const events = [
			createMockEvent("Partial 1", true),
			createMockEvent("Partial 2", true),
			createMockEvent("Final (not included)", false),
		];

		const fullText = await collectTextFrom(createEventStream(events));
		expect(fullText).toBe("Partial 1Partial 2");
	});

	it("should handle multiline text", async () => {
		const events = [
			createMockEvent("Line 1\n", true),
			createMockEvent("Line 2\n", true),
			createMockEvent("Line 3", true),
		];

		const fullText = await collectTextFrom(createEventStream(events));
		expect(fullText).toBe("Line 1\nLine 2\nLine 3");
	});
});

describe("streamTextWithFinalEvent", () => {
	it("should stream text and provide final event", async () => {
		const events = [
			createMockEvent("Hello", true),
			createMockEvent(" world", true),
			createMockEvent("", false), // Final event
		];

		const { textStream, finalEvent } = streamTextWithFinalEvent(
			createEventStream(events),
		);

		const textChunks: string[] = [];
		for await (const text of textStream) {
			textChunks.push(text);
		}

		const final = await finalEvent;

		expect(textChunks).toEqual(["Hello", " world"]);
		expect(final).toBeDefined();
		expect(final?.partial).toBe(false);
	});

	it("should resolve finalEvent with last event", async () => {
		const lastEvent = createMockEvent("Final", false);
		const events = [
			createMockEvent("First", true),
			createMockEvent("Second", true),
			lastEvent,
		];

		const { textStream, finalEvent } = streamTextWithFinalEvent(
			createEventStream(events),
		);

		// Consume the stream
		for await (const _text of textStream) {
			// Just consume
		}

		const final = await finalEvent;
		expect(final).toBe(lastEvent);
	});

	it("should work with empty stream", async () => {
		const { textStream, finalEvent } = streamTextWithFinalEvent(
			createEventStream([]),
		);

		const textChunks: string[] = [];
		for await (const text of textStream) {
			textChunks.push(text);
		}

		const final = await finalEvent;

		expect(textChunks).toEqual([]);
		expect(final).toBeUndefined();
	});

	it("should allow accessing finalEvent before consuming stream", async () => {
		const events = [createMockEvent("Hello", true), createMockEvent("", false)];

		const { textStream, finalEvent } = streamTextWithFinalEvent(
			createEventStream(events),
		);

		// Start consuming stream
		const streamPromise = (async () => {
			const chunks: string[] = [];
			for await (const text of textStream) {
				chunks.push(text);
			}
			return chunks;
		})();

		// Can await both concurrently
		const [chunks, final] = await Promise.all([streamPromise, finalEvent]);

		expect(chunks).toEqual(["Hello"]);
		expect(final?.partial).toBe(false);
	});

	it("should include events with function calls", async () => {
		const finalEvent = new Event({
			author: "assistant",
			content: {
				parts: [
					{ text: "I'll search for that." },
					{ functionCall: { name: "search", args: { query: "test" } } },
				],
			},
			partial: false,
		});

		const events = [createMockEvent("Let me", true), finalEvent];

		const { textStream, finalEvent: finalEventPromise } =
			streamTextWithFinalEvent(createEventStream(events));

		// Consume stream
		const chunks: string[] = [];
		for await (const text of textStream) {
			chunks.push(text);
		}

		const final = await finalEventPromise;

		expect(chunks).toEqual(["Let me"]);
		expect(final).toBe(finalEvent);
		expect(final?.getFunctionCalls()).toHaveLength(1);
		expect(final?.getFunctionCalls()[0].name).toBe("search");
	});

	it("should handle stream with only final event", async () => {
		const finalEvent = createMockEvent("Only final", false);
		const events = [finalEvent];

		const { textStream, finalEvent: finalEventPromise } =
			streamTextWithFinalEvent(createEventStream(events));

		const chunks: string[] = [];
		for await (const text of textStream) {
			chunks.push(text);
		}

		const final = await finalEventPromise;

		expect(chunks).toEqual([]);
		expect(final).toBe(finalEvent);
	});
});
