import { describe, expect, it } from "vitest";
import { AiSdkLlm } from "../../models/ai-sdk";

describe("AiSdkLlm", () => {
	describe("mapFinishReason", () => {
		it("should map stop to STOP", () => {
			const llm = new AiSdkLlm({ modelId: "test-model" } as any);
			expect((llm as any).mapFinishReason("stop")).toBe("STOP");
		});

		it("should map end_of_message to STOP", () => {
			const llm = new AiSdkLlm({ modelId: "test-model" } as any);
			expect((llm as any).mapFinishReason("end_of_message")).toBe("STOP");
		});

		it("should map tool-calls to STOP", () => {
			const llm = new AiSdkLlm({ modelId: "test-model" } as any);
			expect((llm as any).mapFinishReason("tool-calls")).toBe("STOP");
		});

		it("should map tool_calls to STOP", () => {
			const llm = new AiSdkLlm({ modelId: "test-model" } as any);
			expect((llm as any).mapFinishReason("tool_calls")).toBe("STOP");
		});

		it("should map function_call to STOP", () => {
			const llm = new AiSdkLlm({ modelId: "test-model" } as any);
			expect((llm as any).mapFinishReason("function_call")).toBe("STOP");
		});

		it("should map length to MAX_TOKENS", () => {
			const llm = new AiSdkLlm({ modelId: "test-model" } as any);
			expect((llm as any).mapFinishReason("length")).toBe("MAX_TOKENS");
		});

		it("should map max_tokens to MAX_TOKENS", () => {
			const llm = new AiSdkLlm({ modelId: "test-model" } as any);
			expect((llm as any).mapFinishReason("max_tokens")).toBe("MAX_TOKENS");
		});

		it("should default to FINISH_REASON_UNSPECIFIED", () => {
			const llm = new AiSdkLlm({ modelId: "test-model" } as any);
			expect((llm as any).mapFinishReason("other")).toBe(
				"FINISH_REASON_UNSPECIFIED",
			);
			expect((llm as any).mapFinishReason(undefined)).toBe(
				"FINISH_REASON_UNSPECIFIED",
			);
		});
	});
});
