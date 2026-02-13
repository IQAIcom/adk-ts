import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryBuilder } from "../../unified-memory";
import { InMemorySessionService } from "../../sessions/in-memory-session-service";
import { MemoryService } from "../../memory/memory-service";
import { InMemoryStorageProvider } from "../../memory/storage/in-memory-storage-provider";
import { Event } from "../../events/event";

describe("MemoryBuilder", () => {
	let builder: MemoryBuilder;

	beforeEach(() => {
		builder = MemoryBuilder.create({
			appName: "test-app",
			userId: "user-123",
		});
	});

	describe("Session Management", () => {
		it("should create a session", async () => {
			const session = await builder.createSession();

			expect(session.id).toBeDefined();
			expect(session.appName).toBe("test-app");
			expect(session.userId).toBe("user-123");
			expect(session.events).toEqual([]);
		});

		it("should create a session with custom ID", async () => {
			const session = await builder.createSession(undefined, "my-session");

			expect(session.id).toBe("my-session");
		});

		it("should create a session with initial state", async () => {
			const session = await builder.createSession({ counter: 0 });

			expect(session.state.counter).toBe(0);
		});

		it("should get a session by ID", async () => {
			const created = await builder.createSession(undefined, "session-1");
			const retrieved = await builder.getSession("session-1");

			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe(created.id);
		});

		it("should return undefined for non-existent session", async () => {
			const session = await builder.getSession("non-existent");
			expect(session).toBeUndefined();
		});

		it("should list sessions", async () => {
			await builder.createSession(undefined, "s1");
			await builder.createSession(undefined, "s2");

			const result = await builder.listSessions();
			expect(result.sessions).toHaveLength(2);
		});

		it("should delete a session", async () => {
			await builder.createSession(undefined, "to-delete");
			await builder.deleteSession("to-delete");

			const session = await builder.getSession("to-delete");
			expect(session).toBeUndefined();
		});
	});

	describe("Message Management (SimpleMessage)", () => {
		it("should add a simple user message", async () => {
			const session = await builder.createSession(undefined, "session-1");

			const event = await builder.addMessage(session, {
				role: "user",
				content: "Hello there!",
			});

			expect(event).toBeDefined();
			expect(event.author).toBe("user");
			expect(session.events).toHaveLength(1);
		});

		it("should add an assistant message", async () => {
			const session = await builder.createSession(undefined, "session-1");

			await builder.addMessage(session, {
				role: "assistant",
				content: "Hi! How can I help?",
			});

			expect(session.events).toHaveLength(1);
			expect(session.events[0].author).toBe("model");
		});

		it("should add a system message", async () => {
			const session = await builder.createSession(undefined, "session-1");

			await builder.addMessage(session, {
				role: "system",
				content: "You are a helpful assistant.",
			});

			expect(session.events).toHaveLength(1);
			expect(session.events[0].author).toBe("system");
		});
	});

	describe("Raw Event Management", () => {
		it("should add a raw Event object", async () => {
			const session = await builder.createSession(undefined, "session-1");

			const event = new Event({
				author: "user",
				content: { role: "user", parts: [{ text: "Hello" }] },
			});

			const appended = await builder.addEvent(session, event);
			expect(appended).toBeDefined();
			expect(session.events).toHaveLength(1);
		});
	});

	describe("Recall", () => {
		it("should recall messages as SimpleMessage format", async () => {
			const session = await builder.createSession(undefined, "session-1");

			await builder.addMessage(session, {
				role: "user",
				content: "Hello",
			});
			await builder.addMessage(session, {
				role: "assistant",
				content: "Hi there!",
			});

			const messages = await builder.recall("session-1");

			expect(messages).toHaveLength(2);
			expect(messages[0]).toEqual({ role: "user", content: "Hello" });
			expect(messages[1]).toEqual({ role: "assistant", content: "Hi there!" });
		});

		it("should recall raw events via recallEvents", async () => {
			const session = await builder.createSession(undefined, "session-1");

			await builder.addMessage(session, {
				role: "user",
				content: "Hello",
			});

			const events = await builder.recallEvents("session-1");

			expect(events).toHaveLength(1);
			expect(events[0].author).toBe("user");
			expect(events[0].content).toBeDefined();
		});

		it("should respect lastMessages limit", async () => {
			const limitedBuilder = MemoryBuilder.create({
				appName: "test-app",
				userId: "user-123",
				lastMessages: 2,
			});

			const session = await limitedBuilder.createSession(
				undefined,
				"session-1",
			);

			for (let i = 0; i < 5; i++) {
				await limitedBuilder.addMessage(session, {
					role: "user",
					content: `Message ${i}`,
				});
			}

			const messages = await limitedBuilder.recall("session-1");
			expect(messages).toHaveLength(2);
		});

		it("should throw when recalling non-existent session", async () => {
			await expect(builder.recall("non-existent")).rejects.toThrow(
				"Session not found",
			);
		});

		it("should return all messages when lastMessages is false", async () => {
			const unlimitedBuilder = MemoryBuilder.create({
				appName: "test-app",
				userId: "user-123",
				lastMessages: false,
			});

			const session = await unlimitedBuilder.createSession(
				undefined,
				"session-1",
			);

			for (let i = 0; i < 5; i++) {
				await unlimitedBuilder.addMessage(session, {
					role: "user",
					content: `Message ${i}`,
				});
			}

			const messages = await unlimitedBuilder.recall("session-1");
			expect(messages).toHaveLength(5);
		});
	});

	describe("Working Memory", () => {
		it("should initialize working memory from template on session create", async () => {
			const wmBuilder = MemoryBuilder.create({
				appName: "test-app",
				userId: "user-123",
				workingMemory: {
					enabled: true,
					template: "# User Info\n- Name: Unknown",
				},
			});

			const session = await wmBuilder.createSession(undefined, "session-1");

			expect(session.state.__working_memory__).toBe(
				"# User Info\n- Name: Unknown",
			);
		});

		it("should get working memory from session state", async () => {
			const wmBuilder = MemoryBuilder.create({
				appName: "test-app",
				userId: "user-123",
				workingMemory: {
					enabled: true,
					template: "# User Info\n- Name: Unknown",
				},
			});

			await wmBuilder.createSession(undefined, "session-1");

			const wm = await wmBuilder.getWorkingMemory("session-1");
			expect(wm).toBe("# User Info\n- Name: Unknown");
		});

		it("should update working memory via session state", async () => {
			const wmBuilder = MemoryBuilder.create({
				appName: "test-app",
				userId: "user-123",
				workingMemory: { enabled: true },
			});

			const session = await wmBuilder.createSession(undefined, "session-1");

			await wmBuilder.updateWorkingMemory(
				session,
				"# User Info\n- Name: Alice",
			);

			const wm = await wmBuilder.getWorkingMemory("session-1");
			expect(wm).toBe("# User Info\n- Name: Alice");
		});

		it("should return null when working memory is not configured", async () => {
			const session = await builder.createSession(undefined, "session-1");

			const wm = await builder.getWorkingMemory("session-1");
			expect(wm).toBeNull();
		});
	});

	describe("Search", () => {
		it("should throw when searching without MemoryService", async () => {
			await expect(builder.search("query")).rejects.toThrow(
				"MemoryService is required for search",
			);
		});

		it("should search using MemoryService when configured", async () => {
			const memoryService = new MemoryService({
				storage: new InMemoryStorageProvider(),
			});

			builder.withMemoryService(memoryService);

			const session = await builder.createSession(undefined, "session-1");

			await builder.addMessage(session, {
				role: "user",
				content: "I like TypeScript",
			});

			const results = await builder.search("TypeScript");
			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
		});
	});

	describe("End Session", () => {
		it("should end a session and return its final state", async () => {
			const session = await builder.createSession({ status: "active" });

			await builder.addMessage(session, {
				role: "user",
				content: "Hello",
			});

			const ended = await builder.endSession(session.id);

			expect(ended).toBeDefined();
			expect(ended?.events).toHaveLength(1);
		});

		it("should add to memory on end if MemoryService is configured", async () => {
			const memoryService = new MemoryService({
				storage: new InMemoryStorageProvider(),
			});

			const addSpy = vi.spyOn(memoryService, "addSessionToMemory");

			builder.withMemoryService(memoryService);

			const session = await builder.createSession(undefined, "session-1");

			await builder.addMessage(session, {
				role: "user",
				content: "Hello",
			});

			await builder.endSession("session-1");

			expect(addSpy).toHaveBeenCalled();
		});
	});

	describe("Builder Pattern", () => {
		it("should use InMemorySessionService by default", () => {
			const service = builder.getSessionService();
			expect(service).toBeInstanceOf(InMemorySessionService);
		});

		it("should allow swapping session service", async () => {
			const customService = new InMemorySessionService();
			builder.withSessionService(customService);

			expect(builder.getSessionService()).toBe(customService);

			const session = await builder.createSession(undefined, "test");
			expect(session.appName).toBe("test-app");
		});

		it("should support method chaining", () => {
			const customSession = new InMemorySessionService();
			const customMemory = new MemoryService({
				storage: new InMemoryStorageProvider(),
			});

			const result = builder
				.withSessionService(customSession)
				.withMemoryService(customMemory)
				.withAppName("new-app")
				.withUserId("new-user");

			expect(result).toBe(builder);
		});

		it("should return undefined for memoryService when not configured", () => {
			expect(builder.getMemoryService()).toBeUndefined();
		});

		it("should return memoryService when configured", () => {
			const memoryService = new MemoryService({
				storage: new InMemoryStorageProvider(),
			});

			builder.withMemoryService(memoryService);

			expect(builder.getMemoryService()).toBe(memoryService);
		});
	});

	describe("Delegation", () => {
		it("should delegate to the underlying session service", async () => {
			const customService = new InMemorySessionService();
			const createSpy = vi.spyOn(customService, "createSession");

			builder.withSessionService(customService);
			await builder.createSession({ key: "value" }, "custom-id");

			expect(createSpy).toHaveBeenCalledWith(
				"test-app",
				"user-123",
				{ key: "value" },
				"custom-id",
			);
		});

		it("should delegate addMessage to session service appendEvent", async () => {
			const customService = new InMemorySessionService();
			const appendSpy = vi.spyOn(customService, "appendEvent");

			builder.withSessionService(customService);
			const session = await builder.createSession(undefined, "session-1");

			await builder.addMessage(session, {
				role: "user",
				content: "Hello",
			});

			expect(appendSpy).toHaveBeenCalled();
			const calledEvent = appendSpy.mock.calls[0][1];
			expect(calledEvent.author).toBe("user");
		});

		it("should trigger memory ingestion on addMessage when memory service exists", async () => {
			const memoryService = new MemoryService({
				storage: new InMemoryStorageProvider(),
			});

			const addSpy = vi.spyOn(memoryService, "addSessionToMemory");

			builder.withMemoryService(memoryService);
			const session = await builder.createSession(undefined, "session-1");

			await builder.addMessage(session, {
				role: "user",
				content: "Hello",
			});

			expect(addSpy).toHaveBeenCalledWith(session);
		});
	});
});
