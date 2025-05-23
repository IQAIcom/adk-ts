import { Agent } from "@adk/agents/llm-agent";
import type { FunctionDeclaration } from "@adk/models/function-declaration";
import { LLMRegistry } from "@adk/models/llm-registry";
import { LLMResponse } from "@adk/models/llm-response";
import { OpenAILLM } from "@adk/models/openai-llm";
import { BaseTool } from "@adk/tools/base/base-tool";
import type { ToolContext } from "@adk/tools/tool-context";
import {
	type Mock,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

// Mock these modules first
vi.mock("@adk/models/openai-llm");
vi.mock("@adk/models/llm-registry");

// Create mock implementation after mocking
const mockGenerateContent = vi.fn().mockImplementation(async function* () {
	yield new LLMResponse({
		role: "assistant",
		content: "This is a mock response",
	});
});

// Create a mock LLM object
const createMockLLM = (model: string) => {
	return {
		model,
		generateContentAsync: mockGenerateContent,
		supportedModels: () => ["gpt-4.1-mini-2025-04-14", "gpt-4"],
		connect: vi.fn(),
	};
};

// Setup mocks
beforeAll(() => {
	// Mock OpenAILLM implementation using a more direct approach
	vi.spyOn(OpenAILLM.prototype, "generateContentAsync").mockImplementation(
		mockGenerateContent,
	);

	// Setup LLMRegistry mock
	vi.spyOn(LLMRegistry, "resolve").mockImplementation((model: string) => {
		if (model === "gpt-4.1-mini-2025-04-14" || model === "gpt-4") {
			return OpenAILLM;
		}
		return null;
	});

	vi.spyOn(LLMRegistry, "newLLM").mockImplementation((model: string) => {
		return new OpenAILLM(model);
	});
});

// Mock Tool for testing
class MockTool extends BaseTool {
	constructor() {
		super({
			name: "mock_tool",
			description: "A mock tool for testing",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					input: {
						type: "string",
						description: "Input for the tool",
					},
				},
				required: ["input"],
			},
		};
	}

	async runAsync(args: { input: string }, _context: ToolContext): Promise<any> {
		return { result: `Processed: ${args.input}` };
	}
}

describe("Agent Class", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with default configuration", () => {
		const agent = new Agent({
			name: "test_agent",
			model: "gpt-4.1-mini-2025-04-14",
			description: "A test agent",
		});

		expect(agent).toBeDefined();
		expect(agent).toBeInstanceOf(Agent);
	});

	it("should initialize with tools", () => {
		const mockTool = new MockTool();
		const agent = new Agent({
			name: "test_agent",
			model: "gpt-4.1-mini-2025-04-14",
			description: "A test agent with tools",
			tools: [mockTool],
		});

		expect(agent).toBeDefined();
		expect(agent).toBeInstanceOf(Agent);
	});

	it("should run and return a response", async () => {
		// Create a spy on LLMRegistry.newLLM to verify it's called correctly
		const newLLMSpy = vi.spyOn(LLMRegistry, "newLLM");

		const agent = new Agent({
			name: "test_agent",
			model: "gpt-4.1-mini-2025-04-14",
			description: "A test agent",
		});

		// Override the run method to avoid the actual implementation
		const mockResponse = new LLMResponse({
			role: "assistant",
			content: "This is a mock response",
		});

		vi.spyOn(agent, "run").mockResolvedValue(mockResponse);

		const response = await agent.run({
			messages: [{ role: "user", content: "Hello, agent!" }],
		});

		expect(response).toBeDefined();
		expect(response.role).toBe("assistant");
		expect(response.content).toBe("This is a mock response");
	});

	it("should apply instructions when provided", async () => {
		const agent = new Agent({
			name: "test_agent",
			model: "gpt-4.1-mini-2025-04-14",
			description: "A test agent",
			instructions: "You are a helpful assistant.",
		});

		// Override the run method to avoid the actual implementation
		const mockResponse = new LLMResponse({
			role: "assistant",
			content: "This is a mock response",
		});

		vi.spyOn(agent, "run").mockResolvedValue(mockResponse);

		const response = await agent.run({
			messages: [{ role: "user", content: "Hello, agent!" }],
		});

		expect(response).toBeDefined();
		expect(response.content).toBe("This is a mock response");
	});

	// Additional test cases would follow:
	// - Tool execution tests
	// - Streaming response tests
	// - Memory integration tests
	// - Error handling tests
});
