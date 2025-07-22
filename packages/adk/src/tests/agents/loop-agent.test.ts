import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoopAgent } from "../../agents/loop-agent";
import { BaseAgent } from "../../agents/base-agent";
import { Event } from "../../events/event";
import type { InvocationContext } from "../../agents/invocation-context";

class MockSubAgent extends BaseAgent {
	runAsync = vi.fn();

	constructor(name: string) {
		super({ name, description: "" });
	}
}

const mockContext: InvocationContext = {
	invocationId: "test-inv-id",
	agent: {} as any,
	branch: [],
	session: {
		id: "ses-123",
		userId: "user-123",
		appName: "test-app",
		state: {},
		events: [],
		lastUpdateTime: 0,
	} as any,
	endInvocation: false,
	createChildContext: vi.fn(),
} as unknown as InvocationContext;

describe("LoopAgent", () => {
	let subAgent1: MockSubAgent;
	let subAgent2: MockSubAgent;

	beforeEach(() => {
		vi.clearAllMocks();
		subAgent1 = new MockSubAgent("subAgent1");
		subAgent2 = new MockSubAgent("subAgent2");
	});

	describe("Constructor", () => {
		it("should initialize properties correctly from config", () => {
			const agent = new LoopAgent({
				name: "testloop",
				description: "A test loop agent",
				subAgents: [subAgent1],
				maxIterations: 5,
			});

			expect(agent.name).toBe("testloop");
			expect(agent.description).toBe("A test loop agent");
			expect(agent.subAgents).toEqual([subAgent1]);
			expect(agent.maxIterations).toBe(5);
		});

		it("should have undefined maxIterations if not provided", () => {
			const agent = new LoopAgent({
				name: "testloop",
				description: "A test loop agent",
			});
			expect(agent.maxIterations).toBeUndefined();
		});
	});

	describe("runAsyncImpl", () => {
		it("should loop exactly maxIterations times if no escalate event occurs", async () => {
			const agent = new LoopAgent({
				name: "testloop",
				description: "desc",
				subAgents: [subAgent1, subAgent2],
				maxIterations: 3,
			});

			subAgent1.runAsync.mockImplementation(async function* () {
				yield new Event({ author: "subAgent1" });
			});
			subAgent2.runAsync.mockImplementation(async function* () {
				yield new Event({ author: "subAgent2" });
			});

			for await (const _ of agent["runAsyncImpl"](mockContext)) {
			}

			expect(subAgent1.runAsync).toHaveBeenCalledTimes(3);
			expect(subAgent2.runAsync).toHaveBeenCalledTimes(3);
		});

		it("should stop looping immediately when an escalate event is yielded", async () => {
			const agent = new LoopAgent({
				name: "testloop",
				description: "desc",
				subAgents: [subAgent1, subAgent2],
				maxIterations: 10,
			});

			const escalateEvent = new Event({
				author: "subAgent1",
				actions: { escalate: true, stateDelta: {}, artifactDelta: {} },
			});

			let callCount = 0;
			subAgent1.runAsync.mockImplementation(async function* () {
				callCount++;
				if (callCount === 2) {
					yield escalateEvent;
				} else {
					yield new Event({ author: "subAgent1" });
				}
			});
			subAgent2.runAsync.mockImplementation(async function* () {
				yield new Event({ author: "subAgent2" });
			});

			const yieldedEvents = [];
			for await (const event of agent["runAsyncImpl"](mockContext)) {
				yieldedEvents.push(event);
			}

			expect(subAgent1.runAsync).toHaveBeenCalledTimes(2);
			expect(subAgent2.runAsync).toHaveBeenCalledTimes(1);
			expect(yieldedEvents.pop()).toBe(escalateEvent);
		});

		it("should run indefinitely if maxIterations is not set (tested with a limit)", async () => {
			const agent = new LoopAgent({
				name: "testloop",
				description: "desc",
				subAgents: [subAgent1],
			});

			subAgent1.runAsync.mockImplementation(async function* () {
				yield new Event({ author: "subAgent1" });
			});

			let loopCount = 0;
			for await (const _ of agent["runAsyncImpl"](mockContext)) {
				loopCount++;
				if (loopCount >= 5) {
					break;
				}
			}

			expect(loopCount).toBe(5);
			expect(subAgent1.runAsync).toHaveBeenCalledTimes(5);
		});

		it("should handle an empty subAgents array gracefully", async () => {
			const agent = new LoopAgent({
				name: "testloop",
				description: "desc",
				subAgents: [],
				maxIterations: 3,
			});

			const yieldedEvents = [];
			for await (const event of agent["runAsyncImpl"](mockContext)) {
				yieldedEvents.push(event);
			}

			expect(yieldedEvents).toHaveLength(0);
		});
	});

	describe("runLiveImpl", () => {
		it("should throw an error because it is not supported", async () => {
			const agent = new LoopAgent({
				name: "testloop",
				description: "desc",
			});

			const generator = agent["runLiveImpl"](mockContext);

			await expect(() => generator.next()).rejects.toThrow(
				"This is not supported yet for LoopAgent.",
			);
		});
	});
});
