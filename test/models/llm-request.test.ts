import { describe, expect, it } from "vitest";
import {
	LLMRequest,
	type LLMRequestConfig,
	type Content,
	type Part,
	type Role,
	type TextPart,
	type InlineDataPart,
} from "../../src/models/llm-request";
import type { FunctionDeclaration } from "../../src";

describe("LLMRequest", () => {
	it("should initialize with simple content", () => {
		const contents: Content[] = [
			{ role: "user", parts: [{ text: "Hello, world!" }] },
		];

		const request = new LLMRequest({ contents });

		expect(request.contents).toEqual(contents);
		expect(request.config).toBeDefined();
	});

	it("should initialize with contents and config", () => {
		const contents: Content[] = [
			{ role: "user", parts: [{ text: "Hello, world!" }] },
		];

		const config: LLMRequestConfig = {
			temperature: 0.7,
			max_tokens: 100,
		};

		const request = new LLMRequest({ contents, config });

		expect(request.contents).toEqual(contents);
		expect(request.config).toEqual(config);
	});

	it("should handle empty contents array", () => {
		const request = new LLMRequest({ contents: [] });

		expect(request.contents).toEqual([]);
		expect(request.config).toBeDefined();
	});

	it("should handle multimodal content (text and inline data)", () => {
		const textPart: TextPart = { text: "What is this image?" };
		const imagePart: InlineDataPart = {
			inlineData: {
				mimeType: "image/jpeg",
				data: "/9j/4AAQSkZJRgABAQEAYABgAAD...",
			},
		};

		const contents: Content[] = [
			{
				role: "user",
				parts: [textPart, imagePart],
			},
		];

		const request = new LLMRequest({ contents });

		expect(request.contents).toEqual(contents);
		expect(request.contents[0].parts.length).toBe(2);
		const firstPart = request.contents[0].parts[0] as TextPart;
		const secondPart = request.contents[0].parts[1] as InlineDataPart;
		expect(firstPart.text).toBe("What is this image?");
		expect(secondPart.inlineData.mimeType).toBe("image/jpeg");
	});

	it("should handle functions in config", () => {
		const contents: Content[] = [
			{ role: "user", parts: [{ text: "What is the weather in Paris?" }] },
		];

		const getWeatherFunction: FunctionDeclaration = {
			name: "get_weather",
			description: "Get the weather for a location",
			parameters: {
				type: "object",
				properties: {
					location: {
						type: "string",
						description: "The city and state or country",
					},
				},
				required: ["location"],
			},
		};

		const config: LLMRequestConfig = {
			functions: [getWeatherFunction],
		};

		const request = new LLMRequest({ contents, config });

		expect(request.config.functions).toBeDefined();
		expect(request.config.functions?.length).toBe(1);
		expect(request.config.functions?.[0].name).toBe("get_weather");
	});

	it("should set default config if not provided", () => {
		const contents: Content[] = [{ role: "user", parts: [{ text: "Hello" }] }];

		const request = new LLMRequest({ contents });

		expect(request.config).toEqual({});
	});

	it("should support defined roles for Content objects", () => {
		const roles: Role[] = ["user", "model", "function"];

		for (const role of roles) {
			const contentItem: Content = {
				role,
				parts: [{ text: `I am a ${role} message` }],
			};

			const request = new LLMRequest({ contents: [contentItem] });
			expect(request.contents[0].role).toBe(role);
		}
	});
});
