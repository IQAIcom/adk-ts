import { describe, it, expect, vi, beforeEach } from "vitest";

import Anthropic from "@anthropic-ai/sdk";
import { AnthropicLlm, type LlmRequest, LlmResponse } from "@adk/models";

vi.mock("@anthropic-ai/sdk");
vi.mock("@adk/helpers/logger", () => ({
	Logger: vi.fn(() => ({
		debug: vi.fn(),
		error: vi.fn(),
	})),
}));

describe("AnthropicLlm", () => {
	let anthropicLlm: AnthropicLlm;
	const mockApiKey = "test-api-key";

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.ANTHROPIC_API_KEY = mockApiKey;
		anthropicLlm = new AnthropicLlm();
	});

	describe("constructor", () => {
		it("should initialize with default model", () => {
			expect(anthropicLlm).toBeInstanceOf(AnthropicLlm);
			expect(anthropicLlm["model"]).toBe("claude-3-5-sonnet-20241022");
		});

		it("should initialize with custom model", () => {
			const customModel = "claude-3-custom-model";
			const llm = new AnthropicLlm(customModel);
			expect(llm["model"]).toBe(customModel);
		});
	});

	describe("supportedModels", () => {
		it("should return supported model patterns", () => {
			const supported = AnthropicLlm.supportedModels();
			expect(supported).toEqual(["claude-3-.*", "claude-.*-4.*"]);
		});
	});

	describe("generateContentAsyncImpl", () => {
		const mockLlmRequest: LlmRequest = {
			contents: [
				{
					role: "user",
					parts: [{ text: "Hello" }],
				},
			],
			config: {
				maxOutputTokens: 500,
				temperature: 0.7,
				topP: 0.9,
			},
			getSystemInstructionText: vi.fn().mockReturnValue(""),
		} as unknown as LlmRequest;

		const mockAnthropicResponse = {
			content: [{ type: "text", text: "Hello there!" }],
			usage: {
				input_tokens: 10,
				output_tokens: 20,
			},
			stop_reason: "end_turn",
		};

		let mockMessagesCreate: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockMessagesCreate = vi.fn().mockResolvedValue(mockAnthropicResponse);
			(Anthropic as any).mockImplementation(() => ({
				messages: {
					create: mockMessagesCreate,
				},
			}));
		});

		it("should generate content with default model", async () => {
			const generator =
				anthropicLlm["generateContentAsyncImpl"](mockLlmRequest);
			const result = await generator.next();

			expect(result.value).toBeInstanceOf(LlmResponse);
			expect(result.done).toBe(false);

			const nextResult = await generator.next();
			expect(nextResult.done).toBe(true);
		});

		it("should generate content with custom model", async () => {
			const customModelRequest = {
				...mockLlmRequest,
				model: "claude-3-custom",
			};
			const generator = anthropicLlm["generateContentAsyncImpl"](
				customModelRequest as LlmRequest,
			);
			await generator.next();

			expect(mockMessagesCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					model: "claude-3-custom",
				}),
			);
		});

		it("should include system instruction when provided", async () => {
			const requestWithSystem = {
				...mockLlmRequest,
				getSystemInstructionText: () => "Be helpful",
			};

			const generator = anthropicLlm["generateContentAsyncImpl"](
				requestWithSystem as LlmRequest,
			);
			await generator.next();

			expect(mockMessagesCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					system: "Be helpful",
				}),
			);
		});
	});

	describe("connect", () => {
		it("should throw error as live connection is not supported", () => {
			expect(() => anthropicLlm.connect({} as LlmRequest)).toThrow(
				"Live connection is not supported for claude-3-5-sonnet-20241022.",
			);
		});
	});

	describe("content conversion methods", () => {
		describe("anthropicMessageToLlmResponse", () => {
			it("should convert Anthropic message to LlmResponse", () => {
				const message = {
					content: [{ type: "text", text: "Hello" }],
					usage: {
						input_tokens: 5,
						output_tokens: 10,
					},
					stop_reason: "end_turn",
				};

				const response = anthropicLlm["anthropicMessageToLlmResponse"](
					message as any,
				);

				expect(response).toBeInstanceOf(LlmResponse);
				expect(response.content.parts).toEqual([{ text: "Hello" }]);
				expect(response.usageMetadata).toEqual({
					promptTokenCount: 5,
					candidatesTokenCount: 10,
					totalTokenCount: 15,
				});
				expect(response.finishReason).toBe("STOP");
			});
		});

		describe("contentToAnthropicMessage", () => {
			it("should convert content to Anthropic message", () => {
				const content = {
					role: "user",
					parts: [{ text: "Hi" }],
				};

				const message = anthropicLlm["contentToAnthropicMessage"](content);

				expect(message).toEqual({
					role: "user",
					content: [{ type: "text", text: "Hi" }],
				});
			});
		});

		describe("partToAnthropicBlock", () => {
			it("should convert text part to Anthropic block", () => {
				const part = { text: "Hello" };
				const block = anthropicLlm["partToAnthropicBlock"](part);
				expect(block).toEqual({ type: "text", text: "Hello" });
			});

			it("should convert function call part to Anthropic block", () => {
				const part = {
					function_call: {
						id: "123",
						name: "test_func",
						args: { param1: "value1" },
					},
				};
				const block = anthropicLlm["partToAnthropicBlock"](part);
				expect(block).toEqual({
					type: "tool_use",
					id: "123",
					name: "test_func",
					input: { param1: "value1" },
				});
			});

			it("should convert function response part to Anthropic block", () => {
				const part = {
					function_response: {
						id: "123",
						response: { result: "success" },
					},
				};
				const block = anthropicLlm["partToAnthropicBlock"](part);
				expect(block).toEqual({
					type: "tool_result",
					tool_use_id: "123",
					content: "success",
					is_error: false,
				});
			});

			it("should throw error for unsupported part type", () => {
				expect(() =>
					anthropicLlm["partToAnthropicBlock"]({ unsupported: true } as any),
				).toThrow("Unsupported part type for Anthropic conversion");
			});
		});

		describe("anthropicBlockToPart", () => {
			it("should convert text block to part", () => {
				const block = { type: "text", text: "Hello" };
				const part = anthropicLlm["anthropicBlockToPart"](block);
				expect(part).toEqual({ text: "Hello" });
			});

			it("should convert tool_use block to part", () => {
				const block = {
					type: "tool_use",
					id: "123",
					name: "test_func",
					input: { param1: "value1" },
				};
				const part = anthropicLlm["anthropicBlockToPart"](block);
				expect(part).toEqual({
					function_call: {
						id: "123",
						name: "test_func",
						args: { param1: "value1" },
					},
				});
			});

			it("should throw error for unsupported block type", () => {
				expect(() =>
					anthropicLlm["anthropicBlockToPart"]({ type: "unsupported" } as any),
				).toThrow("Unsupported Anthropic content block type");
			});
		});

		describe("functionDeclarationToAnthropicTool", () => {
			it("should convert function declaration to Anthropic tool", () => {
				const funcDecl = {
					name: "test_func",
					description: "Test function",
					parameters: {
						properties: {
							param1: { type: "STRING" },
							param2: { type: "NUMBER" },
						},
					},
				};

				const tool =
					anthropicLlm["functionDeclarationToAnthropicTool"](funcDecl);

				expect(tool).toEqual({
					name: "test_func",
					description: "Test function",
					input_schema: {
						type: "object",
						properties: {
							param1: { type: "string" },
							param2: { type: "number" },
						},
					},
				});
			});
		});

		describe("toAnthropicRole", () => {
			it.each([
				["model", "assistant"],
				["assistant", "assistant"],
				["user", "user"],
				["unknown", "user"],
				[undefined, "user"],
			])("should convert '%s' role to '%s'", (input, expected) => {
				expect(anthropicLlm["toAnthropicRole"](input)).toBe(expected);
			});
		});

		describe("toAdkFinishReason", () => {
			it.each([
				["end_turn", "STOP"],
				["stop_sequence", "STOP"],
				["tool_use", "STOP"],
				["max_tokens", "MAX_TOKENS"],
				["unknown", "FINISH_REASON_UNSPECIFIED"],
				[undefined, "FINISH_REASON_UNSPECIFIED"],
			])("should convert '%s' to '%s'", (input, expected) => {
				expect(anthropicLlm["toAdkFinishReason"](input)).toBe(expected);
			});
		});

		describe("updateTypeString", () => {
			it("should lowercase type strings in schema", () => {
				const schema = {
					type: "STRING",
					items: {
						type: "OBJECT",
						properties: {
							nested: { type: "NUMBER" },
						},
					},
				};

				anthropicLlm["updateTypeString"](schema);

				expect(schema.type).toBe("string");
				expect(schema.items.type).toBe("object");
				expect(schema.items.properties.nested.type).toBe("number");
			});
		});
	});
});
