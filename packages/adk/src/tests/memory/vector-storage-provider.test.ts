import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VectorStore } from "../../memory/storage/vector-storage-provider";
import { VectorStorageProvider } from "../../memory/storage/vector-storage-provider";
import type { MemoryRecord } from "../../memory/types";

function createMockVectorStore(
	overrides: Partial<VectorStore> = {},
): VectorStore {
	return {
		upsert: vi.fn().mockResolvedValue(undefined),
		search: vi.fn().mockResolvedValue([]),
		delete: vi.fn().mockResolvedValue(0),
		...overrides,
	};
}

function createRecord(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
	return {
		id: "mem-1",
		userId: "user-1",
		appName: "app-1",
		sessionId: "session-1",
		timestamp: "2025-01-01T00:00:00Z",
		content: { summary: "test memory" },
		embedding: [1, 0, 0],
		...overrides,
	};
}

describe("VectorStorageProvider", () => {
	describe("delete", () => {
		it("should delete by IDs directly via vector store", async () => {
			const mockStore = createMockVectorStore({
				delete: vi.fn().mockResolvedValue(2),
			});
			const provider = new VectorStorageProvider({
				vectorStore: mockStore,
			});

			const deleted = await provider.delete({ ids: ["id-1", "id-2"] });

			expect(deleted).toBe(2);
			expect(mockStore.delete).toHaveBeenCalledWith({
				ids: ["id-1", "id-2"],
			});
		});

		it("should delegate filter-based delete to vector store even with empty cache", async () => {
			const mockStore = createMockVectorStore({
				delete: vi.fn().mockResolvedValue(5),
			});
			const provider = new VectorStorageProvider({
				vectorStore: mockStore,
			});

			// No records stored — cache is empty (simulates process restart)
			const deleted = await provider.delete({ userId: "user-1" });

			expect(deleted).toBe(5);
			expect(mockStore.delete).toHaveBeenCalledWith({
				filter: { userId: "user-1" },
			});
		});

		it("should pass all filter fields to vector store", async () => {
			const mockStore = createMockVectorStore({
				delete: vi.fn().mockResolvedValue(1),
			});
			const provider = new VectorStorageProvider({
				vectorStore: mockStore,
				namespace: "ns-1",
			});

			await provider.delete({
				userId: "user-1",
				appName: "app-1",
				sessionId: "session-1",
				before: "2025-06-01T00:00:00Z",
				after: "2025-01-01T00:00:00Z",
			});

			expect(mockStore.delete).toHaveBeenCalledWith({
				filter: {
					userId: "user-1",
					appName: "app-1",
					sessionId: "session-1",
					before: "2025-06-01T00:00:00Z",
					after: "2025-01-01T00:00:00Z",
					namespace: "ns-1",
				},
			});
		});

		it("should also clean matching entries from cache", async () => {
			const mockStore = createMockVectorStore({
				delete: vi.fn().mockResolvedValue(1),
			});
			const provider = new VectorStorageProvider({
				vectorStore: mockStore,
			});

			// Store a record to populate cache
			await provider.store(createRecord({ id: "mem-1", userId: "user-1" }));
			await provider.store(createRecord({ id: "mem-2", userId: "user-2" }));

			// Delete by userId filter
			await provider.delete({ userId: "user-1" });

			// mem-1 should be removed from cache, mem-2 should remain
			// Verify via count (falls back to cache since no vectorStore.count)
			const countUser1 = await provider.count({ userId: "user-1" });
			const countUser2 = await provider.count({ userId: "user-2" });

			expect(countUser1).toBe(0);
			expect(countUser2).toBe(1);
		});
	});

	describe("count", () => {
		it("should delegate to vector store count when available", async () => {
			const mockCount = vi.fn().mockResolvedValue(42);
			const mockStore = createMockVectorStore({ count: mockCount });
			const provider = new VectorStorageProvider({
				vectorStore: mockStore,
			});

			const count = await provider.count({ userId: "user-1" });

			expect(count).toBe(42);
			expect(mockCount).toHaveBeenCalledWith({ userId: "user-1" });
		});

		it("should fall back to cache when vector store has no count", async () => {
			const mockStore = createMockVectorStore();
			// count is not defined by default in createMockVectorStore
			delete (mockStore as unknown as Record<string, unknown>).count;

			const provider = new VectorStorageProvider({
				vectorStore: mockStore,
			});

			await provider.store(createRecord({ id: "mem-1", userId: "user-1" }));
			await provider.store(createRecord({ id: "mem-2", userId: "user-1" }));
			await provider.store(createRecord({ id: "mem-3", userId: "user-2" }));

			const count = await provider.count({ userId: "user-1" });
			expect(count).toBe(2);
		});
	});
});
