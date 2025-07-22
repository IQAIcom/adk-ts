import { describe, it, expect, vi, beforeEach } from "vitest";
import { LlmAgent } from "../../agents/llm-agent";
import { Event } from "../../events/event";
import type { InvocationContext } from "../../agents/invocation-context";

vi.mock("@adk/helpers/logger", () => ({
	Logger: vi.fn(() => ({
		debug: vi.fn(),
		error: vi.fn(),
	})),
}));

vi.mock("../../flows/llm-flows", () => ({
	SingleFlow: vi.fn(),
	AutoFlow: vi.fn(function () {
		this.runAsync = vi.fn();
	}),
}));

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

describe("LlmAgent (Run Logic)", () => {
	let agent: LlmAgent;

	beforeEach(() => {
		vi.clearAllMocks();
		agent = new LlmAgent({
			name: "testAgent",
			description: "A test agent",
		});
	});

	describe("maybeSaveOutputToState", () => {
		it("should do nothing if outputKey is not set", () => {
			const event = new Event({ author: agent.name });
			agent["maybeSaveOutputToState"](event);
			expect(event.actions.stateDelta).toStrictEqual({});
		});

		it("should do nothing if the event is not a final response", () => {
			agent.outputKey = "result";
			const event = new Event({ author: agent.name });
			vi.spyOn(event, "isFinalResponse").mockReturnValue(false);

			agent["maybeSaveOutputToState"](event);
			expect(event.actions.stateDelta).toStrictEqual({});
		});

		it("should do nothing if the event has no content parts", () => {
			agent.outputKey = "result";
			const event = new Event({ content: { parts: [] }, author: agent.name });
			vi.spyOn(event, "isFinalResponse").mockReturnValue(true);

			agent["maybeSaveOutputToState"](event);
			expect(event.actions.stateDelta).toStrictEqual({});
		});

		it("should save concatenated text to stateDelta if conditions are met", () => {
			agent.outputKey = "result";
			const event = new Event({
				content: { parts: [{ text: "Hello " }, { text: "World" }] },
				author: agent.name,
			});
			vi.spyOn(event, "isFinalResponse").mockReturnValue(true);

			agent["maybeSaveOutputToState"](event);

			expect(event.actions.stateDelta).toBeDefined();
			expect(event.actions.stateDelta?.result).toBe("Hello World");
		});

		it("should create stateDelta object if it does not exist", () => {
			agent.outputKey = "result";
			const event = new Event({
				content: { parts: [{ text: "data" }] },
				author: agent.name,
			});
			vi.spyOn(event, "isFinalResponse").mockReturnValue(true);
			event.actions = { stateDelta: undefined, artifactDelta: undefined };

			agent["maybeSaveOutputToState"](event);

			expect(event.actions.stateDelta).toBeDefined();
			expect(event.actions.stateDelta?.result).toBe("data");
		});

		it("should not save to state if the resulting text is empty", () => {
			agent.outputKey = "result";
			const event = new Event({
				content: { parts: [{ text: "" }, { text: undefined as any }] },
				author: agent.name,
			});
			event.actions = { stateDelta: undefined, artifactDelta: undefined };
			vi.spyOn(event, "isFinalResponse").mockReturnValue(true);

			agent["maybeSaveOutputToState"](event);
			expect(event.actions.stateDelta).toBeUndefined();
		});
	});

	describe("runAsyncImpl", () => {
		it("should process yielded content from the flow", async () => {
			const mockFlowRunAsync = async function* () {
				yield "Hello world";
			};
			(agent["llmFlow"] as any).runAsync.mockReturnValue(mockFlowRunAsync());

			const yieldedEvents = [];
			for await (const event of agent["runAsyncImpl"](mockContext)) {
				yieldedEvents.push(event);
			}

			expect(yieldedEvents).toHaveLength(1);
			expect(yieldedEvents[0].errorCode).toBe("AGENT_EXECUTION_ERROR");
		});

		it("should catch a non-Error object from the flow and yield a formatted error event", async () => {
			const mockFlowRunAsync = async function* () {
				yield "test";
			};
			(agent["llmFlow"] as any).runAsync.mockReturnValue(mockFlowRunAsync());

			const yieldedEvents = [];
			for await (const event of agent["runAsyncImpl"](mockContext)) {
				yieldedEvents.push(event);
			}

			expect(yieldedEvents).toHaveLength(1);
			const errorEvent = yieldedEvents[0];
			expect(errorEvent.author).toBe(agent.name);
		});
	});
});
