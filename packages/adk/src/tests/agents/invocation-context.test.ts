import { describe, expect, it, vi } from "vitest";
import { BaseAgent } from "../../agents/base-agent";
import { InvocationContext } from "../../agents/invocation-context";
import type { Event } from "../../events/event";

class StubAgent extends BaseAgent {
	protected async *runAsyncImpl(
		_ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		// no-op
	}

	protected async *runLiveImpl(
		_ctx: InvocationContext,
	): AsyncGenerator<Event, void, unknown> {
		// no-op
	}
}

function createContext(agent?: BaseAgent): InvocationContext {
	return new InvocationContext({
		agent: agent ?? new StubAgent({ name: "root" }),
		session: {
			id: "ses-1",
			userId: "user-1",
			appName: "test",
			state: {},
			events: [],
			lastUpdateTime: 0,
		} as any,
		sessionService: {
			createSession: vi.fn(),
			getSession: vi.fn(),
			deleteSession: vi.fn(),
			appendEvent: vi.fn(),
			listEvents: vi.fn(),
			listSessions: vi.fn(),
		} as any,
		pluginManager: {
			plugins: [],
			runBeforeAgentCallback: vi.fn().mockResolvedValue(undefined),
			runAfterAgentCallback: vi.fn().mockResolvedValue(undefined),
		} as any,
	});
}

describe("InvocationContext", () => {
	describe("endInvocation propagation", () => {
		it("defaults to false", () => {
			const ctx = createContext();
			expect(ctx.endInvocation).toBe(false);
		});

		it("child setting endInvocation propagates to parent", () => {
			const parent = createContext();
			const child = parent.createChildContext(new StubAgent({ name: "child" }));

			child.endInvocation = true;

			expect(parent.endInvocation).toBe(true);
		});

		it("parent setting endInvocation propagates to child", () => {
			const parent = createContext();
			const child = parent.createChildContext(new StubAgent({ name: "child" }));

			parent.endInvocation = true;

			expect(child.endInvocation).toBe(true);
		});

		it("propagates through multiple levels of nesting", () => {
			const root = createContext();
			const mid = root.createChildContext(new StubAgent({ name: "mid" }));
			const leaf = mid.createChildContext(new StubAgent({ name: "leaf" }));

			leaf.endInvocation = true;

			expect(mid.endInvocation).toBe(true);
			expect(root.endInvocation).toBe(true);
		});
	});
});
