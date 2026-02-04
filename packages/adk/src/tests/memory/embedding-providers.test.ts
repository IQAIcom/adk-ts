import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAIEmbeddingProvider } from "../../memory/embeddings/openai-embedding-provider";
import { OpenRouterEmbeddingProvider } from "../../memory/embeddings/openrouter-embedding-provider";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("OpenAIEmbeddingProvider", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("constructor", () => {
		it("should throw error when no API key provided", () => {
			delete process.env.OPENAI_API_KEY;

			expect(() => new OpenAIEmbeddingProvider()).toThrow(
				"OpenAI API key not provided",
			);
		});

		it("should use API key from config", () => {
			delete process.env.OPENAI_API_KEY;

			const provider = new OpenAIEmbeddingProvider({
				apiKey: "test-key",
			});

			expect(provider.dimensions).toBe(1536);
		});

		it("should use API key from environment", () => {
			process.env.OPENAI_API_KEY = "env-key";

			const provider = new OpenAIEmbeddingProvider();

			expect(provider.dimensions).toBe(1536);
		});

		it("should use default model (text-embedding-3-small)", () => {
			const provider = new OpenAIEmbeddingProvider({
				apiKey: "test-key",
			});

			expect(provider.dimensions).toBe(1536);
		});

		it("should set correct dimensions for text-embedding-3-large", () => {
			const provider = new OpenAIEmbeddingProvider({
				apiKey: "test-key",
				model: "text-embedding-3-large",
			});

			expect(provider.dimensions).toBe(3072);
		});

		it("should set correct dimensions for text-embedding-ada-002", () => {
			const provider = new OpenAIEmbeddingProvider({
				apiKey: "test-key",
				model: "text-embedding-ada-002",
			});

			expect(provider.dimensions).toBe(1536);
		});
	});

	describe("embed", () => {
		it("should call OpenAI API and return embedding", async () => {
			const mockEmbedding = [0.1, 0.2, 0.3];
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: [{ embedding: mockEmbedding }],
				}),
			});

			const provider = new OpenAIEmbeddingProvider({
				apiKey: "test-key",
			});

			const result = await provider.embed("test text");

			expect(result).toEqual(mockEmbedding);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.openai.com/v1/embeddings",
				expect.objectContaining({
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer test-key",
					},
				}),
			);
		});

		it("should throw error on API failure", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: async () => "Unauthorized",
			});

			const provider = new OpenAIEmbeddingProvider({
				apiKey: "invalid-key",
			});

			await expect(provider.embed("test")).rejects.toThrow(
				"OpenAI embedding error: 401",
			);
		});

		it("should use custom baseUrl", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: [{ embedding: [0.1] }],
				}),
			});

			const provider = new OpenAIEmbeddingProvider({
				apiKey: "test-key",
				baseUrl: "https://custom.api.com/v1",
			});

			await provider.embed("test");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://custom.api.com/v1/embeddings",
				expect.any(Object),
			);
		});
	});

	describe("embedBatch", () => {
		it("should return empty array for empty input", async () => {
			const provider = new OpenAIEmbeddingProvider({
				apiKey: "test-key",
			});

			const result = await provider.embedBatch([]);

			expect(result).toEqual([]);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should batch embed multiple texts", async () => {
			const mockEmbeddings = [
				{ index: 1, embedding: [0.4, 0.5, 0.6] },
				{ index: 0, embedding: [0.1, 0.2, 0.3] },
			];
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockEmbeddings }),
			});

			const provider = new OpenAIEmbeddingProvider({
				apiKey: "test-key",
			});

			const result = await provider.embedBatch(["text1", "text2"]);

			// Should be sorted by index
			expect(result).toEqual([
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
			]);
		});
	});
});

describe("OpenRouterEmbeddingProvider", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("constructor", () => {
		it("should throw error when no API key provided", () => {
			delete process.env.OPENROUTER_API_KEY;

			expect(() => new OpenRouterEmbeddingProvider()).toThrow(
				"OpenRouter API key not provided",
			);
		});

		it("should use API key from config", () => {
			delete process.env.OPENROUTER_API_KEY;

			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
			});

			expect(provider.dimensions).toBe(1536);
		});

		it("should use API key from environment", () => {
			process.env.OPENROUTER_API_KEY = "env-key";

			const provider = new OpenRouterEmbeddingProvider();

			expect(provider.dimensions).toBe(1536);
		});

		it("should use default model (openai/text-embedding-3-small)", () => {
			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
			});

			expect(provider.dimensions).toBe(1536);
		});

		it("should set correct dimensions for openai/text-embedding-3-large", () => {
			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
				model: "openai/text-embedding-3-large",
			});

			expect(provider.dimensions).toBe(3072);
		});

		it("should set correct dimensions for cohere models", () => {
			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
				model: "cohere/embed-english-v3.0",
			});

			expect(provider.dimensions).toBe(1024);
		});

		it("should allow custom dimensions override", () => {
			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
				model: "custom/model",
				dimensions: 768,
			});

			expect(provider.dimensions).toBe(768);
		});

		it("should fall back to 1536 for unknown models", () => {
			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
				model: "unknown/model",
			});

			expect(provider.dimensions).toBe(1536);
		});
	});

	describe("embed", () => {
		it("should call OpenRouter API and return embedding", async () => {
			const mockEmbedding = [0.1, 0.2, 0.3];
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: [{ embedding: mockEmbedding }],
				}),
			});

			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
			});

			const result = await provider.embed("test text");

			expect(result).toEqual(mockEmbedding);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://openrouter.ai/api/v1/embeddings",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						Authorization: "Bearer test-key",
					}),
				}),
			);
		});

		it("should include site headers when provided", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: [{ embedding: [0.1] }],
				}),
			});

			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
				siteUrl: "https://myapp.com",
				siteName: "My App",
			});

			await provider.embed("test");

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"HTTP-Referer": "https://myapp.com",
						"X-Title": "My App",
					}),
				}),
			);
		});

		it("should throw error on API failure", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				text: async () => "Invalid API key",
			});

			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "invalid-key",
			});

			await expect(provider.embed("test")).rejects.toThrow(
				"OpenRouter embedding error: 401",
			);
		});

		it("should use custom baseUrl", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: [{ embedding: [0.1] }],
				}),
			});

			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
				baseUrl: "https://custom.openrouter.com/v1",
			});

			await provider.embed("test");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://custom.openrouter.com/v1/embeddings",
				expect.any(Object),
			);
		});
	});

	describe("embedBatch", () => {
		it("should return empty array for empty input", async () => {
			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
			});

			const result = await provider.embedBatch([]);

			expect(result).toEqual([]);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should batch embed multiple texts", async () => {
			const mockEmbeddings = [
				{ index: 1, embedding: [0.4, 0.5, 0.6] },
				{ index: 0, embedding: [0.1, 0.2, 0.3] },
			];
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockEmbeddings }),
			});

			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
			});

			const result = await provider.embedBatch(["text1", "text2"]);

			// Should be sorted by index
			expect(result).toEqual([
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
			]);
		});

		it("should include site headers in batch requests", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: [{ index: 0, embedding: [0.1] }],
				}),
			});

			const provider = new OpenRouterEmbeddingProvider({
				apiKey: "test-key",
				siteUrl: "https://myapp.com",
				siteName: "My App",
			});

			await provider.embedBatch(["test"]);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"HTTP-Referer": "https://myapp.com",
						"X-Title": "My App",
					}),
				}),
			);
		});
	});
});
