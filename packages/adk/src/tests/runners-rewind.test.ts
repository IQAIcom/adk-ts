import { beforeEach, describe, expect, it } from "vitest";
import { LlmAgent } from "../agents/llm-agent";
import { InMemoryArtifactService } from "../artifacts/in-memory-artifact-service";
import { Event } from "../events/event";
import { EventActions } from "../events/event-actions";
import { Runner } from "../runners";
import { InMemorySessionService } from "../sessions/in-memory-session-service";

describe("Runner.rewind", () => {
	let runner: Runner;
	const userId = "test_user";
	const sessionId = "test_session";

	beforeEach(() => {
		const rootAgent = new LlmAgent({
			name: "test_agent",
			model: "gemini-2.0-flash-exp",
			description: "",
		});
		const sessionService = new InMemorySessionService();
		const artifactService = new InMemoryArtifactService();
		runner = new Runner({
			appName: "test_app",
			agent: rootAgent,
			sessionService,
			artifactService,
		});
	});

	it("should rewind state and artifacts", async () => {
		const session = await runner.sessionService.createSession(
			runner.appName,
			userId,
			{},
			sessionId,
		);

		await runner.artifactService?.saveArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f1",
			artifact: { text: "f1v0" },
		});

		const event1 = new Event({
			invocationId: "invocation1",
			author: "agent",
			content: { role: "model", parts: [{ text: "event1" }] },
			actions: new EventActions({
				stateDelta: { k1: "v1" },
				artifactDelta: { f1: 0 },
			}),
		});
		await runner.sessionService.appendEvent(session, event1);

		await runner.artifactService?.saveArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f1",
			artifact: { text: "f1v1" },
		});

		await runner.artifactService?.saveArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f2",
			artifact: { text: "f2v0" },
		});

		const event2 = new Event({
			invocationId: "invocation2",
			author: "agent",
			content: { role: "model", parts: [{ text: "event2" }] },
			actions: new EventActions({
				stateDelta: { k1: "v2", k2: "v2" },
				artifactDelta: { f1: 1, f2: 0 },
			}),
		});
		await runner.sessionService.appendEvent(session, event2);

		const event3 = new Event({
			invocationId: "invocation3",
			author: "agent",
			content: { role: "model", parts: [{ text: "event3" }] },
			actions: new EventActions({
				stateDelta: { k2: "v3" },
			}),
		});
		await runner.sessionService.appendEvent(session, event3);

		let updatedSession = await runner.sessionService.getSession(
			runner.appName,
			userId,
			sessionId,
		);
		expect(updatedSession?.state).toEqual({ k1: "v2", k2: "v3" });

		const f1BeforeRewind = await runner.artifactService?.loadArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f1",
		});
		expect(f1BeforeRewind).toEqual({ text: "f1v1" });

		const f2BeforeRewind = await runner.artifactService?.loadArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f2",
		});
		expect(f2BeforeRewind).toEqual({ text: "f2v0" });

		await runner.rewind({
			userId,
			sessionId,
			rewindBeforeInvocationId: "invocation2",
		});

		updatedSession = await runner.sessionService.getSession(
			runner.appName,
			userId,
			sessionId,
		);

		expect(updatedSession?.state.k1).toBe("v1");
		expect(updatedSession?.state.k2).toBeUndefined();

		const f1AfterRewind = await runner.artifactService?.loadArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f1",
		});
		expect(f1AfterRewind).toEqual({ text: "f1v0" });

		const f2AfterRewind = await runner.artifactService?.loadArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f2",
		});
		expect(f2AfterRewind).toBeNull();
	});

	it("should rewind to middle invocation", async () => {
		const session = await runner.sessionService.createSession(
			runner.appName,
			userId,
			{},
			sessionId,
		);

		await runner.artifactService?.saveArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f1",
			artifact: { text: "f1v0" },
		});

		const event1 = new Event({
			invocationId: "invocation1",
			author: "agent",
			content: { role: "model", parts: [{ text: "event1" }] },
			actions: new EventActions({
				stateDelta: { k1: "v1" },
				artifactDelta: { f1: 0 },
			}),
		});
		await runner.sessionService.appendEvent(session, event1);

		await runner.artifactService?.saveArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f1",
			artifact: { text: "f1v1" },
		});

		await runner.artifactService?.saveArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f2",
			artifact: { text: "f2v0" },
		});

		const event2 = new Event({
			invocationId: "invocation2",
			author: "agent",
			content: { role: "model", parts: [{ text: "event2" }] },
			actions: new EventActions({
				stateDelta: { k1: "v2", k2: "v2" },
				artifactDelta: { f1: 1, f2: 0 },
			}),
		});
		await runner.sessionService.appendEvent(session, event2);

		const event3 = new Event({
			invocationId: "invocation3",
			author: "agent",
			content: { role: "model", parts: [{ text: "event3" }] },
			actions: new EventActions({
				stateDelta: { k2: "v3" },
			}),
		});
		await runner.sessionService.appendEvent(session, event3);

		await runner.rewind({
			userId,
			sessionId,
			rewindBeforeInvocationId: "invocation3",
		});

		const updatedSession = await runner.sessionService.getSession(
			runner.appName,
			userId,
			sessionId,
		);

		expect(updatedSession?.state).toEqual({ k1: "v2", k2: "v2" });

		const f1 = await runner.artifactService?.loadArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f1",
		});
		expect(f1).toEqual({ text: "f1v1" });

		const f2 = await runner.artifactService?.loadArtifact({
			appName: runner.appName,
			userId,
			sessionId,
			filename: "f2",
		});
		expect(f2).toEqual({ text: "f2v0" });
	});

	it("should throw error for non-existent invocation", async () => {
		const session = await runner.sessionService.createSession(
			runner.appName,
			userId,
			{},
			sessionId,
		);

		const event1 = new Event({
			invocationId: "invocation1",
			author: "agent",
			content: { role: "model", parts: [{ text: "event1" }] },
		});
		await runner.sessionService.appendEvent(session, event1);

		await expect(
			runner.rewind({
				userId,
				sessionId,
				rewindBeforeInvocationId: "non_existent",
			}),
		).rejects.toThrow("Invocation ID not found: non_existent");
	});

	it("should throw error for non-existent session", async () => {
		await expect(
			runner.rewind({
				userId,
				sessionId: "non_existent_session",
				rewindBeforeInvocationId: "invocation1",
			}),
		).rejects.toThrow("Session not found: non_existent_session");
	});
});
