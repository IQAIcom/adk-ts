import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InMemoryVectorStore } from "../../memory/storage/in-memory-vector-store";

describe("InMemoryVectorStore", () => {
	let store: InMemoryVectorStore;

	beforeEach(() => {
		store = new InMemoryVectorStore();
	});

	afterEach(() => {
		store.clear();
	});

	describe("constructor", () => {
		it("should create an empty store", () => {
			expect(store.size).toBe(0);
		});
	});

	describe("upsert", () => {
		it("should insert a new vector", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: { userId: "user-1" },
			});

			expect(store.size).toBe(1);
		});

		it("should update an existing vector", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: { userId: "user-1" },
			});

			await store.upsert({
				id: "vec-1",
				vector: [0, 1, 0],
				metadata: { userId: "user-2" },
			});

			expect(store.size).toBe(1);

			const results = await store.search({
				vector: [0, 1, 0],
				topK: 1,
			});

			expect(results[0].metadata.userId).toBe("user-2");
		});

		it("should handle multiple vectors", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: { type: "a" },
			});
			await store.upsert({
				id: "vec-2",
				vector: [0, 1, 0],
				metadata: { type: "b" },
			});
			await store.upsert({
				id: "vec-3",
				vector: [0, 0, 1],
				metadata: { type: "c" },
			});

			expect(store.size).toBe(3);
		});
	});

	describe("search", () => {
		beforeEach(async () => {
			// Insert test vectors
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: { userId: "user-1", category: "a" },
			});
			await store.upsert({
				id: "vec-2",
				vector: [0.9, 0.1, 0],
				metadata: { userId: "user-1", category: "b" },
			});
			await store.upsert({
				id: "vec-3",
				vector: [0, 1, 0],
				metadata: { userId: "user-2", category: "a" },
			});
			await store.upsert({
				id: "vec-4",
				vector: [0, 0, 1],
				metadata: { userId: "user-2", category: "b" },
			});
		});

		it("should return most similar vectors", async () => {
			const results = await store.search({
				vector: [1, 0, 0],
				topK: 2,
			});

			expect(results).toHaveLength(2);
			expect(results[0].id).toBe("vec-1");
			expect(results[0].score).toBeCloseTo(1.0, 5);
			expect(results[1].id).toBe("vec-2");
		});

		it("should respect topK limit", async () => {
			const results = await store.search({
				vector: [1, 0, 0],
				topK: 1,
			});

			expect(results).toHaveLength(1);
		});

		it("should filter by metadata", async () => {
			const results = await store.search({
				vector: [1, 0, 0],
				topK: 10,
				filter: { userId: "user-2" },
			});

			expect(results).toHaveLength(2);
			expect(results.every((r) => r.metadata.userId === "user-2")).toBe(true);
		});

		it("should filter by multiple metadata fields", async () => {
			const results = await store.search({
				vector: [1, 0, 0],
				topK: 10,
				filter: { userId: "user-1", category: "a" },
			});

			expect(results).toHaveLength(1);
			expect(results[0].id).toBe("vec-1");
		});

		it("should return empty array when no matches", async () => {
			const results = await store.search({
				vector: [1, 0, 0],
				topK: 10,
				filter: { userId: "non-existent" },
			});

			expect(results).toHaveLength(0);
		});

		it("should handle empty store", async () => {
			store.clear();

			const results = await store.search({
				vector: [1, 0, 0],
				topK: 10,
			});

			expect(results).toHaveLength(0);
		});
	});

	describe("delete", () => {
		beforeEach(async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: { userId: "user-1" },
			});
			await store.upsert({
				id: "vec-2",
				vector: [0, 1, 0],
				metadata: { userId: "user-1" },
			});
			await store.upsert({
				id: "vec-3",
				vector: [0, 0, 1],
				metadata: { userId: "user-2" },
			});
		});

		it("should delete by IDs", async () => {
			const deleted = await store.delete({ ids: ["vec-1", "vec-2"] });

			expect(deleted).toBe(2);
			expect(store.size).toBe(1);
		});

		it("should delete by filter", async () => {
			const deleted = await store.delete({ filter: { userId: "user-1" } });

			expect(deleted).toBe(2);
			expect(store.size).toBe(1);
		});

		it("should return 0 when deleting non-existent IDs", async () => {
			const deleted = await store.delete({ ids: ["non-existent"] });

			expect(deleted).toBe(0);
			expect(store.size).toBe(3);
		});

		it("should return 0 when filter matches nothing", async () => {
			const deleted = await store.delete({
				filter: { userId: "non-existent" },
			});

			expect(deleted).toBe(0);
			expect(store.size).toBe(3);
		});
	});

	describe("count", () => {
		beforeEach(async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: { userId: "user-1", active: true },
			});
			await store.upsert({
				id: "vec-2",
				vector: [0, 1, 0],
				metadata: { userId: "user-1", active: false },
			});
			await store.upsert({
				id: "vec-3",
				vector: [0, 0, 1],
				metadata: { userId: "user-2", active: true },
			});
		});

		it("should count all vectors without filter", async () => {
			const count = await store.count();
			expect(count).toBe(3);
		});

		it("should count vectors matching filter", async () => {
			const count = await store.count({ userId: "user-1" });
			expect(count).toBe(2);
		});

		it("should count with boolean filter", async () => {
			const count = await store.count({ active: true });
			expect(count).toBe(2);
		});

		it("should return 0 when filter matches nothing", async () => {
			const count = await store.count({ userId: "non-existent" });
			expect(count).toBe(0);
		});
	});

	describe("clear", () => {
		it("should remove all vectors", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: {},
			});
			await store.upsert({
				id: "vec-2",
				vector: [0, 1, 0],
				metadata: {},
			});

			store.clear();

			expect(store.size).toBe(0);
		});
	});

	describe("cosine similarity", () => {
		it("should return 1 for identical vectors", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 2, 3],
				metadata: {},
			});

			const results = await store.search({
				vector: [1, 2, 3],
				topK: 1,
			});

			expect(results[0].score).toBeCloseTo(1.0, 5);
		});

		it("should return 0 for orthogonal vectors", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: {},
			});

			const results = await store.search({
				vector: [0, 1, 0],
				topK: 1,
			});

			expect(results[0].score).toBeCloseTo(0, 5);
		});

		it("should return -1 for opposite vectors", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: {},
			});

			const results = await store.search({
				vector: [-1, 0, 0],
				topK: 1,
			});

			expect(results[0].score).toBeCloseTo(-1, 5);
		});

		it("should handle zero vectors gracefully", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [0, 0, 0],
				metadata: {},
			});

			const results = await store.search({
				vector: [1, 0, 0],
				topK: 1,
			});

			expect(results[0].score).toBe(0);
		});

		it("should handle vectors of different lengths", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0],
				metadata: {},
			});

			const results = await store.search({
				vector: [1, 0, 0],
				topK: 1,
			});

			// Should return 0 for mismatched dimensions
			expect(results[0].score).toBe(0);
		});
	});
});
