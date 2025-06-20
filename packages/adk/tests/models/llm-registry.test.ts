import { BaseLlm } from "@adk/models/base-llm";
import { LLMRegistry } from "@adk/models/llm-registry";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Create a mock LLM class that extends BaseLLM
class MockLLM extends BaseLlm {
	static supportedModels(): string[] {
		return ["mock-model-.*", "exact-mock-model"];
	}

	async *generateContentAsyncImpl(): AsyncGenerator<any, void, unknown> {
		yield { content: "Mock content", role: "assistant" };
	}

	connect(): any {
		return {};
	}
}

describe("LLMRegistry", () => {
	// Clear registry before each test
	beforeEach(() => {
		// Reset the registry's static map
		// @ts-expect-error - Accessing private property for testing
		LLMRegistry.llmRegistry = new Map();
	});

	it("should register an LLM class with a pattern", () => {
		// Register the mock LLM
		LLMRegistry.register("mock-pattern", MockLLM);

		// Resolve an LLM class from a pattern
		const llmClass = LLMRegistry.resolve("mock-pattern");

		// Expect the resolved class to be our MockLLM
		expect(llmClass).toBe(MockLLM);
	});

	it("should register all supported models from an LLM class", () => {
		// Register all supported models
		LLMRegistry.registerLLM(MockLLM);

		// Resolve an LLM class for a model matching the pattern
		const llmClass1 = LLMRegistry.resolve("mock-model-123");
		const llmClass2 = LLMRegistry.resolve("exact-mock-model");

		// Expect both to resolve to our MockLLM
		expect(llmClass1).toBe(MockLLM);
		expect(llmClass2).toBe(MockLLM);
	});

	it("should create a new LLM instance for a supported model", () => {
		// Register the mock LLM
		LLMRegistry.registerLLM(MockLLM);

		// Create a new LLM instance
		const llm = LLMRegistry.newLLM("mock-model-abc");

		// Expect the created instance to be of our MockLLM class
		expect(llm).toBeInstanceOf(MockLLM);
		expect(llm.model).toBe("mock-model-abc");
	});

	it("should throw an error for an unsupported model", () => {
		// Register the mock LLM
		LLMRegistry.registerLLM(MockLLM);

		// Expect an error when trying to create an LLM for an unsupported model
		expect(() => LLMRegistry.newLLM("unsupported-model")).toThrow(
			"No LLM found for model: unsupported-model",
		);
	});

	it("should log registered models when DEBUG is true", () => {
		// Store original process.env.DEBUG
		const originalDebug = process.env.DEBUG;

		// Set DEBUG to true
		process.env.DEBUG = "true";

		// Mock console.log
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		// Register the mock LLM
		LLMRegistry.registerLLM(MockLLM);

		// Call logRegisteredModels
		LLMRegistry.logRegisteredModels();

		// Verify console.log was called
		expect(consoleSpy).toHaveBeenCalledWith("Registered LLM models:");
		expect(consoleSpy).toHaveBeenCalledTimes(3); // Once for the header, twice for the patterns

		// Restore original DEBUG value
		process.env.DEBUG = originalDebug;

		// Restore console.log
		consoleSpy.mockRestore();
	});

	it("should not log registered models when DEBUG is not true", () => {
		// Store original process.env.DEBUG
		const originalDebug = process.env.DEBUG;

		// Set DEBUG to false
		process.env.DEBUG = "false";

		// Mock console.log
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		// Register the mock LLM
		LLMRegistry.registerLLM(MockLLM);

		// Call logRegisteredModels
		LLMRegistry.logRegisteredModels();

		// Verify console.log was not called
		expect(consoleSpy).not.toHaveBeenCalled();

		// Restore original DEBUG value
		process.env.DEBUG = originalDebug;

		// Restore console.log
		consoleSpy.mockRestore();
	});
});
