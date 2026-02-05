import { describe, it, expect, vi, beforeEach } from "vitest";

import { streamText, generateText } from "ai";
import { AiSdkLlm, type LlmRequest, LlmResponse } from "@adk/models";
import { textStreamFrom } from "@adk/utils/streaming-utils";
import type { Event } from "@adk/events/event";

vi.mock("ai", () => ({
	streamText: vi.fn(),
	generateText: vi.fn(),
	jsonSchema: vi.fn((s) => s),
}));

vi.mock("@adk/helpers/logger", () => ({
	Logger: vi.fn(() => ({
		debug: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
	})),
}));

describe("AiSdkLlm", () => {
	const mockModelInstance = {
		modelId: "gpt-4o",
		provider: "openai",
		specificationVersion: "v2",
	} as any;

	const mockLlmRequest: LlmRequest = {
		contents: [
			{
				role: "user",
				parts: [{ text: "Hello" }],
			},
		],
		config: {
			maxOutputTokens: 500,
		},
		getSystemInstructionText: vi.fn().mockReturnValue(""),
	} as unknown as LlmRequest;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("streaming", () => {
		it("should yield partial text deltas (not accumulated text)", async () => {
			const mockTextStream = (async function* () {
				yield "Hello";
				yield " world";
				yield "!";
			})();

			(streamText as any).mockReturnValue({
				textStream: mockTextStream,
				toolCalls: Promise.resolve([]),
				usage: Promise.resolve({
					inputTokens: 10,
					outputTokens: 5,
					totalTokens: 15,
				}),
				finishReason: Promise.resolve("stop"),
				providerMetadata: Promise.resolve({}),
			});

			const aiSdkLlm = new AiSdkLlm(mockModelInstance);
			const generator = aiSdkLlm["generateContentAsyncImpl"](
				mockLlmRequest,
				true,
			);

			const responses: LlmResponse[] = [];
			for await (const response of generator) {
				responses.push(response);
			}

			// Verify partial responses yield only deltas
			const textChunks: string[] = [];
			const asyncResponses = (async function* () {
				for (const r of responses) yield r as unknown as Event;
			})();
			for await (const text of textStreamFrom(asyncResponses)) {
				textChunks.push(text);
			}

			expect(textChunks).toEqual(["Hello", " world", "!"]);

			// 3 partial + 1 final
			expect(responses).toHaveLength(4);

			// Partials should contain only the delta text
			expect(responses[0].partial).toBe(true);
			expect(responses[0].content?.parts?.[0]?.text).toBe("Hello");

			expect(responses[1].partial).toBe(true);
			expect(responses[1].content?.parts?.[0]?.text).toBe(" world");

			expect(responses[2].partial).toBe(true);
			expect(responses[2].content?.parts?.[0]?.text).toBe("!");

			// Final response should have the full accumulated text
			const final = responses[3];
			expect(final.partial).toBeUndefined();
			expect(final.content?.parts?.[0]?.text).toBe("Hello world!");
			expect(final.turnComplete).toBe(true);
		});

		it("should include usage metadata in final response", async () => {
			const mockTextStream = (async function* () {
				yield "Hi";
			})();

			(streamText as any).mockReturnValue({
				textStream: mockTextStream,
				toolCalls: Promise.resolve([]),
				usage: Promise.resolve({
					inputTokens: 20,
					outputTokens: 10,
					totalTokens: 30,
				}),
				finishReason: Promise.resolve("stop"),
				providerMetadata: Promise.resolve({}),
			});

			const aiSdkLlm = new AiSdkLlm(mockModelInstance);
			const generator = aiSdkLlm["generateContentAsyncImpl"](
				mockLlmRequest,
				true,
			);

			const responses: LlmResponse[] = [];
			for await (const response of generator) {
				responses.push(response);
			}

			const final = responses[responses.length - 1];
			expect(final.usageMetadata).toEqual({
				promptTokenCount: 20,
				candidatesTokenCount: 10,
				totalTokenCount: 30,
			});
			expect(final.finishReason).toBe("STOP");
		});

		it("should handle streaming with tool calls", async () => {
			const mockTextStream = (async function* () {
				yield "Let me check.";
			})();

			(streamText as any).mockReturnValue({
				textStream: mockTextStream,
				toolCalls: Promise.resolve([
					{
						toolCallId: "call_123",
						toolName: "get_weather",
						input: { location: "Tokyo" },
					},
				]),
				usage: Promise.resolve({
					inputTokens: 15,
					outputTokens: 20,
					totalTokens: 35,
				}),
				finishReason: Promise.resolve("stop"),
				providerMetadata: Promise.resolve({}),
			});

			const aiSdkLlm = new AiSdkLlm(mockModelInstance);
			const generator = aiSdkLlm["generateContentAsyncImpl"](
				mockLlmRequest,
				true,
			);

			const responses: LlmResponse[] = [];
			for await (const response of generator) {
				responses.push(response);
			}

			// 1 partial text + 1 final
			expect(responses).toHaveLength(2);

			const final = responses[1];
			expect(final.content?.parts).toHaveLength(2);
			expect(final.content?.parts?.[0]?.text).toBe("Let me check.");
			expect(final.content?.parts?.[1]).toEqual({
				functionCall: {
					id: "call_123",
					name: "get_weather",
					args: { location: "Tokyo" },
				},
			});
		});

		it("should handle streaming with only tool calls (no text)", async () => {
			const mockTextStream = (async function* () {
				// no text yielded
			})();

			(streamText as any).mockReturnValue({
				textStream: mockTextStream,
				toolCalls: Promise.resolve([
					{
						toolCallId: "call_456",
						toolName: "search",
						input: { query: "test" },
					},
				]),
				usage: Promise.resolve({
					inputTokens: 10,
					outputTokens: 5,
					totalTokens: 15,
				}),
				finishReason: Promise.resolve("stop"),
				providerMetadata: Promise.resolve({}),
			});

			const aiSdkLlm = new AiSdkLlm(mockModelInstance);
			const generator = aiSdkLlm["generateContentAsyncImpl"](
				mockLlmRequest,
				true,
			);

			const responses: LlmResponse[] = [];
			for await (const response of generator) {
				responses.push(response);
			}

			// Only final response (no text partials)
			expect(responses).toHaveLength(1);

			const final = responses[0];
			expect(final.content?.parts).toHaveLength(1);
			expect(final.content?.parts?.[0]).toEqual({
				functionCall: {
					id: "call_456",
					name: "search",
					args: { query: "test" },
				},
			});
		});

		it("should map finish reasons correctly", async () => {
			const testCases = [
				{ input: "stop", expected: "STOP" },
				{ input: "end_of_message", expected: "STOP" },
				{ input: "length", expected: "MAX_TOKENS" },
				{ input: "max_tokens", expected: "MAX_TOKENS" },
				{ input: "unknown", expected: "FINISH_REASON_UNSPECIFIED" },
			];

			for (const { input, expected } of testCases) {
				const mockTextStream = (async function* () {
					yield "text";
				})();

				(streamText as any).mockReturnValue({
					textStream: mockTextStream,
					toolCalls: Promise.resolve([]),
					usage: Promise.resolve({
						inputTokens: 5,
						outputTokens: 5,
						totalTokens: 10,
					}),
					finishReason: Promise.resolve(input),
					providerMetadata: Promise.resolve({}),
				});

				const aiSdkLlm = new AiSdkLlm(mockModelInstance);
				const generator = aiSdkLlm["generateContentAsyncImpl"](
					mockLlmRequest,
					true,
				);

				const responses: LlmResponse[] = [];
				for await (const response of generator) {
					responses.push(response);
				}

				const final = responses[responses.length - 1];
				expect(final.finishReason).toBe(expected);
			}
		});

		it("should emit empty text part when no text or tools", async () => {
			const mockTextStream = (async function* () {
				// empty stream
			})();

			(streamText as any).mockReturnValue({
				textStream: mockTextStream,
				toolCalls: Promise.resolve([]),
				usage: Promise.resolve({
					inputTokens: 5,
					outputTokens: 0,
					totalTokens: 5,
				}),
				finishReason: Promise.resolve("stop"),
				providerMetadata: Promise.resolve({}),
			});

			const aiSdkLlm = new AiSdkLlm(mockModelInstance);
			const generator = aiSdkLlm["generateContentAsyncImpl"](
				mockLlmRequest,
				true,
			);

			const responses: LlmResponse[] = [];
			for await (const response of generator) {
				responses.push(response);
			}

			expect(responses).toHaveLength(1);
			expect(responses[0].content?.parts?.[0]?.text).toBe("");
		});
	});
});
