import { describe, it, expect, vi, beforeEach } from "vitest";
import { Event } from "@adk/events";
import type { InvocationContext } from "@adk/agents";
import type { BaseAgent } from "@adk/agents";
import { SingleFlow } from "@adk/flows";

vi.mock("@adk/helpers/logger", () => ({
	Logger: vi.fn(() => ({
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
	})),
}));

class TestLlmFlow extends SingleFlow {
	public _runOneStepAsync = vi.fn();
}

const mockAgent = {
	name: "test-agent",
} as BaseAgent;

const mockContext = {
	invocationId: "test-inv-123",
	agent: mockAgent,
	branch: "test-branch",
} as InvocationContext;

describe("BaseLlmFlow.runAsync", () => {
	let flow: TestLlmFlow;

	beforeEach(() => {
		vi.clearAllMocks();
		flow = new TestLlmFlow();
	});

	it("should run steps until a final response event is yielded", async () => {
		const nonFinalEvent = new Event({ author: "agent" });
		vi.spyOn(nonFinalEvent, "isFinalResponse").mockReturnValue(false);

		const finalEvent = new Event({ author: "agent" });
		vi.spyOn(finalEvent, "isFinalResponse").mockReturnValue(true);

		flow._runOneStepAsync
			.mockImplementationOnce(async function* () {
				yield nonFinalEvent;
			})
			.mockImplementationOnce(async function* () {
				yield finalEvent;
			});

		const yieldedEvents = [];
		for await (const event of flow.runAsync(mockContext)) {
			yieldedEvents.push(event);
		}

		expect(flow._runOneStepAsync).toHaveBeenCalledTimes(2);
		expect(flow._runOneStepAsync).toHaveBeenCalledWith(mockContext);

		expect(yieldedEvents).toHaveLength(2);
		expect(yieldedEvents[0]).toBe(nonFinalEvent);
		expect(yieldedEvents[1]).toBe(finalEvent);
	});

	it("should break the loop if a step yields no events", async () => {
		flow._runOneStepAsync.mockImplementationOnce(async function* () {});

		const yieldedEvents = [];
		for await (const event of flow.runAsync(mockContext)) {
			yieldedEvents.push(event);
		}

		expect(flow._runOneStepAsync).toHaveBeenCalledTimes(1);

		expect(yieldedEvents).toHaveLength(0);
	});

	it("should throw an error if the last event of a step is partial", async () => {
		const partialEvent = new Event({ author: "agent", partial: true });
		vi.spyOn(partialEvent, "isFinalResponse").mockReturnValue(false);

		flow._runOneStepAsync.mockImplementation(async function* () {
			yield partialEvent;
		});

		const generator = flow.runAsync(mockContext);

		await generator.next();

		await expect(generator.next()).rejects.toThrow(
			"Last event shouldn't be partial. LLM max output limit may be reached.",
		);
	});

	it("should continue looping if a step's last event is not final and not partial", async () => {
		const nonFinalEvent1 = new Event({ author: "agent", partial: false });
		vi.spyOn(nonFinalEvent1, "isFinalResponse").mockReturnValue(false);

		const nonFinalEvent2 = new Event({ author: "agent", partial: false });
		vi.spyOn(nonFinalEvent2, "isFinalResponse").mockReturnValue(false);

		const finalEvent = new Event({ author: "agent" });
		vi.spyOn(finalEvent, "isFinalResponse").mockReturnValue(true);

		flow._runOneStepAsync
			.mockImplementationOnce(async function* () {
				yield nonFinalEvent1;
			})
			.mockImplementationOnce(async function* () {
				yield nonFinalEvent2;
			})
			.mockImplementationOnce(async function* () {
				yield finalEvent;
			});

		const yieldedEvents = [];
		for await (const event of flow.runAsync(mockContext)) {
			yieldedEvents.push(event);
		}

		expect(flow._runOneStepAsync).toHaveBeenCalledTimes(3);
		expect(yieldedEvents).toHaveLength(3);
	});
});
