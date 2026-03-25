import { GoogleGenAI } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleLlm } from "../../models/google-llm";

vi.mock("@adk/helpers/logger", () => ({
	Logger: vi.fn(() => ({
		debug: vi.fn(),
		error: vi.fn(),
	})),
}));

vi.mock("@google/genai", () => ({
	GoogleGenAI: vi.fn(),
}));

describe("GoogleLlm", () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should set model in constructor", () => {
		const llm = new GoogleLlm("foo-model");
		expect(llm.model).toBe("foo-model");
	});

	it("supportedModels returns expected patterns", () => {
		expect(GoogleLlm.supportedModels()).toEqual([
			"gemini-.*",
			"google/.*",
			"projects/.+/locations/.+/endpoints/.+",
			"projects/.+/locations/.+/publishers/google/models/gemini.+",
		]);
	});

	describe("apiClient", () => {
		it("creates GoogleGenAI with VertexAI config if env vars set", () => {
			process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
			process.env.GOOGLE_CLOUD_PROJECT = "proj";
			process.env.GOOGLE_CLOUD_LOCATION = "loc";
			const llm = new GoogleLlm();
			const client = llm.apiClient;
			expect(GoogleGenAI).toHaveBeenCalledWith({
				vertexai: true,
				project: "proj",
				location: "loc",
			});
			expect(client).toBe(llm.apiClient);
		});

		it("creates GoogleGenAI with apiKey if set", () => {
			process.env.GOOGLE_API_KEY = "abc";
			process.env.GOOGLE_GENAI_USE_VERTEXAI = undefined;
			const llm = new GoogleLlm();
			const client = llm.apiClient;
			expect(GoogleGenAI).toHaveBeenCalledWith({
				apiKey: "abc",
			});
			expect(client).toBe(llm.apiClient);
		});

		it("throws if no API key or VertexAI config", () => {
			process.env.GOOGLE_API_KEY = undefined;
			process.env.GOOGLE_GENAI_USE_VERTEXAI = undefined;
			process.env.GOOGLE_CLOUD_PROJECT = undefined;
			process.env.GOOGLE_CLOUD_LOCATION = undefined;
			const llm = new GoogleLlm();
			expect(() => llm.apiClient).toThrow(
				/Google API Key or Vertex AI configuration is required/,
			);
		});
	});

	describe("apiBackend", () => {
		it("returns VERTEX_AI if GOOGLE_GENAI_USE_VERTEXAI is true", () => {
			process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
			const llm = new GoogleLlm();
			expect(llm.apiBackend).toBe("VERTEX_AI");
		});
		it("returns GEMINI_API if GOOGLE_GENAI_USE_VERTEXAI is not true", () => {
			process.env.GOOGLE_GENAI_USE_VERTEXAI = "false";
			const llm = new GoogleLlm();
			expect(llm.apiBackend).toBe("GEMINI_API");
		});
	});

	describe("trackingHeaders", () => {
		it("returns correct headers without AGENT_ENGINE_TELEMETRY", () => {
			process.env.GOOGLE_CLOUD_AGENT_ENGINE_ID = undefined;
			const llm = new GoogleLlm();
			const headers = llm.trackingHeaders;
			expect(headers["x-goog-api-client"]).toMatch(/google-adk\/1\.0\.0/);
			expect(headers["x-goog-api-client"]).not.toMatch(
				/remote_reasoning_engine/,
			);
		});

		it("returns correct headers with AGENT_ENGINE_TELEMETRY", () => {
			process.env.GOOGLE_CLOUD_AGENT_ENGINE_ID = "foo";
			const llm = new GoogleLlm();
			const headers = llm.trackingHeaders;
			expect(headers["x-goog-api-client"]).toMatch(/\+remote_reasoning_engine/);
		});
	});

	describe("liveApiVersion", () => {
		it("returns v1beta1 for VERTEX_AI", () => {
			process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
			const llm = new GoogleLlm();
			expect(llm.liveApiVersion).toBe("v1beta1");
		});
		it("returns v1alpha for GEMINI_API", () => {
			process.env.GOOGLE_GENAI_USE_VERTEXAI = "false";
			const llm = new GoogleLlm();
			expect(llm.liveApiVersion).toBe("v1alpha");
		});
	});

	describe("liveApiClient", () => {
		it("creates GoogleGenAI with VertexAI config and apiVersion", () => {
			process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
			process.env.GOOGLE_CLOUD_PROJECT = "proj";
			process.env.GOOGLE_CLOUD_LOCATION = "loc";
			const llm = new GoogleLlm();
			const client = llm.liveApiClient;
			expect(GoogleGenAI).toHaveBeenCalledWith({
				vertexai: true,
				project: "proj",
				location: "loc",
				apiVersion: "v1beta1",
			});
			expect(client).toBe(llm.liveApiClient);
		});

		it("creates GoogleGenAI with apiKey and apiVersion", () => {
			process.env.GOOGLE_API_KEY = "abc";
			process.env.GOOGLE_GENAI_USE_VERTEXAI = undefined;
			const llm = new GoogleLlm();
			const client = llm.liveApiClient;
			expect(GoogleGenAI).toHaveBeenCalledWith({
				apiKey: "abc",
				apiVersion: "v1alpha",
			});
			expect(client).toBe(llm.liveApiClient);
		});

		it("throws if no API key or VertexAI config", () => {
			process.env.GOOGLE_API_KEY = undefined;
			process.env.GOOGLE_GENAI_USE_VERTEXAI = undefined;
			process.env.GOOGLE_CLOUD_PROJECT = undefined;
			process.env.GOOGLE_CLOUD_LOCATION = undefined;
			const llm = new GoogleLlm();
			expect(() => llm.liveApiClient).toThrow(
				/Google API Key or Vertex AI configuration is required/,
			);
		});
	});

	describe("connect", () => {
		it("should throw error", () => {
			const llm = new GoogleLlm("foo");
			expect(() => llm.connect({} as any)).toThrow(
				"Live connection is not supported for foo.",
			);
		});
	});

	describe("explicit config (GoogleLlmConfig)", () => {
		it("uses explicit apiKey config, bypasses env", () => {
			process.env.GOOGLE_API_KEY = "env-key";
			const llm = new GoogleLlm("gemini-2.5-flash", {
				apiKey: "explicit-key",
			});
			llm.apiClient;
			expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "explicit-key" });
			expect(GoogleGenAI).toHaveBeenCalledTimes(1);
		});

		it("uses explicit vertexai config, bypasses env", () => {
			process.env.GOOGLE_GENAI_USE_VERTEXAI = undefined;
			process.env.GOOGLE_API_KEY = "env-key";
			const llm = new GoogleLlm("gemini-2.5-flash", {
				vertexai: true,
				project: "my-proj",
				location: "us-central1",
			});
			llm.apiClient;
			expect(GoogleGenAI).toHaveBeenCalledWith({
				vertexai: true,
				project: "my-proj",
				location: "us-central1",
			});
		});

		it("uses pre-built client injection directly", () => {
			const fakeClient = { models: {} } as unknown as GoogleGenAI;
			const llm = new GoogleLlm("gemini-2.5-flash", { client: fakeClient });
			expect(llm.apiClient).toBe(fakeClient);
			expect(GoogleGenAI).not.toHaveBeenCalled();
		});

		it("pre-built client is returned for liveApiClient too", () => {
			const fakeClient = { models: {} } as unknown as GoogleGenAI;
			const llm = new GoogleLlm("gemini-2.5-flash", { client: fakeClient });
			expect(llm.liveApiClient).toBe(fakeClient);
			expect(GoogleGenAI).not.toHaveBeenCalled();
		});

		it("apiBackend returns VERTEX_AI when config.vertexai is true", () => {
			const llm = new GoogleLlm("gemini-2.5-flash", {
				vertexai: true,
				project: "p",
				location: "l",
			});
			expect(llm.apiBackend).toBe("VERTEX_AI");
		});

		it("apiBackend returns GEMINI_API when config is provided without vertexai", () => {
			const llm = new GoogleLlm("gemini-2.5-flash", {
				apiKey: "key",
			});
			expect(llm.apiBackend).toBe("GEMINI_API");
		});

		it("falls back to env when no config provided", () => {
			process.env.GOOGLE_API_KEY = "fallback-key";
			const llm = new GoogleLlm("gemini-2.5-flash");
			llm.apiClient;
			expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "fallback-key" });
		});

		it("throws on incomplete config instead of falling through to env", () => {
			process.env.GOOGLE_API_KEY = "env-key";
			const llm = new GoogleLlm("gemini-2.5-flash", {
				vertexai: true,
				project: "p",
				// missing location
			});
			expect(() => llm.apiClient).toThrow(/Incomplete GoogleLlmConfig/);
		});

		it("apiBackend returns GEMINI_API when vertexai is true but project/location missing", () => {
			const llm = new GoogleLlm("gemini-2.5-flash", {
				vertexai: true,
				apiKey: "key",
			});
			expect(llm.apiBackend).toBe("GEMINI_API");
		});
	});

	describe("race condition safety", () => {
		it("concurrent instances with different configs resolve independently", () => {
			// Simulate what would be a race in a multi-tenant server:
			// Two concurrent requests with different Google backends
			const vertexLlm = new GoogleLlm("gemini-2.5-flash", {
				vertexai: true,
				project: "proj-a",
				location: "us-east1",
			});
			const apiKeyLlm = new GoogleLlm("gemini-2.5-flash", {
				apiKey: "key-b",
			});

			// Access clients — the order shouldn't matter
			apiKeyLlm.apiClient;
			vertexLlm.apiClient;

			expect(GoogleGenAI).toHaveBeenCalledTimes(2);
			expect(GoogleGenAI).toHaveBeenCalledWith({
				apiKey: "key-b",
			});
			expect(GoogleGenAI).toHaveBeenCalledWith({
				vertexai: true,
				project: "proj-a",
				location: "us-east1",
			});

			// Backends resolve independently too
			expect(vertexLlm.apiBackend).toBe("VERTEX_AI");
			expect(apiKeyLlm.apiBackend).toBe("GEMINI_API");
		});

		it("N concurrent instances each get their own client", () => {
			const configs = Array.from({ length: 10 }, (_, i) => ({
				apiKey: `key-${i}`,
			}));

			const llms = configs.map((cfg) => new GoogleLlm("gemini-2.5-flash", cfg));

			// Access all clients
			for (const llm of llms) {
				llm.apiClient;
			}

			expect(GoogleGenAI).toHaveBeenCalledTimes(10);
			for (let i = 0; i < 10; i++) {
				expect(GoogleGenAI).toHaveBeenCalledWith({
					apiKey: `key-${i}`,
				});
			}
		});
	});
});
