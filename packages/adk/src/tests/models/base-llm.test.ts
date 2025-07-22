import { BaseLlm, type LlmRequest } from "@adk/models";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@adk/helpers/logger", () => ({
	Logger: vi.fn(() => ({
		debug: vi.fn(),
		error: vi.fn(),
	})),
}));
const mockSetAttributes = vi.fn();
const mockRecordException = vi.fn();
const mockSetStatus = vi.fn();
const mockEnd = vi.fn();
const mockSpan = {
	setAttributes: mockSetAttributes,
	recordException: mockRecordException,
	setStatus: mockSetStatus,
	end: mockEnd,
};
const mockTracer = {
	startActiveSpan: vi.fn((name, fn) => fn(mockSpan)),
};
vi.mock("../telemetry", () => ({
	tracer: mockTracer,
}));

class TestLlm extends BaseLlm {
	public implResponses: any[] = [];
	constructor(model = "test-model") {
		super(model);
	}
	protected async *generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream?: boolean,
	): AsyncGenerator<any, void, unknown> {
		for (const resp of this.implResponses) {
			yield resp;
		}
	}

	public async *generateContentAsync(
		llmRequest: LlmRequest,
		stream?: boolean,
	): AsyncGenerator<any, void, unknown> {
		this.maybeAppendUserContent(llmRequest);
		for await (const resp of this.generateContentAsyncImpl(
			llmRequest,
			stream,
		)) {
			yield resp;
		}
	}
}

describe("BaseLlm", () => {
	let llm: TestLlm;

	beforeEach(() => {
		vi.clearAllMocks();
		llm = new TestLlm();
	});

	it("should set model in constructor", () => {
		expect(llm.model).toBe("test-model");
		const custom = new TestLlm("custom-model");
		expect(custom.model).toBe("custom-model");
	});

	it("supportedModels returns empty array", () => {
		expect(BaseLlm.supportedModels()).toEqual([]);
	});

	describe("maybeAppendUserContent", () => {
		it("should add user content if contents is undefined", () => {
			const req: any = {};
			llm["maybeAppendUserContent"](req);
			expect(req.contents).toHaveLength(1);
			expect(req.contents[0].role).toBe("user");
		});

		it("should add user content if contents is empty", () => {
			const req: any = { contents: [] };
			llm["maybeAppendUserContent"](req);
			expect(req.contents).toHaveLength(1);
			expect(req.contents[0].role).toBe("user");
		});

		it("should append user content if last role is not user", () => {
			const req: any = { contents: [{ role: "system", parts: [] }] };
			llm["maybeAppendUserContent"](req);
			expect(req.contents).toHaveLength(2);
			expect(req.contents[1].role).toBe("user");
		});

		it("should not append if last role is user", () => {
			const req: any = { contents: [{ role: "user", parts: [] }] };
			llm["maybeAppendUserContent"](req);
			expect(req.contents).toHaveLength(1);
		});
	});

	describe("connect", () => {
		it("should throw error", () => {
			expect(() => llm.connect({} as any)).toThrow(
				"Live connection is not supported for test-model.",
			);
		});
	});
});
