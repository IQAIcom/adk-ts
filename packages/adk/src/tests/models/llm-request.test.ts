import { describe, it, expect, beforeEach } from "vitest";
import { LlmRequest } from "../../models/llm-request";

describe("LlmRequest", () => {
	let req: LlmRequest;

	beforeEach(() => {
		req = new LlmRequest();
	});

	describe("constructor", () => {
		it("should initialize with defaults", () => {
			expect(req.model).toBeUndefined();
			expect(req.contents).toEqual([]);
			expect(req.config).toBeUndefined();
			expect(req.liveConnectConfig).toBeDefined();
			expect(req.toolsDict).toEqual({});
		});

		it("should initialize with provided data", () => {
			const data = {
				model: "foo",
				contents: [{ parts: [{ text: "bar" }] }],
				config: { systemInstruction: "baz" },
				liveConnectConfig: { foo: "bar" } as any,
				toolsDict: { t: {} as any },
			};
			const r = new LlmRequest(data);
			expect(r.model).toBe("foo");
			expect(r.contents).toEqual([{ parts: [{ text: "bar" }] }]);
			expect(r.config).toEqual({ systemInstruction: "baz" });
			expect(r.liveConnectConfig).toEqual({ foo: "bar" });
			expect(r.toolsDict).toEqual({ t: {} });
		});
	});

	describe("appendInstructions", () => {
		it("should set systemInstruction if not present", () => {
			req.appendInstructions(["a", "b"]);
			expect(req.config?.systemInstruction).toBe("a\n\nb");
		});

		it("should append to existing systemInstruction", () => {
			req.config = { systemInstruction: "foo" };
			req.appendInstructions(["bar", "baz"]);
			expect(req.config.systemInstruction).toBe("foo\n\nbar\n\nbaz");
		});
	});

	describe("appendTools", () => {
		it("should do nothing if tools is empty", () => {
			req.appendTools([]);
			expect(req.config).toBeUndefined();
		});

		it("should append tool declarations and update toolsDict", () => {
			const tool1 = { name: "t1", getDeclaration: () => ({ a: 1 }) };
			const tool2 = { name: "t2", getDeclaration: () => ({ b: 2 }) };
			req.appendTools([tool1 as any, tool2 as any]);
			expect(req.toolsDict.t1).toBe(tool1);
			expect(req.toolsDict.t2).toBe(tool2);
		});

		it("should not add tools with no declaration", () => {
			const tool = { name: "t", getDeclaration: () => undefined };
			req.appendTools([tool as any]);
			expect(req.config?.tools).toBeUndefined();
			expect(req.toolsDict.t).toBeUndefined();
		});
	});

	describe("setOutputSchema", () => {
		it("should set responseSchema and responseMimeType", () => {
			req.setOutputSchema({ foo: "bar" });
			expect(req.config?.responseSchema).toEqual({ foo: "bar" });
			expect(req.config?.responseMimeType).toBe("application/json");
		});

		it("should work if config already exists", () => {
			req.config = { systemInstruction: "x" };
			req.setOutputSchema({ y: 1 });
			expect(req.config.responseSchema).toEqual({ y: 1 });
			expect(req.config.responseMimeType).toBe("application/json");
			expect(req.config.systemInstruction).toBe("x");
		});
	});

	describe("getSystemInstructionText", () => {
		it("should return undefined if not set", () => {
			expect(req.getSystemInstructionText()).toBeUndefined();
		});

		it("should return string if systemInstruction is string", () => {
			req.config = { systemInstruction: "foo" };
			expect(req.getSystemInstructionText()).toBe("foo");
		});

		it("should extract text from Content with parts", () => {
			req.config = {
				systemInstruction: {
					parts: [{ text: "a" }, { text: "b" }, { text: "" }, {}],
				},
			};
			expect(req.getSystemInstructionText()).toBe("ab");
		});

		it("should fallback to string conversion for other types", () => {
			req.config = { systemInstruction: "123" };
			expect(req.getSystemInstructionText()).toBe("123");
		});
	});
});
