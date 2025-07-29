import { vi, describe, it, expect, beforeEach } from "vitest";
import {
	LangGraphAgent,
	type CompiledGraph,
	type LangChainMessage,
} from "../../agents/lang-graph-agent";
import { Event } from "../../events/event";

// Test wrapper to access private methods
class TestLangGraphAgent extends LangGraphAgent {
	public testGetMessages(events: Event[]): LangChainMessage[] {
		return this["getMessages"](events);
	}

	public testGetConversationWithAgent(events: Event[]): LangChainMessage[] {
		return this["getConversationWithAgent"](events);
	}
}

describe("LangGraphAgent message extraction", () => {
	let agent: TestLangGraphAgent;
	let mockGraph: CompiledGraph;

	beforeEach(() => {
		mockGraph = {
			getState: vi.fn(),
			invoke: vi.fn(),
			checkpointer: undefined,
		};
		agent = new TestLangGraphAgent({
			name: "test_agent",
			description: "A test agent",
			graph: mockGraph,
		});
	});

	describe("getMessages", () => {
		it("should return full conversation when graph has no checkpointer", () => {
			const events = [
				new Event({
					author: "user",
					content: { role: "user", parts: [{ text: "Hi" }] },
				}),
				new Event({
					author: "test_agent",
					content: { role: "model", parts: [{ text: "Hello" }] },
				}),
			];
			const messages = agent.testGetMessages(events);
			expect(messages).toEqual([
				{ type: "human", content: "Hi" },
				{ type: "ai", content: "Hello" },
			]);
		});

		it("should return only last human messages when graph has a checkpointer", () => {
			mockGraph.checkpointer = {}; // Enable checkpointer mode
			const events = [
				new Event({
					author: "test_agent",
					content: { role: "model", parts: [{ text: "Hello" }] },
				}),
				new Event({
					author: "user",
					content: { role: "user", parts: [{ text: "Question 1" }] },
				}),
				new Event({
					author: "user",
					content: { role: "user", parts: [{ text: "Question 2" }] },
				}),
			];
			const messages = agent.testGetMessages(events);
			expect(messages).toEqual([
				{ type: "human", content: "Question 1" },
				{ type: "human", content: "Question 2" },
			]);
		});
	});

	describe("getConversationWithAgent", () => {
		it("should extract messages from user and the current agent", () => {
			const events = [
				new Event({
					author: "user",
					content: { role: "user", parts: [{ text: "User message" }] },
				}),
				new Event({
					author: "other-agent",
					content: { role: "model", parts: [{ text: "Ignore this" }] },
				}),
				new Event({
					author: "test_agent",
					content: { role: "model", parts: [{ text: "Agent response" }] },
				}),
			];
			const messages = agent.testGetConversationWithAgent(events);
			expect(messages).toEqual([
				{ type: "human", content: "User message" },
				{ type: "ai", content: "Agent response" },
			]);
		});

		it("should skip events without valid content or text", () => {
			const events = [
				new Event({ author: "user" }), // No content
				new Event({ author: "user", content: { role: "user", parts: [] } }), // No parts
				new Event({ author: "user", content: { role: "user", parts: [{}] } }), // No text
				new Event({
					author: "user",
					content: { role: "user", parts: [{ text: "Valid message" }] },
				}),
			];
			const messages = agent.testGetConversationWithAgent(events);
			expect(messages).toHaveLength(1);
			expect(messages[0].content).toBe("Valid message");
		});

		it("should skip events without valid content or text", () => {
			const events = [
				new Event({ author: "user" }), // No content
				new Event({ author: "user", content: { role: "user", parts: [] } }), // No parts
				new Event({ author: "user", content: { role: "user", parts: [{}] } }), // No text
				new Event({
					author: "user",
					content: { role: "user", parts: [{ text: "Valid message" }] },
				}),
			];
			const messages = agent.testGetConversationWithAgent(events);
			expect(messages).toHaveLength(1);
			expect(messages[0].content).toBe("Valid message");
		});

		it("should return an empty array for an empty event list", () => {
			const messages = agent.testGetConversationWithAgent([]);
			expect(messages).toEqual([]);
		});
	});
});
