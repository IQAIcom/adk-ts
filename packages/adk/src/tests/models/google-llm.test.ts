import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GoogleLlm } from "../../models/google-llm";
import { GoogleGenAI } from "@google/genai";

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
		it("returns correct headers with and without AGENT_ENGINE_TELEMETRY_ENV_VARIABLE_NAME", () => {
			const llm = new GoogleLlm();
			process.env.GOOGLE_CLOUD_AGENT_ENGINE_ID = undefined;
			const headers1 = llm.trackingHeaders;
			expect(headers1["x-goog-api-client"]).toMatch(/google-adk\/1\.0\.0/);
			process.env.GOOGLE_CLOUD_AGENT_ENGINE_ID = "foo";

			(llm as any)._trackingHeaders = undefined;
			const headers2 = llm.trackingHeaders;
			expect(headers2["x-goog-api-client"]).toMatch(
				/\+remote_reasoning_engine/,
			);
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
				/API configuration required for live client/,
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
});
