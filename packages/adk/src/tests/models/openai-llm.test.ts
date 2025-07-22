import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { OpenAiLlm } from "../../models/openai-llm";
import { LlmResponse } from "../../models/llm-response";

vi.mock("@adk/helpers/logger", () => ({
	Logger: vi.fn(() => ({
		debug: vi.fn(),
		error: vi.fn(),
	})),
}));
vi.mock("openai", () => ({
	default: vi.fn(() => {
		return {
			chat: {
				completions: {
					create: vi.fn(),
				},
			},
		};
	}),
}));

describe("OpenAiLlm", () => {
	let llm: OpenAiLlm;
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
		process.env.OPENAI_API_KEY = "test-key";
		llm = new OpenAiLlm();
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.clearAllMocks();
	});

	it("should set model in constructor", () => {
		expect(llm.model).toBe("gpt-4o-mini");
		const custom = new OpenAiLlm("gpt-3.5-turbo");
		expect(custom.model).toBe("gpt-3.5-turbo");
	});

	it("supportedModels returns expected patterns", () => {
		expect(OpenAiLlm.supportedModels()).toEqual([
			"gpt-3.5-.*",
			"gpt-4.*",
			"gpt-4o.*",
			"o1-.*",
			"o3-.*",
		]);
	});

	describe("contentToOpenAiMessage", () => {
		it("should convert system content", () => {
			const content = { role: "system", parts: [{ text: "sys" }] };
			const msg = (llm as any).contentToOpenAiMessage(content);
			expect(msg).toEqual({ role: "system", content: "sys" });
		});

		it("should convert function call part", () => {
			const content = {
				parts: [
					{
						functionCall: {
							id: "id1",
							name: "foo",
							args: { a: 1 },
						},
					},
				],
			};
			const msg = (llm as any).contentToOpenAiMessage(content);
			expect(msg).toEqual({
				role: "assistant",
				tool_calls: [
					{
						id: "id1",
						type: "function",
						function: {
							name: "foo",
							arguments: JSON.stringify({ a: 1 }),
						},
					},
				],
			});
		});

		it("should convert function response part", () => {
			const content = {
				parts: [
					{
						functionResponse: {
							id: "id2",
							response: { b: 2 },
						},
					},
				],
			};
			const msg = (llm as any).contentToOpenAiMessage(content);
			expect(msg).toEqual({
				role: "tool",
				tool_call_id: "id2",
				content: JSON.stringify({ b: 2 }),
			});
		});

		it("should convert single text part", () => {
			const content = { role: "user", parts: [{ text: "hi" }] };
			const msg = (llm as any).contentToOpenAiMessage(content);
			expect(msg).toEqual({ role: "user", content: "hi" });
		});

		it("should convert multi-part content", () => {
			const content = {
				role: "user",
				parts: [{ text: "a" }, { text: "b" }],
			};
			const msg = (llm as any).contentToOpenAiMessage(content);
			expect(msg).toEqual({
				role: "user",
				content: [
					{ type: "text", text: "a" },
					{ type: "text", text: "b" },
				],
			});
		});
	});

	describe("partToOpenAiContent", () => {
		it("should convert text part", () => {
			const part = { text: "foo" };
			const res = (llm as any).partToOpenAiContent(part);
			expect(res).toEqual({ type: "text", text: "foo" });
		});

		it("should convert inline_data part", () => {
			const part = {
				inline_data: { mime_type: "image/png", data: "abc123" },
			};
			const res = (llm as any).partToOpenAiContent(part);
			expect(res).toEqual({
				type: "image_url",
				image_url: {
					url: "data:image/png;base64,abc123",
				},
			});
		});

		it("should throw on unsupported part", () => {
			expect(() => (llm as any).partToOpenAiContent({})).toThrow(
				"Unsupported part type for OpenAI conversion",
			);
		});
	});

	describe("toOpenAiRole", () => {
		it("should map model to assistant", () => {
			expect((llm as any).toOpenAiRole("model")).toBe("assistant");
		});
		it("should map system to system", () => {
			expect((llm as any).toOpenAiRole("system")).toBe("system");
		});
		it("should default to user", () => {
			expect((llm as any).toOpenAiRole("foo")).toBe("user");
			expect((llm as any).toOpenAiRole(undefined)).toBe("user");
		});
	});

	describe("toAdkFinishReason", () => {
		it("should map stop/tool_calls to STOP", () => {
			expect((llm as any).toAdkFinishReason("stop")).toBe("STOP");
			expect((llm as any).toAdkFinishReason("tool_calls")).toBe("STOP");
		});
		it("should map length to MAX_TOKENS", () => {
			expect((llm as any).toAdkFinishReason("length")).toBe("MAX_TOKENS");
		});
		it("should default to FINISH_REASON_UNSPECIFIED", () => {
			expect((llm as any).toAdkFinishReason("other")).toBe(
				"FINISH_REASON_UNSPECIFIED",
			);
			expect((llm as any).toAdkFinishReason(undefined)).toBe(
				"FINISH_REASON_UNSPECIFIED",
			);
		});
	});

	describe("getContentType", () => {
		it("should detect thought content", () => {
			expect((llm as any).getContentType("[thinking] foo")).toBe("thought");
			expect((llm as any).getContentType("<thinking>bar")).toBe("thought");
		});
		it("should default to regular", () => {
			expect((llm as any).getContentType("hello")).toBe("regular");
		});
	});

	describe("preprocessPart", () => {
		it("should remove invalid inline_data", () => {
			const part = { inline_data: { mime_type: "image/png" } };
			(llm as any).preprocessPart(part);
			expect(part.inline_data).toBeUndefined();
		});
		it("should keep valid inline_data", () => {
			const part = { inline_data: { mime_type: "image/png", data: "abc" } };
			(llm as any).preprocessPart(part);
			expect(part.inline_data).toEqual({ mime_type: "image/png", data: "abc" });
		});
		it("should not throw if no inline_data", () => {
			expect(() => (llm as any).preprocessPart({})).not.toThrow();
		});
	});

	describe("hasInlineData", () => {
		it("should detect inlineData in parts", () => {
			const resp = new LlmResponse({
				content: { parts: [{ inlineData: true }] } as any,
			});
			expect((llm as any).hasInlineData(resp)).toBe(true);
		});
		it("should return false if no inlineData", () => {
			const resp = new LlmResponse({
				content: { parts: [{ text: "hi" }] } as any,
			});
			expect((llm as any).hasInlineData(resp)).toBe(false);
		});
	});

	describe("client getter", () => {
		it("should throw if OPENAI_API_KEY is not set", () => {
			process.env.OPENAI_API_KEY = undefined;
			const llm2 = new OpenAiLlm();
			expect(() => (llm2 as any).client).toThrow(
				/OPENAI_API_KEY environment variable is required/,
			);
		});

		it("should return a client if OPENAI_API_KEY is set", () => {
			process.env.OPENAI_API_KEY = "test-key";
			const llm2 = new OpenAiLlm();
			expect((llm2 as any).client).toBeDefined();
		});
	});

	describe("connect", () => {
		it("should throw error", () => {
			expect(() => llm.connect({} as any)).toThrow(
				"Live connection is not supported for gpt-4o-mini.",
			);
		});
	});
});
