import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseAgent, type SingleAgentCallback } from "../../agents/base-agent";
import type { InvocationContext } from "../../agents/invocation-context";
import { Event } from "../../events/event";
import { telemetryService } from "../../telemetry";

vi.mock("../../telemetry", () => ({
	telemetryService: {
		traceAsyncGenerator: vi.fn((_name, gen) => gen),
	},
}));

class TestAgent extends BaseAgent {
	runAsyncImplMock = vi.fn(async function* (
		_ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		yield new Event({ author: this.name });
	});

	runLiveImplMock = vi.fn(async function* (
		_ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		yield new Event({ author: this.name });
	});

	protected async *runAsyncImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		yield* this.runAsyncImplMock(ctx);
	}

	protected async *runLiveImpl(
		ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		yield* this.runLiveImplMock(ctx);
	}
}

const createMockContext = (agent: BaseAgent): InvocationContext =>
	({
		invocationId: "inv-123",
		agent,
		branch: "",
		endInvocation: false,
		session: {
			id: "ses-123",
			userId: "user-123",
			appName: "test-app",
			state: {},
			events: [],
			lastUpdateTime: 0,
		} as any,
		createChildContext: vi.fn((childAgent) =>
			createMockContext(childAgent),
		) as any,
	}) as InvocationContext;

describe("BaseAgent", () => {
	let agent: TestAgent;
	let mockContext: InvocationContext;

	beforeEach(() => {
		agent = new TestAgent({ name: "test_agent", description: "A test agent" });
		mockContext = createMockContext(agent);
		vi.clearAllMocks();
	});

	describe("Constructor and Initialization", () => {
		it("should initialize properties correctly", () => {
			const subAgent = new TestAgent({ name: "sub" });
			const beforeCb: SingleAgentCallback = () => undefined;
			const afterCb: SingleAgentCallback = () => undefined;
			const a = new TestAgent({
				name: "parent",
				description: "desc",
				subAgents: [subAgent],
				beforeAgentCallback: beforeCb,
				afterAgentCallback: afterCb,
			});

			expect(a.name).toBe("parent");
			expect(a.description).toBe("desc");
			expect(a.subAgents).toEqual([subAgent]);
			expect(a.beforeAgentCallback).toBe(beforeCb);
			expect(a.afterAgentCallback).toBe(afterCb);
			expect(subAgent.parentAgent).toBe(a);
		});

		it("should throw an error for invalid agent names", () => {
			expect(() => new TestAgent({ name: "invalid-name" })).toThrow();
			expect(() => new TestAgent({ name: "1_invalid" })).toThrow();
			expect(() => new TestAgent({ name: "invalid name" })).toThrow();
		});

		it("should throw an error for the reserved name 'user'", () => {
			expect(() => new TestAgent({ name: "user" })).toThrow(
				"Agent name cannot be `user`",
			);
		});

		it("should throw an error if a sub-agent already has a parent", () => {
			const sub = new TestAgent({ name: "sub" });
			new TestAgent({ name: "parent1", subAgents: [sub] });
			expect(
				() => new TestAgent({ name: "parent2", subAgents: [sub] }),
			).toThrow(
				"Agent `sub` already has a parent agent, current parent: `parent1`, trying to add: `parent2`",
			);
		});
	});

	describe("Agent Hierarchy", () => {
		let root: TestAgent;
		let child: TestAgent;
		let grandchild: TestAgent;

		beforeEach(() => {
			grandchild = new TestAgent({ name: "grandchild" });
			child = new TestAgent({ name: "child", subAgents: [grandchild] });
			root = new TestAgent({ name: "root", subAgents: [child] });
		});

		it("should correctly identify the root agent", () => {
			expect(root.rootAgent).toBe(root);
			expect(child.rootAgent).toBe(root);
			expect(grandchild.rootAgent).toBe(root);
		});

		it("should find agents by name within the hierarchy", () => {
			expect(root.findAgent("root")).toBe(root);
			expect(root.findAgent("child")).toBe(child);
			expect(root.findAgent("grandchild")).toBe(grandchild);
			expect(root.findAgent("nonexistent")).toBeUndefined();
		});

		it("should find sub-agents but not itself", () => {
			expect(root.findSubAgent("child")).toBe(child);
			expect(root.findSubAgent("grandchild")).toBe(grandchild);
			expect(root.findSubAgent("root")).toBeUndefined();
		});
	});

	describe("Run Logic", () => {
		it.each([
			{
				method: "runAsync" as const,
				implMock: "runAsyncImplMock" as const,
				traceName: "agent_run [test_agent]",
			},
			{
				method: "runLive" as const,
				implMock: "runLiveImplMock" as const,
				traceName: "agent_run_live [test_agent]",
			},
		])(
			"$method should trace and call the internal implementation",
			async ({ method, implMock, traceName }) => {
				const events = [];
				for await (const event of agent[method](mockContext)) {
					events.push(event);
				}
				expect(telemetryService.traceAsyncGenerator).toHaveBeenCalledWith(
					traceName,
					expect.anything(),
				);
				expect(agent[implMock]).toHaveBeenCalledOnce();
				expect(events).toHaveLength(1);
			},
		);

		it.each([
			{ method: "runAsyncImpl" as const, name: "runAsyncImpl" },
			{ method: "runLiveImpl" as const, name: "runLiveImpl" },
		])(
			"should throw if $name is not implemented in a subclass",
			async ({ method }) => {
				class BadAgent extends BaseAgent {}
				const badAgent = new BadAgent({ name: "bad" });
				const generator = badAgent[method](mockContext);
				await expect(generator.next()).rejects.toThrow(
					`${method} for BadAgent is not implemented.`,
				);
			},
		);
	});

	describe("Callback Handling", () => {
		it("should execute beforeAgentCallback and skip runAsyncImpl if content is returned", async () => {
			const beforeCb = vi.fn(() => ({ parts: [{ text: "skipped" }] }));
			agent.beforeAgentCallback = beforeCb;

			const events = [];
			for await (const event of agent["runAsyncInternal"](mockContext)) {
				events.push(event);
			}

			expect(beforeCb).toHaveBeenCalledOnce();
			expect(agent.runAsyncImplMock).not.toHaveBeenCalled();
			expect(events).toHaveLength(1);
			expect(events[0].content).toEqual({ parts: [{ text: "skipped" }] });
		});

		it("should execute afterAgentCallback after runAsyncImpl", async () => {
			const afterCb = vi.fn(() => ({ parts: [{ text: "after" }] }));
			agent.afterAgentCallback = afterCb;

			const events = [];
			for await (const event of agent["runAsyncInternal"](mockContext)) {
				events.push(event);
			}

			expect(agent.runAsyncImplMock).toHaveBeenCalledOnce();
			expect(afterCb).toHaveBeenCalledOnce();
			expect(events).toHaveLength(2);
			expect(events[1].content).toEqual({ parts: [{ text: "after" }] });
		});

		it("should handle an array of callbacks and stop at the first one that returns content", async () => {
			const cb1 = vi.fn(() => undefined);
			const cb2 = vi.fn(() => ({ parts: [{ text: "from cb2" }] }));
			const cb3 = vi.fn(() => ({ parts: [{ text: "from cb3" }] }));
			agent.beforeAgentCallback = [cb1, cb2, cb3];

			for await (const _ of agent["runAsyncInternal"](mockContext)) {
			}

			expect(cb1).toHaveBeenCalledOnce();
			expect(cb2).toHaveBeenCalledOnce();
			expect(cb3).not.toHaveBeenCalled();
			expect(agent.runAsyncImplMock).not.toHaveBeenCalled();
		});
	});
});
