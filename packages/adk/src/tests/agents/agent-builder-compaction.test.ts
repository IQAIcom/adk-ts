import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentBuilder } from "../../agents/agent-builder.js";
import type { EventsCompactionConfig } from "../../events/compaction-config.js";
import { Event } from "../../events/event.js";
import { EventActions } from "../../events/event-actions.js";
import type { EventsSummarizer } from "../../events/events-summarizer.js";
import { InMemorySessionService } from "../../sessions/in-memory-session-service.js";

describe("AgentBuilder - Events Compaction", () => {
	let sessionService: InMemorySessionService;

	beforeEach(() => {
		sessionService = new InMemorySessionService();
		vi.clearAllMocks();
	});

	describe("withEventsCompaction", () => {
		it("should configure compaction with custom config", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 10,
				overlapSize: 3,
			};

			const builder = AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config);

			expect(builder).toBeInstanceOf(AgentBuilder);
		});

		it("should configure compaction with custom summarizer", async () => {
			const mockSummarizer: EventsSummarizer = {
				maybeSummarizeEvents: vi.fn().mockResolvedValue(undefined),
			};

			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
				summarizer: mockSummarizer,
			};

			const builder = AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config);

			expect(builder).toBeInstanceOf(AgentBuilder);
		});

		it("should chain with other configuration methods", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			const { agent, runner, session } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withDescription("Test agent")
				.withInstruction("Be helpful")
				.withEventsCompaction(config)
				.withSessionService(sessionService)
				.build();

			expect(agent).toBeDefined();
			expect(runner).toBeDefined();
			expect(session).toBeDefined();
		});

		it("should allow compaction config to be set before model", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			const { agent } = await AgentBuilder.create("test_agent")
				.withEventsCompaction(config)
				.withModel("gemini-2.5-flash")
				.build();

			expect(agent).toBeDefined();
		});

		it("should allow compaction config to be set after session service", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			const { agent } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withSessionService(sessionService)
				.withEventsCompaction(config)
				.build();

			expect(agent).toBeDefined();
		});
	});

	describe("Integration with runner", () => {
		it("should pass compaction config to runner", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 3,
				overlapSize: 1,
			};

			const { runner } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config)
				.withSessionService(sessionService)
				.build();

			expect(runner).toBeDefined();
		});

		it("should work without explicit session service", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			const { runner, session } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config)
				.build();

			expect(runner).toBeDefined();
			expect(session).toBeDefined();
		});
	});

	describe("Compaction config validation", () => {
		it("should accept valid compactionInterval", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 1,
				overlapSize: 0,
			};

			const { agent } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config)
				.build();

			expect(agent).toBeDefined();
		});

		it("should accept valid overlapSize", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 0,
			};

			const { agent } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config)
				.build();

			expect(agent).toBeDefined();
		});

		it("should accept large compactionInterval", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 1000,
				overlapSize: 10,
			};

			const { agent } = await AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config)
				.build();

			expect(agent).toBeDefined();
		});
	});

	describe("Multiple configurations", () => {
		it("should allow updating compaction config", async () => {
			const config1: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			const config2: EventsCompactionConfig = {
				compactionInterval: 10,
				overlapSize: 3,
			};

			const builder = AgentBuilder.create("test_agent")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config1)
				.withEventsCompaction(config2);

			const { agent } = await builder.build();

			expect(agent).toBeDefined();
		});

		it("should work with all configuration options combined", async () => {
			const mockSummarizer: EventsSummarizer = {
				maybeSummarizeEvents: vi.fn().mockResolvedValue(
					new Event({
						invocationId: "comp-inv",
						author: "user",
						actions: new EventActions({
							compaction: {
								startTimestamp: 1000,
								endTimestamp: 2000,
								compactedContent: {
									role: "model",
									parts: [{ text: "Summary" }],
								},
							},
						}),
					}),
				),
			};

			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
				summarizer: mockSummarizer,
			};

			const { agent, runner, session } = await AgentBuilder.create(
				"full_config_test",
			)
				.withModel("gemini-2.5-flash")
				.withDescription("Full configuration test")
				.withInstruction("Test all options")
				.withSessionService(sessionService, {
					userId: "test-user",
					appName: "test-app",
				})
				.withEventsCompaction(config)
				.build();

			expect(agent).toBeDefined();
			expect(runner).toBeDefined();
			expect(session).toBeDefined();
			expect(session.userId).toBe("test-user");
		});
	});

	describe("Usage with different agent types", () => {
		it("should work with LLM agent", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			const { agent } = await AgentBuilder.create("llm_test")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config)
				.build();

			expect(agent).toBeDefined();
		});

		it("should configure compaction interval correctly", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 3,
				overlapSize: 1,
			};

			const builder = AgentBuilder.create("interval_test")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config);

			expect(builder).toBeInstanceOf(AgentBuilder);
		});

		it("should configure overlap size correctly", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 3,
			};

			const builder = AgentBuilder.create("overlap_test")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config);

			expect(builder).toBeInstanceOf(AgentBuilder);
		});
	});

	describe("Default values", () => {
		it("should work with minimal config", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			const { agent } = await AgentBuilder.create("minimal_test")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config)
				.build();

			expect(agent).toBeDefined();
		});

		it("should work with zero overlapSize", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 10,
				overlapSize: 0,
			};

			const { agent } = await AgentBuilder.create("zero_overlap_test")
				.withModel("gemini-2.5-flash")
				.withEventsCompaction(config)
				.build();

			expect(agent).toBeDefined();
		});
	});
});
