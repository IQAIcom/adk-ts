import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// Mock child_process.spawn
class MockChildProcess extends EventEmitter {
	stdin: any;
	stdout: EventEmitter;
	stderr: EventEmitter;

	constructor() {
		super();
		this.stdin = {
			write: vi.fn(),
			end: vi.fn(),
		};
		this.stdout = new EventEmitter();
		this.stderr = new EventEmitter();
	}

	// Helper to simulate successful execution
	simulateSuccess(output: string) {
		setImmediate(() => {
			this.stdout.emit("data", Buffer.from(output));
			this.emit("close", 0);
		});
	}

	// Helper to simulate failure
	simulateFailure(code: number, stderr = "") {
		setImmediate(() => {
			if (stderr) {
				this.stderr.emit("data", Buffer.from(stderr));
			}
			this.emit("close", code);
		});
	}

	// Helper to simulate spawn error
	simulateSpawnError(error: Error) {
		setImmediate(() => {
			this.emit("error", error);
		});
	}

	// Helper to simulate timeout
	simulateTimeout() {
		// Don't emit close event - just let it hang
	}
}

describe("ToolOutputFilterPlugin - applyJqFilter", () => {
	let mockSpawn: any;
	let _originalSpawn: any;

	beforeEach(async () => {
		// Mock the spawn function
		const childProcessModule = await import("node:child_process");
		_originalSpawn = childProcessModule.spawn;
		mockSpawn = vi.fn();
		(childProcessModule as any).spawn = mockSpawn;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Successful filtering", () => {
		it("should apply a simple JQ filter successfully", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = {
				users: [
					{ id: 1, name: "Alice" },
					{ id: 2, name: "Bob" },
				],
			};
			const expectedOutput = { users: [{ id: 1 }, { id: 2 }] };

			const filterPromise = (plugin as any).applyJqFilter(
				".users[] | {id}",
				inputData,
			);

			mockProcess.simulateSuccess(JSON.stringify(expectedOutput));

			const result = await filterPromise;

			expect(mockSpawn).toHaveBeenCalledWith("jq", ["-c", ".users[] | {id}"], {
				timeout: 10000,
			});
			expect(mockProcess.stdin.write).toHaveBeenCalledWith(
				JSON.stringify(inputData),
			);
			expect(mockProcess.stdin.end).toHaveBeenCalled();
			expect(result).toEqual(expectedOutput);
		});

		it("should handle complex nested filters", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = {
				results: [
					{ id: 1, metadata: { score: 0.9, details: "long text" } },
					{ id: 2, metadata: { score: 0.8, details: "more text" } },
				],
			};
			const expectedOutput = [
				{ id: 1, score: 0.9 },
				{ id: 2, score: 0.8 },
			];

			const filterPromise = (plugin as any).applyJqFilter(
				".results[] | {id, score: .metadata.score}",
				inputData,
			);

			mockProcess.simulateSuccess(JSON.stringify(expectedOutput));

			const result = await filterPromise;
			expect(result).toEqual(expectedOutput);
		});

		it("should handle array slicing filters", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
			const expectedOutput = { items: [1, 2, 3, 4, 5] };

			const filterPromise = (plugin as any).applyJqFilter(
				".items |= .[0:5]",
				inputData,
			);

			mockProcess.simulateSuccess(JSON.stringify(expectedOutput));

			const result = await filterPromise;
			expect(result).toEqual(expectedOutput);
		});
	});

	describe("Error handling", () => {
		it("should return null when JQ filter has invalid syntax", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { test: "data" };

			const filterPromise = (plugin as any).applyJqFilter(
				"invalid syntax [[[",
				inputData,
			);

			mockProcess.simulateFailure(
				1,
				"jq: parse error: Invalid numeric literal",
			);

			const result = await filterPromise;
			expect(result).toBeNull();
		});

		it("should return null when JQ produces invalid JSON", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { test: "data" };

			const filterPromise = (plugin as any).applyJqFilter(".test", inputData);

			// Simulate JQ outputting invalid JSON
			mockProcess.simulateSuccess("not valid json{");

			const result = await filterPromise;
			expect(result).toBeNull();
		});

		it("should return null when spawn fails", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { test: "data" };

			const filterPromise = (plugin as any).applyJqFilter(".test", inputData);

			mockProcess.simulateSpawnError(new Error("ENOENT: jq command not found"));

			const result = await filterPromise;
			expect(result).toBeNull();
		});

		it("should handle empty output gracefully", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { test: "data" };

			const filterPromise = (plugin as any).applyJqFilter(
				".missing",
				inputData,
			);

			mockProcess.simulateSuccess("null");

			const result = await filterPromise;
			expect(result).toBeNull();
		});

		it("should handle non-zero exit codes", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { test: "data" };

			const filterPromise = (plugin as any).applyJqFilter(
				".field | error",
				inputData,
			);

			mockProcess.simulateFailure(5, "jq: error: some error occurred");

			const result = await filterPromise;
			expect(result).toBeNull();
		});
	});

	describe("Security tests - dangerous patterns", () => {
		it("should reject filters with system() function", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const inputData = { test: "data" };

			const result = await (plugin as any).applyJqFilter(
				'. | system("rm -rf /")',
				inputData,
			);

			expect(result).toBeNull();
			expect(mockSpawn).not.toHaveBeenCalled();
		});

		it("should reject filters with $ENV access", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const inputData = { test: "data" };

			const result = await (plugin as any).applyJqFilter(
				"$ENV.SECRET_KEY",
				inputData,
			);

			expect(result).toBeNull();
			expect(mockSpawn).not.toHaveBeenCalled();
		});

		it("should reject filters with env. access", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const inputData = { test: "data" };

			const result = await (plugin as any).applyJqFilter("env.HOME", inputData);

			expect(result).toBeNull();
			expect(mockSpawn).not.toHaveBeenCalled();
		});

		it("should reject filters with input_filename", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const inputData = { test: "data" };

			const result = await (plugin as any).applyJqFilter(
				"input_filename",
				inputData,
			);

			expect(result).toBeNull();
			expect(mockSpawn).not.toHaveBeenCalled();
		});

		it("should reject filters with $__ pattern", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const inputData = { test: "data" };

			const result = await (plugin as any).applyJqFilter("$__loc__", inputData);

			expect(result).toBeNull();
			expect(mockSpawn).not.toHaveBeenCalled();
		});

		it("should reject dangerous patterns case-insensitively", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const inputData = { test: "data" };

			const result1 = await (plugin as any).applyJqFilter(
				'SYSTEM("ls")',
				inputData,
			);
			const result2 = await (plugin as any).applyJqFilter(
				"$env.PATH",
				inputData,
			);

			expect(result1).toBeNull();
			expect(result2).toBeNull();
			expect(mockSpawn).not.toHaveBeenCalled();
		});

		it("should allow safe filters with similar but non-dangerous patterns", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { environment: "production", systematic: true };
			const expectedOutput = { environment: "production" };

			// This filter contains "env" and "system" as substrings but not the dangerous patterns
			const filterPromise = (plugin as any).applyJqFilter(
				"{environment}",
				inputData,
			);

			mockProcess.simulateSuccess(JSON.stringify(expectedOutput));

			const result = await filterPromise;
			expect(result).toEqual(expectedOutput);
			expect(mockSpawn).toHaveBeenCalled();
		});
	});

	describe("Integration with debug logging", () => {
		it("should log when debug is enabled", async () => {
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				config: { debug: true },
			});

			const inputData = { test: "data" };

			// Test with rejected dangerous filter
			await (plugin as any).applyJqFilter('system("ls")', inputData);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"[ToolOutputFilterPlugin] Dangerous JQ filter rejected",
				),
			);

			consoleErrorSpy.mockRestore();
		});

		it("should log JQ execution failures when debug is enabled", async () => {
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
				config: { debug: true },
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { test: "data" };

			const filterPromise = (plugin as any).applyJqFilter(
				".invalid",
				inputData,
			);

			mockProcess.simulateFailure(1, "jq error");

			await filterPromise;

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("[ToolOutputFilterPlugin] JQ execution failed"),
			);

			consoleErrorSpy.mockRestore();
		});
	});

	describe("Edge cases", () => {
		it("should handle very large JSON inputs", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			// Create large input data
			const largeArray = Array.from({ length: 1000 }, (_, i) => ({
				id: i,
				data: "x".repeat(100),
			}));
			const inputData = { items: largeArray };
			const expectedOutput = { count: 1000 };

			const filterPromise = (plugin as any).applyJqFilter(
				"{count: .items | length}",
				inputData,
			);

			mockProcess.simulateSuccess(JSON.stringify(expectedOutput));

			const result = await filterPromise;
			expect(result).toEqual(expectedOutput);
			expect(mockProcess.stdin.write).toHaveBeenCalledWith(
				JSON.stringify(inputData),
			);
		});

		it("should handle special characters in data", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = {
				text: "Special chars: \"quotes\", 'apostrophes', \nnewlines\n, \ttabs",
				unicode: "😀 emoji 中文",
			};
			const expectedOutput = { text: inputData.text };

			const filterPromise = (plugin as any).applyJqFilter("{text}", inputData);

			mockProcess.simulateSuccess(JSON.stringify(expectedOutput));

			const result = await filterPromise;
			expect(result).toEqual(expectedOutput);
		});

		it("should handle filters that return arrays", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { items: [1, 2, 3, 4, 5] };
			const expectedOutput = [1, 2, 3];

			const filterPromise = (plugin as any).applyJqFilter(
				".items[0:3]",
				inputData,
			);

			mockProcess.simulateSuccess(JSON.stringify(expectedOutput));

			const result = await filterPromise;
			expect(result).toEqual(expectedOutput);
		});

		it("should handle filters that return primitives", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { count: 42 };

			const filterPromise = (plugin as any).applyJqFilter(".count", inputData);

			mockProcess.simulateSuccess("42");

			const result = await filterPromise;
			expect(result).toBe(42);
		});
	});

	describe("Process timeout handling", () => {
		it("should respect timeout configuration", async () => {
			const mockModel = createMockFilterModel(["."]);
			const plugin = new ToolOutputFilterPlugin({
				filterModel: mockModel,
			});

			const mockProcess = new MockChildProcess();
			mockSpawn.mockReturnValue(mockProcess);

			const inputData = { test: "data" };

			(plugin as any).applyJqFilter(".test", inputData);

			expect(mockSpawn).toHaveBeenCalledWith("jq", ["-c", ".test"], {
				timeout: 10000,
			});
		});
	});
});
