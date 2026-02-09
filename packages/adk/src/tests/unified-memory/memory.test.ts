import { describe, expect, it, beforeEach } from "vitest";
import { Memory, createMemory, InMemoryStore } from "../../unified-memory";

describe("Unified Memory", () => {
	describe("Memory", () => {
		let memory: Memory;

		beforeEach(() => {
			memory = createMemory();
		});

		describe("Thread Management", () => {
			it("should create a thread", async () => {
				const thread = await memory.createThread({
					resourceId: "user-123",
					title: "Test Thread",
				});

				expect(thread.id).toBeDefined();
				expect(thread.resourceId).toBe("user-123");
				expect(thread.title).toBe("Test Thread");
				expect(thread.createdAt).toBeInstanceOf(Date);
			});

			it("should create a thread with custom ID", async () => {
				const thread = await memory.createThread({
					resourceId: "user-123",
					threadId: "custom-thread-id",
				});

				expect(thread.id).toBe("custom-thread-id");
			});

			it("should get a thread by ID", async () => {
				const created = await memory.createThread({
					resourceId: "user-123",
					threadId: "thread-1",
				});

				const retrieved = await memory.getThread("thread-1");
				expect(retrieved).not.toBeNull();
				expect(retrieved?.id).toBe(created.id);
			});

			it("should return null for non-existent thread", async () => {
				const thread = await memory.getThread("non-existent");
				expect(thread).toBeNull();
			});

			it("should list threads for a resource", async () => {
				await memory.createThread({ resourceId: "user-1" });
				await memory.createThread({ resourceId: "user-1" });
				await memory.createThread({ resourceId: "user-2" });

				const result = await memory.listThreads({ resourceId: "user-1" });
				expect(result.threads).toHaveLength(2);
				expect(result.total).toBe(2);
			});

			it("should update a thread", async () => {
				await memory.createThread({
					resourceId: "user-123",
					threadId: "thread-1",
					title: "Original Title",
				});

				const updated = await memory.updateThread("thread-1", {
					title: "Updated Title",
				});

				expect(updated?.title).toBe("Updated Title");
			});

			it("should delete a thread", async () => {
				await memory.createThread({
					resourceId: "user-123",
					threadId: "thread-to-delete",
				});

				await memory.deleteThread("thread-to-delete");

				const thread = await memory.getThread("thread-to-delete");
				expect(thread).toBeNull();
			});
		});

		describe("Message Management", () => {
			it("should add messages to a thread", async () => {
				await memory.createThread({
					resourceId: "user-123",
					threadId: "thread-1",
				});

				const messages = await memory.addMessages("thread-1", [
					{ role: "user", content: "Hello", type: "text" },
					{ role: "assistant", content: "Hi there!", type: "text" },
				]);

				expect(messages).toHaveLength(2);
				expect(messages[0].role).toBe("user");
				expect(messages[1].role).toBe("assistant");
			});

			it("should throw when adding messages to non-existent thread", async () => {
				await expect(
					memory.addMessages("non-existent", [
						{ role: "user", content: "Hello", type: "text" },
					]),
				).rejects.toThrow("Thread not found");
			});

			it("should recall messages from a thread", async () => {
				await memory.createThread({
					resourceId: "user-123",
					threadId: "thread-1",
				});

				await memory.addMessages("thread-1", [
					{ role: "user", content: "First message", type: "text" },
					{ role: "assistant", content: "Response", type: "text" },
					{ role: "user", content: "Second message", type: "text" },
				]);

				const result = await memory.recall({ threadId: "thread-1" });

				expect(result.messages).toHaveLength(3);
				expect(result.messages[0].content).toBe("First message");
				expect(result.messages[2].content).toBe("Second message");
			});

			it("should respect lastMessages config in recall", async () => {
				const limitedMemory = createMemory({
					config: { lastMessages: 2 },
				});

				await limitedMemory.createThread({
					resourceId: "user-123",
					threadId: "thread-1",
				});

				await limitedMemory.addMessages("thread-1", [
					{ role: "user", content: "Message 1", type: "text" },
					{ role: "assistant", content: "Message 2", type: "text" },
					{ role: "user", content: "Message 3", type: "text" },
					{ role: "assistant", content: "Message 4", type: "text" },
				]);

				const result = await limitedMemory.recall({ threadId: "thread-1" });

				expect(result.messages).toHaveLength(2);
				expect(result.messages[0].content).toBe("Message 3");
				expect(result.messages[1].content).toBe("Message 4");
			});
		});

		describe("Working Memory", () => {
			it("should get and update working memory", async () => {
				const memoryWithWorkingMemory = createMemory({
					config: {
						workingMemory: {
							enabled: true,
							scope: "thread",
						},
					},
				});

				await memoryWithWorkingMemory.createThread({
					resourceId: "user-123",
					threadId: "thread-1",
				});

				await memoryWithWorkingMemory.updateWorkingMemory({
					threadId: "thread-1",
					content: "User prefers formal communication",
				});

				const workingMemory = await memoryWithWorkingMemory.getWorkingMemory({
					threadId: "thread-1",
				});

				expect(workingMemory).toBe("User prefers formal communication");
			});

			it("should include working memory in recall when enabled", async () => {
				const memoryWithWorkingMemory = createMemory({
					config: {
						workingMemory: {
							enabled: true,
							scope: "thread",
							template: "# User Info\n- Name: Unknown",
						},
					},
				});

				await memoryWithWorkingMemory.createThread({
					resourceId: "user-123",
					threadId: "thread-1",
				});

				const result = await memoryWithWorkingMemory.recall({
					threadId: "thread-1",
				});

				expect(result.workingMemory).toBe("# User Info\n- Name: Unknown");
			});
		});

		describe("Configuration", () => {
			it("should use default config when none provided", () => {
				const config = memory.getConfig();
				expect(config.lastMessages).toBe(40);
				expect(config.semanticRecall).toBe(false);
			});

			it("should merge custom config with defaults", () => {
				const customMemory = createMemory({
					config: { lastMessages: 20 },
				});

				const config = customMemory.getConfig();
				expect(config.lastMessages).toBe(20);
			});

			it("should disable message history when lastMessages is false", async () => {
				const noHistoryMemory = createMemory({
					config: { lastMessages: false },
				});

				await noHistoryMemory.createThread({
					resourceId: "user-123",
					threadId: "thread-1",
				});

				await noHistoryMemory.addMessages("thread-1", [
					{ role: "user", content: "Hello", type: "text" },
				]);

				const result = await noHistoryMemory.recall({ threadId: "thread-1" });
				expect(result.messages).toHaveLength(0);
			});
		});
	});

	describe("InMemoryStore", () => {
		let store: InMemoryStore;

		beforeEach(() => {
			store = new InMemoryStore();
		});

		it("should store and retrieve threads", async () => {
			const thread = {
				id: "thread-1",
				resourceId: "user-1",
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			await store.saveThread(thread);
			const retrieved = await store.getThread("thread-1");

			expect(retrieved).not.toBeNull();
			expect(retrieved?.id).toBe("thread-1");
		});

		it("should list threads with pagination", async () => {
			for (let i = 0; i < 5; i++) {
				await store.saveThread({
					id: `thread-${i}`,
					resourceId: "user-1",
					createdAt: new Date(Date.now() + i * 1000),
					updatedAt: new Date(Date.now() + i * 1000),
				});
			}

			const result = await store.listThreads({ limit: 2, offset: 1 });
			expect(result.threads).toHaveLength(2);
			expect(result.total).toBe(5);
		});

		it("should store and retrieve messages", async () => {
			const messages = [
				{
					id: "msg-1",
					threadId: "thread-1",
					role: "user" as const,
					content: "Hello",
					type: "text" as const,
					createdAt: new Date(),
				},
			];

			await store.saveMessages(messages);
			const retrieved = await store.getMessages({ threadId: "thread-1" });

			expect(retrieved).toHaveLength(1);
			expect(retrieved[0].content).toBe("Hello");
		});

		it("should clear all data", async () => {
			await store.saveThread({
				id: "thread-1",
				resourceId: "user-1",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			store.clear();

			const thread = await store.getThread("thread-1");
			expect(thread).toBeNull();
		});
	});
});
