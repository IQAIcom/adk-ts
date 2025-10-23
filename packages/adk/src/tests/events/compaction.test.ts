import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCompactionForSlidingWindow } from "../../events/compaction.js";
import type { EventsCompactionConfig } from "../../events/compaction-config.js";
import { Event } from "../../events/event.js";
import { EventActions } from "../../events/event-actions.js";
import type { EventsSummarizer } from "../../events/events-summarizer.js";
import { InMemorySessionService } from "../../sessions/in-memory-session-service.js";
import type { Session } from "../../sessions/session.js";

describe("Event Compaction", () => {
	let sessionService: InMemorySessionService;
	let mockSummarizer: EventsSummarizer;
	let session: Session;

	const refreshSession = async (s: Session): Promise<Session> => {
		const refreshed = await sessionService.getSession(
			s.appName,
			s.userId,
			s.id,
		);
		return refreshed!;
	};

	beforeEach(async () => {
		sessionService = new InMemorySessionService();
		session = await sessionService.createSession("test-app", "test-user");

		mockSummarizer = {
			maybeSummarizeEvents: vi.fn().mockResolvedValue(
				new Event({
					invocationId: "compaction-inv",
					author: "user",
					actions: new EventActions({
						compaction: {
							startTimestamp: 1000,
							endTimestamp: 2000,
							compactedContent: {
								role: "model",
								parts: [{ text: "Summary of events" }],
							},
						},
					}),
				}),
			),
		};
	});

	describe("runCompactionForSlidingWindow", () => {
		it("should not compact when there are no events", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).not.toHaveBeenCalled();
		});

		it("should not compact when there are fewer events than compactionInterval", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			for (let i = 0; i < 3; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp: 1000 + i * 100,
				});
				await sessionService.appendEvent(session, event);
			}

			session = await refreshSession(session);

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).not.toHaveBeenCalled();
		});

		it("should compact when enough new invocations have accumulated", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			for (let i = 0; i < 6; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp: 1000 + i * 100,
				});
				await sessionService.appendEvent(session, event);
			}

			session = await refreshSession(session);

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).toHaveBeenCalledTimes(1);

			const calledWithEvents = (mockSummarizer.maybeSummarizeEvents as any).mock
				.calls[0][0] as Event[];
			expect(calledWithEvents.length).toBeGreaterThan(0);
		});

		it("should include overlap events in compaction", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 3,
				overlapSize: 2,
			};

			for (let i = 0; i < 5; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp: 1000 + i * 100,
				});
				await sessionService.appendEvent(session, event);
			}

			session = await refreshSession(session);

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).toHaveBeenCalled();

			const calledWithEvents = (mockSummarizer.maybeSummarizeEvents as any).mock
				.calls[0][0] as Event[];
			expect(calledWithEvents.length).toBeGreaterThanOrEqual(3);
		});

		it("should not compact already compacted events again", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 3,
				overlapSize: 1,
			};

			for (let i = 0; i < 4; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp: 1000 + i * 100,
				});
				await sessionService.appendEvent(session, event);
			}

			const compactionEvent = new Event({
				invocationId: "compaction-inv",
				author: "user",
				actions: new EventActions({
					compaction: {
						startTimestamp: 1000,
						endTimestamp: 1300,
						compactedContent: {
							role: "model",
							parts: [{ text: "Previous summary" }],
						},
					},
				}),
				timestamp: 1400,
			});
			await sessionService.appendEvent(session, compactionEvent);

			for (let i = 4; i < 7; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp: 1500 + i * 100,
				});
				await sessionService.appendEvent(session, event);
			}

			session = await refreshSession(session);

			vi.clearAllMocks();

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).toHaveBeenCalled();

			const calledWithEvents = (mockSummarizer.maybeSummarizeEvents as any).mock
				.calls[0][0] as Event[];

			const hasCompactionEvent = calledWithEvents.some(
				(e) => e.actions?.compaction,
			);
			expect(hasCompactionEvent).toBe(false);
		});

		it("should append compaction event to session", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 3,
				overlapSize: 1,
			};

			for (let i = 0; i < 4; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp: 1000 + i * 100,
				});
				await sessionService.appendEvent(session, event);
			}

			session = await refreshSession(session);

			const initialEventCount = session.events?.length || 0;

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			session = await refreshSession(session);

			const finalEventCount = session.events?.length || 0;
			expect(finalEventCount).toBe(initialEventCount + 1);

			const lastEvent = session.events?.[session.events.length - 1];
			expect(lastEvent?.actions?.compaction).toBeDefined();
		});

		it("should handle empty events array gracefully", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 5,
				overlapSize: 2,
			};

			const emptySession = await sessionService.createSession(
				"test-app-2",
				"test-user-2",
			);

			await runCompactionForSlidingWindow(
				config,
				emptySession,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).not.toHaveBeenCalled();
		});

		it("should respect compactionInterval setting", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 10,
				overlapSize: 2,
			};

			for (let i = 0; i < 9; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp: 1000 + i * 100,
				});
				await sessionService.appendEvent(session, event);
			}

			session = await refreshSession(session);

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).not.toHaveBeenCalled();

			const oneMoreEvent = new Event({
				invocationId: "inv-9",
				author: "agent",
				content: { parts: [{ text: "Message 9" }] },
				timestamp: 1900,
			});
			await sessionService.appendEvent(session, oneMoreEvent);

			session = await refreshSession(session);

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).toHaveBeenCalledTimes(1);
		});

		it("should not fail when summarizer returns undefined", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 3,
				overlapSize: 1,
			};

			const noOpSummarizer: EventsSummarizer = {
				maybeSummarizeEvents: vi.fn().mockResolvedValue(undefined),
			};

			for (let i = 0; i < 4; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp: 1000 + i * 100,
				});
				await sessionService.appendEvent(session, event);
			}

			session = await refreshSession(session);

			const initialEventCount = session.events?.length || 0;

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				noOpSummarizer,
			);

			session = await refreshSession(session);

			const finalEventCount = session.events?.length || 0;
			expect(finalEventCount).toBe(initialEventCount);
		});

		it("should handle multiple invocations with same timestamp", async () => {
			const config: EventsCompactionConfig = {
				compactionInterval: 3,
				overlapSize: 1,
			};

			const timestamp = 1000;
			for (let i = 0; i < 4; i++) {
				const event = new Event({
					invocationId: `inv-${i}`,
					author: "agent",
					content: { parts: [{ text: `Message ${i}` }] },
					timestamp,
				});
				await sessionService.appendEvent(session, event);
			}

			session = await refreshSession(session);

			await runCompactionForSlidingWindow(
				config,
				session,
				sessionService,
				mockSummarizer,
			);

			expect(mockSummarizer.maybeSummarizeEvents).toHaveBeenCalled();
		});
	});
});
