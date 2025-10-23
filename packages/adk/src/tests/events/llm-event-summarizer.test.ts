import { beforeEach, describe, expect, it, vi } from "vitest";
import { Event } from "../../events/event.js";
import { LlmEventSummarizer } from "../../events/llm-event-summarizer.js";
import type { BaseLlm } from "../../models/base-llm.js";

describe("LlmEventSummarizer", () => {
	let mockLlm: BaseLlm;
	let summarizer: LlmEventSummarizer;

	beforeEach(() => {
		mockLlm = {
			generateContentAsync: vi.fn(),
		} as any;

		summarizer = new LlmEventSummarizer(mockLlm);
	});

	describe("maybeSummarizeEvents", () => {
		it("should return undefined for empty events array", async () => {
			const result = await summarizer.maybeSummarizeEvents([]);
			expect(result).toBeUndefined();
		});

		it("should return undefined for null/undefined events", async () => {
			const result = await summarizer.maybeSummarizeEvents(null as any);
			expect(result).toBeUndefined();
		});

		it("should generate summary for valid events", async () => {
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "user",
					content: { parts: [{ text: "Hello" }] },
					timestamp: 1000,
				}),
				new Event({
					invocationId: "inv-1",
					author: "agent",
					content: { parts: [{ text: "Hi there!" }] },
					timestamp: 1100,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "This is a summary of the conversation." }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await summarizer.maybeSummarizeEvents(events);

			expect(result).toBeDefined();
			expect(result?.actions?.compaction).toBeDefined();
			expect(result?.actions?.compaction?.startTimestamp).toBe(1000);
			expect(result?.actions?.compaction?.endTimestamp).toBe(1100);
			expect(result?.actions?.compaction?.compactedContent.parts[0].text).toBe(
				"This is a summary of the conversation.",
			);
		});

		it("should use custom prompt template", async () => {
			const customPrompt =
				"Summarize these events:\n{events}\n\nProvide a bullet-point summary.";
			const customSummarizer = new LlmEventSummarizer(mockLlm, customPrompt);

			const events = [
				new Event({
					invocationId: "inv-1",
					author: "user",
					content: { parts: [{ text: "Test message" }] },
					timestamp: 1000,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "- Event 1: Test message" }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await customSummarizer.maybeSummarizeEvents(events);

			expect(result).toBeDefined();
			expect(mockLlm.generateContentAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					contents: expect.arrayContaining([
						expect.objectContaining({
							parts: expect.arrayContaining([
								expect.objectContaining({
									text: expect.stringContaining("Summarize these events:"),
								}),
							]),
						}),
					]),
				}),
			);
		});

		it("should handle function call events", async () => {
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "agent",
					content: {
						parts: [
							{
								functionCall: {
									name: "get_weather",
									args: { city: "San Francisco" },
								},
							},
						],
					},
					timestamp: 1000,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "Called weather API for San Francisco" }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await summarizer.maybeSummarizeEvents(events);

			expect(result).toBeDefined();
			expect(mockLlm.generateContentAsync).toHaveBeenCalled();

			const callArgs = (mockLlm.generateContentAsync as any).mock.calls[0][0];
			const promptText = callArgs.contents[0].parts[0].text;

			expect(promptText).toContain("get_weather");
			expect(promptText).toContain("San Francisco");
		});

		it("should handle function response events", async () => {
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "tool",
					content: {
						parts: [
							{
								functionResponse: {
									name: "get_weather",
									response: { temperature: 72, conditions: "sunny" },
								},
							},
						],
					},
					timestamp: 1000,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "Weather data retrieved successfully" }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await summarizer.maybeSummarizeEvents(events);

			expect(result).toBeDefined();

			const callArgs = (mockLlm.generateContentAsync as any).mock.calls[0][0];
			const promptText = callArgs.contents[0].parts[0].text;

			expect(promptText).toContain("get_weather");
			expect(promptText).toContain("returned");
		});

		it("should concatenate multiple response chunks", async () => {
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "user",
					content: { parts: [{ text: "Hello" }] },
					timestamp: 1000,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "This is " }],
					},
				};
				yield {
					content: {
						parts: [{ text: "a multi-part " }],
					},
				};
				yield {
					content: {
						parts: [{ text: "summary." }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await summarizer.maybeSummarizeEvents(events);

			expect(result).toBeDefined();
			expect(result?.actions?.compaction?.compactedContent.parts[0].text).toBe(
				"This is a multi-part summary.",
			);
		});

		it("should return undefined when LLM returns empty summary", async () => {
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "user",
					content: { parts: [{ text: "Hello" }] },
					timestamp: 1000,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "" }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await summarizer.maybeSummarizeEvents(events);

			expect(result).toBeUndefined();
		});

		it("should return undefined when LLM returns whitespace-only summary", async () => {
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "user",
					content: { parts: [{ text: "Hello" }] },
					timestamp: 1000,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "   \n\t  " }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await summarizer.maybeSummarizeEvents(events);

			expect(result).toBeUndefined();
		});

		it("should handle events with multiple parts", async () => {
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "agent",
					content: {
						parts: [
							{ text: "First part" },
							{
								functionCall: {
									name: "tool",
									args: {},
								},
							},
							{ text: "Second part" },
						],
					},
					timestamp: 1000,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "Summary with multiple parts" }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await summarizer.maybeSummarizeEvents(events);

			expect(result).toBeDefined();

			const callArgs = (mockLlm.generateContentAsync as any).mock.calls[0][0];
			const promptText = callArgs.contents[0].parts[0].text;

			expect(promptText).toContain("First part");
			expect(promptText).toContain("tool");
			expect(promptText).toContain("Second part");
		});

		it("should format timestamps correctly", async () => {
			const timestamp = 1704067200;
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "user",
					content: { parts: [{ text: "Test" }] },
					timestamp,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "Summary" }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			await summarizer.maybeSummarizeEvents(events);

			const callArgs = (mockLlm.generateContentAsync as any).mock.calls[0][0];
			const promptText = callArgs.contents[0].parts[0].text;

			expect(promptText).toContain(
				new Date(timestamp * 1000).toISOString().split("T")[0],
			);
		});

		it("should create compaction event with correct metadata", async () => {
			const events = [
				new Event({
					invocationId: "inv-1",
					author: "user",
					content: { parts: [{ text: "Message 1" }] },
					timestamp: 1000,
				}),
				new Event({
					invocationId: "inv-2",
					author: "agent",
					content: { parts: [{ text: "Message 2" }] },
					timestamp: 2000,
				}),
				new Event({
					invocationId: "inv-3",
					author: "user",
					content: { parts: [{ text: "Message 3" }] },
					timestamp: 3000,
				}),
			];

			async function* mockGenerator() {
				yield {
					content: {
						parts: [{ text: "Compacted summary" }],
					},
				};
			}

			(mockLlm.generateContentAsync as any).mockReturnValue(mockGenerator());

			const result = await summarizer.maybeSummarizeEvents(events);

			expect(result).toBeDefined();
			expect(result?.author).toBe("user");
			expect(result?.invocationId).toBeDefined();
			expect(result?.actions?.compaction?.startTimestamp).toBe(1000);
			expect(result?.actions?.compaction?.endTimestamp).toBe(3000);
			expect(result?.actions?.compaction?.compactedContent.role).toBe("model");
		});
	});
});
