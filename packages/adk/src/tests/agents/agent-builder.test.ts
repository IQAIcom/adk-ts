import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
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

	describe("Output schema configuration", () => {
		let builder: AgentBuilder;
		let mockAgent1: LlmAgent;
		let mockAgent2: LlmAgent;
		let mockAgent3: LlmAgent;

		beforeEach(() => {
			builder = AgentBuilder.create("test_agent");
			mockAgent1 = new LlmAgent({
				name: "agent1",
				model: "gemini-2.5-flash",
				description: "First agent",
			});
			mockAgent2 = new LlmAgent({
				name: "agent2",
				model: "gemini-2.5-flash",
				description: "Second agent",
			});
			mockAgent3 = new LlmAgent({
				name: "agent3",
				model: "gemini-2.5-flash",
				description: "Third agent (last)",
			});
		});

		it("should configure output schema", () => {
			const schema = z.object({
				result: z.string(),
				confidence: z.number(),
			});
			const result = builder.withOutputSchema(schema);
			expect(result).toBe(builder);
		});

		it("should apply output schema to last LlmAgent when using withOutputSchema then asSequential", async () => {
			const schema = z.object({
				result: z.string(),
				confidence: z.number(),
			});

			const { agent } = await builder
				.withOutputSchema(schema)
				.asSequential([mockAgent1, mockAgent2, mockAgent3])
				.build();

			expect(agent).toBeInstanceOf(SequentialAgent);
			const sequentialAgent = agent as SequentialAgent;

			// Check that the last agent has the output schema applied
			const lastAgent =
				sequentialAgent.subAgents[sequentialAgent.subAgents.length - 1];
			expect(lastAgent).toBeInstanceOf(LlmAgent);
			expect((lastAgent as LlmAgent).outputSchema).toBe(schema);

			// Check that other agents don't have the output schema
			expect(
				(sequentialAgent.subAgents[0] as LlmAgent).outputSchema,
			).toBeUndefined();
			expect(
				(sequentialAgent.subAgents[1] as LlmAgent).outputSchema,
			).toBeUndefined();
		});

		it("should apply output schema to last LlmAgent when using asSequential then withOutputSchema", async () => {
			const schema = z.object({
				result: z.string(),
				confidence: z.number(),
			});

			const { agent } = await builder
				.asSequential([mockAgent1, mockAgent2, mockAgent3])
				.withOutputSchema(schema)
				.build();

			expect(agent).toBeInstanceOf(SequentialAgent);
			const sequentialAgent = agent as SequentialAgent;

			// Check that the last agent has the output schema applied
			const lastAgent =
				sequentialAgent.subAgents[sequentialAgent.subAgents.length - 1];
			expect(lastAgent).toBeInstanceOf(LlmAgent);
			expect((lastAgent as LlmAgent).outputSchema).toBe(schema);
		});

		it("should apply output schema to last LlmAgent when there are only LlmAgents", async () => {
			const schema = z.object({
				result: z.string(),
			});

			const { agent } = await builder
				.withOutputSchema(schema)
				.asSequential([mockAgent1, mockAgent2])
				.build();

			expect(agent).toBeInstanceOf(SequentialAgent);
			const sequentialAgent = agent as SequentialAgent;

			// Check that the last agent (agent2) has the output schema applied
			const lastAgent =
				sequentialAgent.subAgents[sequentialAgent.subAgents.length - 1];
			expect(lastAgent).toBeInstanceOf(LlmAgent);
			expect((lastAgent as LlmAgent).outputSchema).toBe(schema);

			// Check that the first agent doesn't have the output schema
			expect(
				(sequentialAgent.subAgents[0] as LlmAgent).outputSchema,
			).toBeUndefined();
		});

		it("should apply output schema to last LlmAgent when sequential has mixed agent types", async () => {
			const schema = z.object({
				result: z.string(),
			});

			// Create a non-LlmAgent (we'll use SequentialAgent as an example)
			const nestedSequential = new SequentialAgent({
				name: "nested_sequential",
				description: "Nested sequential agent",
				subAgents: [mockAgent1],
			});

			const { agent } = await builder
				.withOutputSchema(schema)
				.asSequential([nestedSequential, mockAgent2, mockAgent3])
				.build();

			expect(agent).toBeInstanceOf(SequentialAgent);
			const sequentialAgent = agent as SequentialAgent;

			// Check that the last LlmAgent (agent3) has the output schema applied
			const lastAgent =
				sequentialAgent.subAgents[sequentialAgent.subAgents.length - 1];
			expect(lastAgent).toBeInstanceOf(LlmAgent);
			expect((lastAgent as LlmAgent).outputSchema).toBe(schema);

			// Check that agent2 (middle agent) doesn't have the output schema
			expect(
				(sequentialAgent.subAgents[1] as LlmAgent).outputSchema,
			).toBeUndefined();
		});

		it("should not apply output schema when not using sequential agent type", async () => {
			const schema = z.object({
				result: z.string(),
			});

			const { agent } = await builder
				.withOutputSchema(schema)
				.withModel("gemini-2.5-flash")
				.build();

			expect(agent).toBeInstanceOf(LlmAgent);
			// For regular LLM agents, the output schema should still be applied
			expect((agent as LlmAgent).outputSchema).toBe(schema);
		});

		it("should handle empty sequential agents gracefully", async () => {
			const schema = z.object({
				result: z.string(),
			});

			// This should throw an error because sequential agents require sub-agents
			await expect(
				builder.withOutputSchema(schema).asSequential([]).build(),
			).rejects.toThrow("Sub-agents required for sequential agent");
		});

		it("should apply output schema to all LlmAgents when using withOutputSchema then asParallel", async () => {
			const schema = z.object({
				result: z.string(),
				confidence: z.number(),
			});

			const { agent } = await builder
				.withOutputSchema(schema)
				.asParallel([mockAgent1, mockAgent2, mockAgent3])
				.build();

			expect(agent).toBeInstanceOf(ParallelAgent);
			const parallelAgent = agent as ParallelAgent;

			// Check that all LlmAgents have the output schema applied
			expect((parallelAgent.subAgents[0] as LlmAgent).outputSchema).toBe(schema);
			expect((parallelAgent.subAgents[1] as LlmAgent).outputSchema).toBe(schema);
			expect((parallelAgent.subAgents[2] as LlmAgent).outputSchema).toBe(schema);
		});

		it("should apply output schema to all LlmAgents when using asParallel then withOutputSchema", async () => {
			const schema = z.object({
				result: z.string(),
				confidence: z.number(),
			});

			const { agent } = await builder
				.asParallel([mockAgent1, mockAgent2, mockAgent3])
				.withOutputSchema(schema)
				.build();

			expect(agent).toBeInstanceOf(ParallelAgent);
			const parallelAgent = agent as ParallelAgent;

			// Check that all LlmAgents have the output schema applied
			expect((parallelAgent.subAgents[0] as LlmAgent).outputSchema).toBe(schema);
			expect((parallelAgent.subAgents[1] as LlmAgent).outputSchema).toBe(schema);
			expect((parallelAgent.subAgents[2] as LlmAgent).outputSchema).toBe(schema);
		});

		it("should apply output schema to all LlmAgents when parallel has mixed agent types", async () => {
			const schema = z.object({
				result: z.string(),
			});

			// Create a non-LlmAgent (we'll use SequentialAgent as an example)
			const nestedSequential = new SequentialAgent({
				name: "nested_sequential",
				description: "Nested sequential agent",
				subAgents: [mockAgent1],
			});

			const { agent } = await builder
				.withOutputSchema(schema)
				.asParallel([nestedSequential, mockAgent2, mockAgent3])
				.build();

			expect(agent).toBeInstanceOf(ParallelAgent);
			const parallelAgent = agent as ParallelAgent;

			// Check that all LlmAgents have the output schema applied
			// nestedSequential is not an LlmAgent, so it shouldn't have the schema
			expect((parallelAgent.subAgents[1] as LlmAgent).outputSchema).toBe(schema);
			expect((parallelAgent.subAgents[2] as LlmAgent).outputSchema).toBe(schema);
		});

		it("should handle empty parallel agents gracefully", async () => {
			const schema = z.object({
				result: z.string(),
			});

			// This should throw an error because parallel agents require sub-agents
			await expect(
				builder.withOutputSchema(schema).asParallel([]).build(),
			).rejects.toThrow("Sub-agents required for parallel agent");
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
