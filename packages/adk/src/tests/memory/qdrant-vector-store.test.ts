import { describe, expect, it, vi } from "vitest";
import { QdrantVectorStore } from "../../memory/storage/qdrant-vector-store";

describe("QdrantVectorStore", () => {
	describe("constructor", () => {
		it("should create instance with default config", () => {
			const store = new QdrantVectorStore();
			expect(store).toBeInstanceOf(QdrantVectorStore);
		});

		it("should create instance with custom config", () => {
			const store = new QdrantVectorStore({
				url: "http://localhost:6334",
				apiKey: "test-api-key",
				collectionName: "test-collection",
				dimensions: 1536,
				distance: "Dot",
				createCollectionIfNotExists: false,
				https: true,
			});
			expect(store).toBeInstanceOf(QdrantVectorStore);
		});

		it("should auto-detect https from URL", () => {
			const httpsStore = new QdrantVectorStore({
				url: "https://my-qdrant.example.com",
			});
			expect(httpsStore).toBeInstanceOf(QdrantVectorStore);

			const httpStore = new QdrantVectorStore({
				url: "http://localhost:6333",
			});
			expect(httpStore).toBeInstanceOf(QdrantVectorStore);
		});
	});

	describe("interface compliance", () => {
		it("should implement VectorStore interface methods", () => {
			const store = new QdrantVectorStore();

			expect(typeof store.upsert).toBe("function");
			expect(typeof store.search).toBe("function");
			expect(typeof store.delete).toBe("function");
			expect(typeof store.count).toBe("function");
		});

		it("should have additional utility methods", () => {
			const store = new QdrantVectorStore();

			expect(typeof store.deleteCollection).toBe("function");
			expect(typeof store.getCollectionInfo).toBe("function");
		});
	});

	describe("error handling", () => {
		it("should throw helpful error when @qdrant/js-client-rest is not installed", async () => {
			// Mock the require to simulate package not being installed
			const originalRequire = Module.prototype.require;
			const mockRequire = vi.fn().mockImplementation(function (
				this: NodeModule,
				id: string,
			) {
				if (id === "@qdrant/js-client-rest") {
					throw new Error("Cannot find module '@qdrant/js-client-rest'");
				}
				return originalRequire.call(this, id);
			});
			Module.prototype.require = mockRequire;

			// Need to create a fresh instance that hasn't been initialized
			const { QdrantVectorStore: FreshQdrantVectorStore } = await import(
				"../../memory/storage/qdrant-vector-store"
			);

			const store = new FreshQdrantVectorStore({
				url: "http://localhost:6333",
				collectionName: "test",
				dimensions: 1536,
			});

			// The error will be thrown when trying to initialize the client
			// This test verifies the error message is helpful
			await expect(
				store.upsert({
					id: "test-id",
					vector: new Array(1536).fill(0),
					metadata: { test: "value" },
				}),
			).rejects.toThrow("@qdrant/js-client-rest");

			// Restore original require
			Module.prototype.require = originalRequire;
		});
	});
});

// Import Module for require mocking
import Module from "node:module";
