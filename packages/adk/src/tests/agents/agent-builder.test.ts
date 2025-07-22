import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentBuilder } from "../../agents/agent-builder.js";
import { LangGraphAgent } from "../../agents/lang-graph-agent.js";
import { LlmAgent } from "../../agents/llm-agent.js";
import { LoopAgent } from "../../agents/loop-agent.js";
import { ParallelAgent } from "../../agents/parallel-agent.js";
import { SequentialAgent } from "../../agents/sequential-agent.js";
import { InMemoryArtifactService } from "../../artifacts/in-memory-artifact-service.js";
import { InMemoryMemoryService } from "../../memory/in-memory-memory-service.js";
import { InMemorySessionService } from "../../sessions/in-memory-session-service.js";
import { createTool } from "../../tools/base/create-tool.js";

describe("AgentBuilder", () => {
	let sessionService: InMemorySessionService;
	let memoryService: InMemoryMemoryService;
	let artifactService: InMemoryArtifactService;

	beforeEach(() => {
		sessionService = new InMemorySessionService();
		memoryService = new InMemoryMemoryService();
		artifactService = new InMemoryArtifactService();
		vi.clearAllMocks();
	});

	describe("Static factory methods", () => {
		it("should create instance with create()", () => {
			const builder = AgentBuilder.create("test_agent");
			expect(builder).toBeInstanceOf(AgentBuilder);
		});

		it("should create instance with default name", () => {
			const builder = AgentBuilder.create();
			expect(builder).toBeInstanceOf(AgentBuilder);
		});

		it("should create instance with withModel()", () => {
			const builder = AgentBuilder.withModel("gemini-2.5-flash");
			expect(builder).toBeInstanceOf(AgentBuilder);
		});
	});

	describe("Configuration methods", () => {
		let builder: AgentBuilder;

		beforeEach(() => {
			builder = AgentBuilder.create("test_agent");
		});

		it("should configure model", () => {
			const result = builder.withModel("gemini-2.5-flash");
			expect(result).toBe(builder); // Should return same instance for chaining
		});

		it("should configure description", () => {
			const result = builder.withDescription("Test description");
			expect(result).toBe(builder);
		});

		it("should configure instruction", () => {
			const result = builder.withInstruction("Test instruction");
			expect(result).toBe(builder);
		});

		it("should configure tools", () => {
			const tool = createTool({
				name: "test_tool",
				description: "A test tool",
				fn: () => "test result",
			});
			const result = builder.withTools(tool);
			expect(result).toBe(builder);
		});

		it("should add multiple tools", () => {
			const tool1 = createTool({
				name: "tool1",
				description: "Tool 1",
				fn: () => "result1",
			});
			const tool2 = createTool({
				name: "tool2",
				description: "Tool 2",
				fn: () => "result2",
			});
			const result = builder.withTools(tool1, tool2);
			expect(result).toBe(builder);
		});
	});

	describe("Session configuration", () => {
		let builder: AgentBuilder;

		beforeEach(() => {
			builder = AgentBuilder.create("test_agent").withModel("gemini-2.5-flash");
		});

		it("should configure session with service and options", () => {
			const result = builder.withSessionService(sessionService, {
				userId: "user123",
				appName: "testapp",
			});
			expect(result).toBe(builder);
		});

		it("should configure session with service only", () => {
			const result = builder.withSessionService(sessionService);
			expect(result).toBe(builder);
		});

		it("should configure session with empty options", () => {
			const result = builder.withSessionService(sessionService, {});
			expect(result).toBe(builder);
		});

		it("should configure quick session", () => {
			const result = builder.withQuickSession({
				userId: "user123",
				appName: "testapp",
			});
			expect(result).toBe(builder);
		});

		it("should configure quick session with no options", () => {
			const result = builder.withQuickSession();
			expect(result).toBe(builder);
		});
	});

	describe("Memory and Artifact services", () => {
		let builder: AgentBuilder;

		beforeEach(() => {
			builder = AgentBuilder.create("test_agent").withModel("gemini-2.5-flash");
		});

		it("should configure memory service", () => {
			const result = builder.withMemory(memoryService);
			expect(result).toBe(builder);
		});

		it("should configure artifact service", () => {
			const result = builder.withArtifactService(artifactService);
			expect(result).toBe(builder);
		});

		it("should configure both memory and artifact services", () => {
			const result = builder
				.withMemory(memoryService)
				.withArtifactService(artifactService);
			expect(result).toBe(builder);
		});
	});

	describe("Agent type configuration", () => {
		let builder: AgentBuilder;
		let mockAgent: LlmAgent;

		beforeEach(() => {
			builder = AgentBuilder.create("test_agent");
			mockAgent = new LlmAgent({
				name: "mock_agent",
				model: "gemini-2.5-flash",
				description: "Mock agent for testing",
			});
		});

		it("should configure as sequential agent", () => {
			const result = builder.asSequential([mockAgent]);
			expect(result).toBe(builder);
		});

		it("should configure as parallel agent", () => {
			const result = builder.asParallel([mockAgent]);
			expect(result).toBe(builder);
		});

		it("should configure as loop agent", () => {
			const result = builder.asLoop([mockAgent], 5);
			expect(result).toBe(builder);
		});

		it("should configure as loop agent with default iterations", () => {
			const result = builder.asLoop([mockAgent]);
			expect(result).toBe(builder);
		});

		it("should configure as LangGraph agent", () => {
			const nodes = [
				{
					name: "start",
					agent: mockAgent,
					targets: ["end"],
				},
				{
					name: "end",
					agent: mockAgent,
					targets: [],
				},
			];
			const result = builder.asLangGraph(nodes, "start");
			expect(result).toBe(builder);
		});
	});

	describe("Building agents", () => {
		it("should build LLM agent successfully", async () => {
			const { agent, runner, session } = await AgentBuilder.create("test_llm")
				.withModel("gemini-2.5-flash")
				.build();

			expect(agent).toBeInstanceOf(LlmAgent);
			expect(runner).toBeDefined();
			expect(session).toBeDefined();
			expect(runner.ask).toBeInstanceOf(Function);
		});

		it("should build sequential agent successfully", async () => {
			const subAgent = new LlmAgent({
				name: "sub_agent",
				model: "gemini-2.5-flash",
				description: "Sub agent for testing",
			});

			const { agent } = await AgentBuilder.create("test_sequential")
				.asSequential([subAgent])
				.build();

			expect(agent).toBeInstanceOf(SequentialAgent);
		});

		it("should build parallel agent successfully", async () => {
			const subAgent = new LlmAgent({
				name: "sub_agent",
				model: "gemini-2.5-flash",
				description: "Sub agent for testing",
			});

			const { agent } = await AgentBuilder.create("test_parallel")
				.asParallel([subAgent])
				.build();

			expect(agent).toBeInstanceOf(ParallelAgent);
		});

		it("should build loop agent successfully", async () => {
			const subAgent = new LlmAgent({
				name: "sub_agent",
				model: "gemini-2.5-flash",
				description: "Sub agent for testing",
			});

			const { agent } = await AgentBuilder.create("test_loop")
				.asLoop([subAgent])
				.build();

			expect(agent).toBeInstanceOf(LoopAgent);
		});

		it("should build LangGraph agent successfully", async () => {
			const subAgent = new LlmAgent({
				name: "sub_agent",
				model: "gemini-2.5-flash",
				description: "Sub agent for testing",
			});

			const nodes = [
				{
					name: "start",
					agent: subAgent,
					targets: [],
				},
			];

			const { agent } = await AgentBuilder.create("test_langgraph")
				.asLangGraph(nodes, "start")
				.build();

			expect(agent).toBeInstanceOf(LangGraphAgent);
		});

		it("should create default session when none provided", async () => {
			const { session } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.build();

			expect(session).toBeDefined();
			expect(session.id).toBeDefined();
		});

		it("should use provided session service", async () => {
			const { session } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withSessionService(sessionService, {
					userId: "user123",
					appName: "testapp",
				})
				.build();

			expect(session).toBeDefined();
			expect(session.userId).toBe("user123");
			expect(session.appName).toBe("testapp");
		});
	});

	describe("Error handling", () => {
		it("should throw error when building LLM agent without model", async () => {
			await expect(AgentBuilder.create("test_agent").build()).rejects.toThrow(
				"Model is required for LLM agent",
			);
		});

		it("should throw error when building sequential agent without sub_agents", async () => {
			await expect(
				AgentBuilder.create("test_agent").asSequential([]).build(),
			).rejects.toThrow("Sub-agents required for sequential agent");
		});

		it("should throw error when building parallel agent without sub_agents", async () => {
			await expect(
				AgentBuilder.create("test_agent").asParallel([]).build(),
			).rejects.toThrow("Sub-agents required for parallel agent");
		});

		it("should throw error when building loop agent without sub_agents", async () => {
			await expect(
				AgentBuilder.create("test_agent").asLoop([]).build(),
			).rejects.toThrow("Sub-agents required for loop agent");
		});

		it("should throw error when building LangGraph agent without nodes", async () => {
			await expect(
				AgentBuilder.create("test_agent").asLangGraph([], "start").build(),
			).rejects.toThrow("Nodes and root node required for LangGraph agent");
		});

		it("should throw error when building LangGraph agent without root node", async () => {
			const mockAgent = new LlmAgent({
				name: "mock_agent",
				model: "gemini-2.5-flash",
				description: "Mock agent for testing",
			});

			const nodes = [
				{
					name: "start",
					agent: mockAgent,
					targets: [],
				},
			];

			await expect(
				AgentBuilder.create("test_agent").asLangGraph(nodes, "").build(),
			).rejects.toThrow("Nodes and root node required for LangGraph agent");
		});
	});

	describe("Integration tests", () => {
		it("should work with all services configured", async () => {
			const tool = createTool({
				name: "test_tool",
				description: "A test tool",
				fn: () => "test result",
			});

			const { agent, runner, session } = await AgentBuilder.create(
				"integration_test",
			)
				.withModel("gemini-2.5-flash")
				.withDescription("Integration test agent")
				.withInstruction("You are a test agent")
				.withTools(tool)
				.withMemory(memoryService)
				.withArtifactService(artifactService)
				.withSessionService(sessionService, {
					userId: "test-user",
					appName: "test-app",
				})
				.build();

			expect(agent).toBeInstanceOf(LlmAgent);
			expect(runner).toBeDefined();
			expect(session).toBeDefined();
			expect(session.userId).toBe("test-user");
			expect(session.appName).toBe("test-app");
		});

		it("should work with methods called in different order", async () => {
			const { agent, runner } = await AgentBuilder.create("order_test")
				.withSessionService(sessionService, {
					userId: "user1",
					appName: "app1",
				})
				.withArtifactService(artifactService)
				.withModel("gemini-2.5-flash")
				.withMemory(memoryService)
				.withDescription("Order test agent")
				.build();

			expect(agent).toBeInstanceOf(LlmAgent);
			expect(runner).toBeDefined();
		});

		it("should work with minimal configuration", async () => {
			const { agent, runner, session } =
				await AgentBuilder.withModel("gemini-2.5-flash").build();

			expect(agent).toBeInstanceOf(LlmAgent);
			expect(runner).toBeDefined();
			expect(session).toBeDefined();
		});
	});

	describe("Enhanced runner functionality", () => {
		it("should provide ask method that returns string", async () => {
			const { runner } = await AgentBuilder.create("ask_test")
				.withModel("gemini-2.5-flash")
				.build();

			expect(runner.ask).toBeInstanceOf(Function);
			// Note: We can't easily test the actual ask functionality without mocking the LLM
		});

		it("should provide runAsync method", async () => {
			const { runner, session } = await AgentBuilder.create("run_async_test")
				.withModel("gemini-2.5-flash")
				.build();

			expect(runner.runAsync).toBeInstanceOf(Function);

			// Test that runAsync returns an async iterable
			const result = runner.runAsync({
				userId: session.userId,
				sessionId: session.id,
				newMessage: { parts: [{ text: "test" }] },
			});

			expect(result).toBeDefined();
			expect(typeof result[Symbol.asyncIterator]).toBe("function");
		});
	});

	describe("Default value generation", () => {
		it("should generate default userId when not provided", async () => {
			const { session } = await AgentBuilder.create("default_user_test")
				.withModel("gemini-2.5-flash")
				.withSessionService(sessionService)
				.build();

			expect(session.userId).toBeDefined();
			expect(session.userId).toMatch(/^user-default_user_test-/);
		});

		it("should generate default appName when not provided", async () => {
			const { session } = await AgentBuilder.create("default_app_test")
				.withModel("gemini-2.5-flash")
				.withSessionService(sessionService)
				.build();

			expect(session.appName).toBeDefined();
			expect(session.appName).toBe("app-default_app_test");
		});
	});
});
