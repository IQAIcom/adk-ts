import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileVectorStore } from "../../memory/storage/file-vector-store";

describe("FileVectorStore", () => {
	const testBasePath = join(__dirname, ".test-file-vector-store");
	let store: FileVectorStore;

	beforeEach(() => {
		// Clean up test directory
		if (existsSync(testBasePath)) {
			rmSync(testBasePath, { recursive: true });
		}
		mkdirSync(testBasePath, { recursive: true });

		store = new FileVectorStore({
			basePath: testBasePath,
			writeSummaries: true,
			format: "json",
		});
	});

	afterEach(() => {
		// Clean up test directory
		if (existsSync(testBasePath)) {
			rmSync(testBasePath, { recursive: true });
		}
	});

	describe("constructor", () => {
		it("should create necessary directories", () => {
			expect(existsSync(testBasePath)).toBe(true);
			expect(existsSync(join(testBasePath, "summaries"))).toBe(true);
		});

		it("should create store with default settings", () => {
			const defaultStore = new FileVectorStore({
				basePath: join(testBasePath, "default"),
			});
			expect(defaultStore).toBeInstanceOf(FileVectorStore);
		});

		it("should create store without summaries", () => {
			const noSummaryPath = join(testBasePath, "no-summaries");
			const noSummaryStore = new FileVectorStore({
				basePath: noSummaryPath,
				writeSummaries: false,
			});
			expect(noSummaryStore).toBeInstanceOf(FileVectorStore);
			expect(existsSync(join(noSummaryPath, "summaries"))).toBe(false);
		});

		it("should create store with binary format", () => {
			const binaryStore = new FileVectorStore({
				basePath: join(testBasePath, "binary"),
				format: "binary",
			});
			expect(binaryStore).toBeInstanceOf(FileVectorStore);
		});
	});

	describe("upsert", () => {
		it("should insert a new vector", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: { userId: "user-1" },
			});

			const count = await store.count();
			expect(count).toBe(1);
		});

		it("should persist vectors to disk", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: { userId: "user-1" },
			});

			// Create new store instance to load from disk
			const newStore = new FileVectorStore({
				basePath: testBasePath,
			});

			const count = await newStore.count();
			expect(count).toBe(1);
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

			const count = await store.count();
			expect(count).toBe(1);

			const results = await store.search({
				vector: [0, 1, 0],
				topK: 1,
			});

			expect(results[0].metadata.userId).toBe("user-2");
		});

		it("should write summary file when content is provided", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: {
					userId: "user-1",
					timestamp: "2024-01-15T10:00:00Z",
					content: JSON.stringify({
						summary: "Test summary",
						keyFacts: ["Fact 1", "Fact 2"],
					}),
				},
			});

			const summariesPath = store.getSummariesPath();
			const files = readdirSync(summariesPath);
			expect(files.length).toBe(1);
			expect(files[0]).toContain("vec-1");
		});
	});

	describe("search", () => {
		beforeEach(async () => {
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
		});

		it("should return most similar vectors", async () => {
			const results = await store.search({
				vector: [1, 0, 0],
				topK: 2,
			});

			expect(results).toHaveLength(2);
			expect(results[0].id).toBe("vec-1");
			expect(results[0].score).toBeCloseTo(1.0, 5);
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

			expect(results).toHaveLength(1);
			expect(results[0].metadata.userId).toBe("user-2");
		});

		it("should work after reloading from disk", async () => {
			// Create new store instance
			const newStore = new FileVectorStore({
				basePath: testBasePath,
			});

			const results = await newStore.search({
				vector: [1, 0, 0],
				topK: 2,
			});

			expect(results).toHaveLength(2);
			expect(results[0].id).toBe("vec-1");
		});
	});

	describe("delete", () => {
		beforeEach(async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: {
					userId: "user-1",
					timestamp: "2024-01-15T10:00:00Z",
					content: JSON.stringify({ summary: "Test 1" }),
				},
			});
			await store.upsert({
				id: "vec-2",
				vector: [0, 1, 0],
				metadata: {
					userId: "user-1",
					timestamp: "2024-01-15T10:00:00Z",
					content: JSON.stringify({ summary: "Test 2" }),
				},
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
			expect(await store.count()).toBe(1);
		});

		it("should delete by filter", async () => {
			const deleted = await store.delete({ filter: { userId: "user-1" } });

			expect(deleted).toBe(2);
			expect(await store.count()).toBe(1);
		});

		it("should persist deletions to disk", async () => {
			await store.delete({ ids: ["vec-1"] });

			// Create new store instance
			const newStore = new FileVectorStore({
				basePath: testBasePath,
			});

			const count = await newStore.count();
			expect(count).toBe(2);
		});

		it("should delete summary files", async () => {
			const summariesPath = store.getSummariesPath();
			const filesBefore = readdirSync(summariesPath);
			expect(filesBefore.length).toBe(2);

			await store.delete({ ids: ["vec-1"] });

			const filesAfter = readdirSync(summariesPath);
			expect(filesAfter.length).toBe(1);
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
				metadata: {
					timestamp: "2024-01-15T10:00:00Z",
					content: JSON.stringify({ summary: "Test" }),
				},
			});
			await store.upsert({
				id: "vec-2",
				vector: [0, 1, 0],
				metadata: {},
			});

			store.clear();

			expect(await store.count()).toBe(0);
		});

		it("should remove all summary files", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: {
					timestamp: "2024-01-15T10:00:00Z",
					content: JSON.stringify({ summary: "Test" }),
				},
			});

			store.clear();

			const summariesPath = store.getSummariesPath();
			const files = readdirSync(summariesPath);
			expect(files.length).toBe(0);
		});

		it("should persist clear to disk", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: {},
			});

			store.clear();

			// Create new store instance
			const newStore = new FileVectorStore({
				basePath: testBasePath,
			});

			const count = await newStore.count();
			expect(count).toBe(0);
		});
	});

	describe("binary format", () => {
		let binaryStore: FileVectorStore;
		const binaryPath = join(testBasePath, "binary-test");

		beforeEach(() => {
			binaryStore = new FileVectorStore({
				basePath: binaryPath,
				format: "binary",
				writeSummaries: false,
			});
		});

		it("should store and retrieve vectors in binary format", async () => {
			const originalVector = [0.1, 0.2, 0.3, 0.4, 0.5];

			await binaryStore.upsert({
				id: "vec-1",
				vector: originalVector,
				metadata: { test: true },
			});

			const results = await binaryStore.search({
				vector: originalVector,
				topK: 1,
			});

			expect(results).toHaveLength(1);
			expect(results[0].score).toBeCloseTo(1.0, 4);
		});

		it("should persist binary vectors to disk", async () => {
			await binaryStore.upsert({
				id: "vec-1",
				vector: [1, 2, 3],
				metadata: { test: true },
			});

			// Create new store instance
			const newStore = new FileVectorStore({
				basePath: binaryPath,
				format: "binary",
			});

			const results = await newStore.search({
				vector: [1, 2, 3],
				topK: 1,
			});

			expect(results).toHaveLength(1);
			expect(results[0].score).toBeCloseTo(1.0, 4);
		});
	});

	describe("getSummariesPath", () => {
		it("should return the correct summaries path", () => {
			const summariesPath = store.getSummariesPath();
			expect(summariesPath).toBe(join(testBasePath, "summaries"));
		});
	});

	describe("edge cases", () => {
		it("should handle special characters in IDs", async () => {
			await store.upsert({
				id: "vec/with:special@chars",
				vector: [1, 0, 0],
				metadata: {
					timestamp: "2024-01-15T10:00:00Z",
					content: JSON.stringify({ summary: "Test" }),
				},
			});

			const results = await store.search({
				vector: [1, 0, 0],
				topK: 1,
			});

			expect(results[0].id).toBe("vec/with:special@chars");
		});

		it("should handle empty metadata", async () => {
			await store.upsert({
				id: "vec-1",
				vector: [1, 0, 0],
				metadata: {},
			});

			const results = await store.search({
				vector: [1, 0, 0],
				topK: 1,
			});

			expect(results[0].metadata).toEqual({});
		});

		it("should handle high-dimensional vectors", async () => {
			const highDimVector = new Array(1536).fill(0).map(() => Math.random());

			await store.upsert({
				id: "vec-1",
				vector: highDimVector,
				metadata: {},
			});

			const results = await store.search({
				vector: highDimVector,
				topK: 1,
			});

			expect(results[0].score).toBeCloseTo(1.0, 4);
		});
	});
});
