import { describe, it, expect, vi } from "vitest";
import { Event } from "../events/event";
import type { Session } from "../sessions/session";
import { _findFunctionCallEventIfLastEventIsFunctionResponse } from "../runners";

const createMockSession = (events: (Event | null)[] | null): Session =>
	({
		id: `s-${Math.random()}`,
		userId: `u-${Math.random()}`,
		events,
	}) as Session;

const createFunctionCallEvent = (
	calls: { id: string; name: string }[],
): Event => {
	const event = new Event({ author: "agent" });
	vi.spyOn(event, "getFunctionCalls").mockReturnValue(
		calls.map((call) => ({ ...call, args: {} })),
	);
	return event;
};

const createFunctionResponseEvent = (response: {
	id: string;
	name: string;
}): Event => {
	return new Event({
		author: "tool",
		content: {
			parts: [
				{
					functionResponse: { ...response, response: { result: "ok" } },
				},
			],
		},
	});
};

describe("_findFunctionCallEventIfLastEventIsFunctionResponse", () => {
	it("should return null if session has no events", () => {
		const sessionWithNullEvents = createMockSession(null);
		const sessionWithEmptyEvents = createMockSession([]);

		expect(
			_findFunctionCallEventIfLastEventIsFunctionResponse(
				sessionWithNullEvents,
			),
		).toBeNull();
		expect(
			_findFunctionCallEventIfLastEventIsFunctionResponse(
				sessionWithEmptyEvents,
			),
		).toBeNull();
	});

	it("should return null if the last event is not a function response", () => {
		const session = createMockSession([
			new Event({ author: "agent4", content: { parts: [{ text: "hello" }] } }),
		]);
		expect(
			_findFunctionCallEventIfLastEventIsFunctionResponse(session),
		).toBeNull();
	});

	it("should return null if the function response has no ID", () => {
		const responseEvent = new Event({
			author: "agent4",
			content: {
				parts: [{ functionResponse: { name: "tool1", response: {} } }],
			},
		});
		const session = createMockSession([responseEvent]);
		expect(
			_findFunctionCallEventIfLastEventIsFunctionResponse(session),
		).toBeNull();
	});

	it("should return null if no matching function call is found", () => {
		const callEvent = createFunctionCallEvent([
			{ id: "call_other", name: "other_tool" },
		]);
		const responseEvent = createFunctionResponseEvent({
			id: "call_123",
			name: "tool1",
		});
		const session = createMockSession([callEvent, responseEvent]);
		expect(
			_findFunctionCallEventIfLastEventIsFunctionResponse(session),
		).toBeNull();
	});

	it("should return the event with the matching function call", () => {
		const functionCallEvent = createFunctionCallEvent([
			{ id: "call_abc", name: "tool1" },
		]);
		const responseEvent = createFunctionResponseEvent({
			id: "call_abc",
			name: "tool1",
		});
		const session = createMockSession([functionCallEvent, responseEvent]);
		const result = _findFunctionCallEventIfLastEventIsFunctionResponse(session);
		expect(result).toBe(functionCallEvent);
	});

	it("should find the matching call even if it's not the immediately preceding event", () => {
		const functionCallEvent = createFunctionCallEvent([
			{ id: "call_def", name: "tool2" },
		]);
		const intermediateEvent = new Event({
			author: "agent4",
			content: { parts: [{ text: "intermediate" }] },
		});
		vi.spyOn(intermediateEvent, "getFunctionCalls").mockReturnValue([]);
		const responseEvent = createFunctionResponseEvent({
			id: "call_def",
			name: "tool2",
		});
		const session = createMockSession([
			functionCallEvent,
			intermediateEvent,
			responseEvent,
		]);
		const result = _findFunctionCallEventIfLastEventIsFunctionResponse(session);
		expect(result).toBe(functionCallEvent);
	});

	it("should find the correct event when it contains multiple function calls", () => {
		const functionCallEvent = createFunctionCallEvent([
			{ id: "call_A", name: "toolA" },
			{ id: "call_B", name: "toolB" },
			{ id: "call_C", name: "toolC" },
		]);
		const responseEvent = createFunctionResponseEvent({
			id: "call_B",
			name: "toolB",
		});
		const session = createMockSession([functionCallEvent, responseEvent]);
		const result = _findFunctionCallEventIfLastEventIsFunctionResponse(session);
		expect(result).toBe(functionCallEvent);
	});
});
