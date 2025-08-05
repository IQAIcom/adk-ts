import type { Content, FunctionCall, Part } from "@google/genai";
import { describe, expect, it } from "vitest";
import { LogFormatter } from "../../logger/formatters/log-formatter";
import { LlmResponse } from "../../models/llm-response";

describe("LogFormatter", () => {
	describe("formatFunctionCalls", () => {
		it("should return empty array for empty function calls", () => {
			expect(LogFormatter.formatFunctionCalls([])).toEqual([]);
		});

		it("should format function calls with arguments", () => {
			const functionCalls: Part[] = [
				{
					functionCall: {
						name: "test_function",
						args: { param1: "value1", param2: "value2" },
					} as FunctionCall,
				},
			];

			const result = LogFormatter.formatFunctionCalls(functionCalls);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("test_function");
			expect(result[0].args).toContain("param1");
			expect(result[0].args).toContain("value1");
		});

		it("should handle function calls without arguments", () => {
			const functionCalls: Part[] = [
				{
					functionCall: {
						name: "no_args_function",
					} as FunctionCall,
				},
			];

			const result = LogFormatter.formatFunctionCalls(functionCalls);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("no_args_function");
			expect(result[0].args).toBe("{}");
		});

		it("should format multiple function calls", () => {
			const functionCalls: Part[] = [
				{
					functionCall: {
						name: "function1",
						args: { param: "value" },
					} as FunctionCall,
				},
				{
					functionCall: {
						name: "function2",
						args: { param: "value" },
					} as FunctionCall,
				},
			];

			const result = LogFormatter.formatFunctionCalls(functionCalls);
			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("function1");
			expect(result[1].name).toBe("function2");
		});

		it("should truncate long arguments", () => {
			const longArgs = { longParam: "a".repeat(100) };
			const functionCalls: Part[] = [
				{
					functionCall: {
						name: "long_args_function",
						args: longArgs,
					} as FunctionCall,
				},
			];

			const result = LogFormatter.formatFunctionCalls(functionCalls);
			expect(result).toHaveLength(1);
			expect(result[0].args).toContain("...");
			expect(result[0].args.length).toBeLessThan(150); // Should be truncated
		});

		it("should filter out parts without function calls", () => {
			const parts: Part[] = [
				{ text: "regular text" },
				{
					functionCall: {
						name: "actual_function",
						args: {},
					} as FunctionCall,
				},
				{ text: "more text" },
			];

			const result = LogFormatter.formatFunctionCalls(parts);
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("actual_function");
			expect(result[0].args).toBe("{}");
		});
	});

	describe("formatContentPreview", () => {
		it("should return 'none' for undefined content", () => {
			expect(LogFormatter.formatContentPreview(undefined as any)).toBe("none");
		});

		it("should format content with text parts", () => {
			const content: Content = {
				role: "user",
				parts: [{ text: "Hello, world!" }],
			};

			const result = LogFormatter.formatContentPreview(content);
			expect(result).toBe("Hello, world!");
		});

		it("should truncate long text content", () => {
			const longText = "a".repeat(100);
			const content: Content = {
				role: "user",
				parts: [{ text: longText }],
			};

			const result = LogFormatter.formatContentPreview(content);
			expect(result).toContain("...");
			expect(result.length).toBeLessThanOrEqual(83); // 80 + "..."
		});

		it("should join multiple text parts", () => {
			const content: Content = {
				role: "user",
				parts: [{ text: "Hello" }, { text: "world" }],
			};

			const result = LogFormatter.formatContentPreview(content);
			expect(result).toBe("Hello world");
		});

		it("should handle mixed parts and filter only text", () => {
			const content: Content = {
				role: "user",
				parts: [
					{ text: "Text part" },
					{
						functionCall: {
							name: "test_function",
							args: {},
						} as FunctionCall,
					},
					{ text: "More text" },
				],
			};

			const result = LogFormatter.formatContentPreview(content);
			expect(result).toBe("Text part More text");
		});

		it("should return 'no text content' for parts without text", () => {
			const content: Content = {
				role: "user",
				parts: [
					{
						functionCall: {
							name: "test_function",
							args: {},
						} as FunctionCall,
					},
				],
			};

			const result = LogFormatter.formatContentPreview(content);
			expect(result).toBe("no text content");
		});
	});

	describe("formatResponsePreview", () => {
		it("should return 'none' for response without content", () => {
			const llmResponse = new LlmResponse({});
			const result = LogFormatter.formatResponsePreview(llmResponse);
			expect(result).toBe("none");
		});

		it("should format response content", () => {
			const llmResponse = new LlmResponse({
				content: {
					role: "model",
					parts: [{ text: "Response text" }],
				},
			});

			const result = LogFormatter.formatResponsePreview(llmResponse);
			expect(result).toBe("Response text");
		});

		it("should delegate to formatContentPreview", () => {
			const llmResponse = new LlmResponse({
				content: {
					role: "model",
					parts: [{ text: "a".repeat(100) }],
				},
			});

			const result = LogFormatter.formatResponsePreview(llmResponse);
			expect(result).toContain("...");
		});
	});

	describe("formatSingleFunctionCall", () => {
		it("should format function call with pretty-printed arguments", () => {
			const functionCall: FunctionCall = {
				name: "test_function",
				args: {
					param1: "value1",
					nested: { key: "value" },
				},
			};

			const result = LogFormatter.formatSingleFunctionCall(functionCall);
			expect(result).toContain("test_function");
			expect(result).toContain("param1");
			expect(result).toContain("nested");
			// Should be pretty-printed (multi-line)
			expect(result.split("\n").length).toBeGreaterThan(1);
		});

		it("should handle function call without arguments", () => {
			const functionCall: FunctionCall = {
				name: "no_args_function",
			};

			const result = LogFormatter.formatSingleFunctionCall(functionCall);
			expect(result).toBe("no_args_function(\n{}\n)");
		});
	});

	describe("formatContentParts", () => {
		it("should return proper structure for content without parts", () => {
			const content: Content = {
				role: "user",
			};

			const result = LogFormatter.formatContentParts(content);
			expect(result).toHaveLength(1);
			expect(result[0].type).toBe("none");
			expect(result[0].preview).toBe("no parts");
		});

		it("should format multiple parts with indices", () => {
			const content: Content = {
				role: "user",
				parts: [
					{ text: "Hello" },
					{
						functionCall: {
							name: "test_function",
							args: {},
						} as FunctionCall,
					},
				],
			};

			const result = LogFormatter.formatContentParts(content);
			expect(result).toHaveLength(2);
			expect(result[0].type).toBe("text");
			expect(result[0].index).toBe(0);
			expect(result[1].type).toBe("function_call");
			expect(result[1].index).toBe(1);
		});

		it("should handle different part types", () => {
			const content: Content = {
				role: "user",
				parts: [
					{ text: "Text content" },
					{
						functionCall: {
							name: "function",
							args: { key: "value" },
						} as FunctionCall,
					},
					{
						functionResponse: {
							name: "response_function",
							response: { result: "success" },
						},
					},
				],
			};

			const result = LogFormatter.formatContentParts(content);
			expect(result).toHaveLength(3);
			expect(result[0].type).toBe("text");
			expect(result[1].type).toBe("function_call");
			expect(result[2].type).toBe("function_response");
		});
	});
});
