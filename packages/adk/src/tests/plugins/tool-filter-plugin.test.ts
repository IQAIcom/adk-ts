import { describe, expect, it, vi } from "vitest";
import type { BaseLlm } from "../../models/base-llm";
import type { LlmResponse } from "../../models/llm-response";
import { ToolOutputFilterPlugin } from "../../plugins/tool-filter-plugin";

// Mock LLM model for testing
function createMockFilterModel(responses: string[]): BaseLlm {
	let callCount = 0;

	return {
		model: "mock-model",
		generateContentAsync: vi.fn(async function* () {
			const filter = responses[callCount] || ".";
			callCount++;
			yield { text: filter } as LlmResponse;
		}),
	} as unknown as BaseLlm;
}

// Mock tool for testing
const createMockTool = (name: string) =>
	({
		name,
		description: "Mock tool",
	}) as any;

// Mock tool context
const createMockToolContext = () =>
	({
		invocationId: "test-inv-id",
	}) as any;

describe("ToolOutputFilterPlugin", () => {
	describe("Constructor", () => {
		it("should initialize with default config values", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			expect(plugin.name).toBe("tool_output_filter_plugin");
		});

		it("should accept custom name", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				name: "custom_filter_plugin",
				filterModel: mockModel,
			});

			expect(plugin.name).toBe("custom_filter_plugin");
		});

		it("should configure enabled and disabled tools", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				enabledTools: ["tool_a", "tool_b"],
				disabledTools: ["tool_x"],
			});

			// Access private method for testing
			expect((plugin as any).shouldFilterTool("tool_a")).toBe(true);
			expect((plugin as any).shouldFilterTool("tool_b")).toBe(true);
			expect((plugin as any).shouldFilterTool("tool_c")).toBe(false);
			expect((plugin as any).shouldFilterTool("tool_x")).toBe(false);
		});
	});

	describe("shouldFilterTool", () => {
		it("should return true for all tools when no restrictions", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			expect((plugin as any).shouldFilterTool("any_tool")).toBe(true);
			expect((plugin as any).shouldFilterTool("another_tool")).toBe(true);
		});

		it("should return false for disabled tools", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				disabledTools: ["disabled_tool"],
			});

			expect((plugin as any).shouldFilterTool("disabled_tool")).toBe(false);
			expect((plugin as any).shouldFilterTool("other_tool")).toBe(true);
		});

		it("should only allow enabled tools when list is specified", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				enabledTools: ["enabled_tool"],
			});

			expect((plugin as any).shouldFilterTool("enabled_tool")).toBe(true);
			expect((plugin as any).shouldFilterTool("other_tool")).toBe(false);
		});

		it("should prioritize disabled list over enabled list", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				enabledTools: ["tool_a"],
				disabledTools: ["tool_a"],
			});

			expect((plugin as any).shouldFilterTool("tool_a")).toBe(false);
		});
	});

	describe("analyzeResponse", () => {
		it("should extract schema and compute size", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const testData = { users: [{ id: 1, name: "Alice" }] };
			const analysis = (plugin as any).analyzeResponse(testData);

			expect(analysis.size).toBeGreaterThan(0);
			expect(analysis.keyCount).toBeGreaterThan(0);
			expect(analysis.schema).toBeDefined();
			expect(analysis.preview).toBeDefined();
		});
	});

	describe("extractSchema", () => {
		it("should extract schema for primitive types", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			expect((plugin as any).extractSchema(null, 0)).toBe("null");
			expect((plugin as any).extractSchema(true, 0)).toBe("boolean");
			expect((plugin as any).extractSchema(42, 0)).toBe("integer");
			expect((plugin as any).extractSchema(3.14, 0)).toBe("number");
			expect((plugin as any).extractSchema("hello", 0)).toBe("string");
		});

		it("should extract schema for arrays", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const emptyArray = (plugin as any).extractSchema([], 0);
			expect(emptyArray).toBe("array[]");

			const numArray = (plugin as any).extractSchema([1, 2, 3], 0);
			expect(numArray).toHaveProperty("_array_length", 3);
			expect(numArray).toHaveProperty("_item_schema", "integer");
		});

		it("should extract schema for objects", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const schema = (plugin as any).extractSchema({ id: 1, name: "test" }, 0);
			expect(schema).toHaveProperty("id", "integer");
			expect(schema).toHaveProperty("name", "string");
		});

		it("should respect maxSchemaDepth", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				config: { maxSchemaDepth: 2 },
			});

			const deepObject = { a: { b: { c: { d: 1 } } } };
			const schema = (plugin as any).extractSchema(deepObject, 0);

			// Should hit "..." at depth 3
			expect(schema.a.b.c).toBe("...");
		});
	});

	describe("countKeys", () => {
		it("should count keys in flat objects", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const result = (plugin as any).countKeys({ a: 1, b: 2, c: 3 }, 0);
			expect(result).toBe(3);
		});

		it("should count keys in nested objects", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const result = (plugin as any).countKeys({ a: { b: { c: 1 } } }, 0);
			expect(result).toBeGreaterThan(1);
		});

		it("should count array elements and their keys", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const result = (plugin as any).countKeys([{ id: 1 }, { id: 2 }], 0);
			expect(result).toBeGreaterThan(2);
		});
	});

	describe("needsFiltering", () => {
		it("should return true when size exceeds threshold", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				config: { sizeThreshold: 100, keyThreshold: 1000 },
			});

			const analysis = { size: 150, keyCount: 5, schema: {}, preview: "" };
			expect((plugin as any).needsFiltering(analysis)).toBe(true);
		});

		it("should return true when key count exceeds threshold", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				config: { sizeThreshold: 10000, keyThreshold: 10 },
			});

			const analysis = { size: 100, keyCount: 50, schema: {}, preview: "" };
			expect((plugin as any).needsFiltering(analysis)).toBe(true);
		});

		it("should return false when both are below thresholds", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				config: { sizeThreshold: 10000, keyThreshold: 100 },
			});

			const analysis = { size: 100, keyCount: 5, schema: {}, preview: "" };
			expect((plugin as any).needsFiltering(analysis)).toBe(false);
		});
	});

	describe("extractJqCommand", () => {
		it("should extract plain JQ filter", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const result = (plugin as any).extractJqCommand(
				".results[] | {id, name}",
			);
			expect(result).toBe(".results[] | {id, name}");
		});

		it("should extract JQ filter from markdown code block", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const result = (plugin as any).extractJqCommand(
				"```jq\n.results[] | {id}\n```",
			);
			expect(result).toBe(".results[] | {id}");
		});

		it("should remove surrounding quotes", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const result = (plugin as any).extractJqCommand('".results[] | {id}"');
			expect(result).toBe(".results[] | {id}");
		});

		it("should handle object response formats", () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const result = (plugin as any).extractJqCommand({
				message: { content: [{ text: ".[] | {id}" }] },
			});
			expect(result).toBe(".[] | {id}");
		});
	});

	describe("afterToolCallback", () => {
		it("should return undefined for small responses", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				config: { sizeThreshold: 10000, keyThreshold: 100 },
			});

			const result = await plugin.afterToolCallback({
				tool: createMockTool("test_tool"),
				toolArgs: { query: "test" },
				toolContext: createMockToolContext(),
				result: { small: "data" },
			});

			expect(result).toBeUndefined();
		});

		it("should return undefined for disabled tools", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				disabledTools: ["disabled_tool"],
				config: { sizeThreshold: 10, keyThreshold: 1 },
			});

			const result = await plugin.afterToolCallback({
				tool: createMockTool("disabled_tool"),
				toolArgs: {},
				toolContext: createMockToolContext(),
				result: { lots: "of", data: "here", more: "fields" },
			});

			expect(result).toBeUndefined();
		});
	});

	describe("close", () => {
		it("should complete without error", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			await expect(plugin.close()).resolves.toBeUndefined();
		});
	});
});
