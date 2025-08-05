import { Logger } from "@adk/logger";
import type { Content, Part } from "@google/genai";
import {
	type CoreMessage,
	type LanguageModel,
	type Tool,
	generateText,
	jsonSchema,
	streamText,
} from "ai";
import { BaseLlm } from "./base-llm";
import type { LlmRequest } from "./llm-request";
import { LlmResponse } from "./llm-response";

/**
 * AI SDK integration that accepts a pre-configured LanguageModel.
 * Enables ADK to work with any provider supported by Vercel's AI SDK.
 */
export class AiSdkLlm extends BaseLlm {
	private modelInstance: LanguageModel;
	protected logger = new Logger({ name: "AiSdkLlm" });

	/**
	 * Constructor accepts a pre-configured LanguageModel instance
	 * @param model - Pre-configured LanguageModel from provider(modelName)
	 */
	constructor(modelInstance: LanguageModel) {
		super(modelInstance.modelId || "ai-sdk-model");
		this.modelInstance = modelInstance;
	}

	/**
	 * Returns empty array - following Python ADK pattern
	 */
	static override supportedModels(): string[] {
		return [];
	}

	protected async *generateContentAsyncImpl(
		request: LlmRequest,
		stream = false,
	): AsyncGenerator<LlmResponse, void, unknown> {
		try {
			const messages = this.convertToAiSdkMessages(request);
			const systemMessage = request.getSystemInstructionText();
			const tools = this.convertToAiSdkTools(request);

			const requestParams = {
				model: this.modelInstance,
				messages,
				system: systemMessage,
				tools: Object.keys(tools).length > 0 ? tools : undefined,
				maxTokens: request.config?.maxOutputTokens,
				temperature: request.config?.temperature,
				topP: request.config?.topP,
			};

			if (stream) {
				const result = streamText(requestParams);

				let accumulatedText = "";

				for await (const delta of result.textStream) {
					accumulatedText += delta;

					yield new LlmResponse({
						content: {
							role: "model",
							parts: [{ text: accumulatedText }],
						},
						partial: true,
					});
				}

				const toolCalls = await result.toolCalls;
				const parts: Part[] = [];

				if (accumulatedText) {
					parts.push({ text: accumulatedText });
				}

				if (toolCalls && toolCalls.length > 0) {
					for (const toolCall of toolCalls) {
						parts.push({
							functionCall: {
								id: toolCall.toolCallId,
								name: toolCall.toolName,
								args: toolCall.args,
							},
						});
					}
				}

				const finalUsage = await result.usage;
				const finishReason = await result.finishReason;
				yield new LlmResponse({
					content: {
						role: "model",
						parts: parts.length > 0 ? parts : [{ text: "" }],
					},
					usageMetadata: finalUsage
						? {
								promptTokenCount: finalUsage.promptTokens,
								candidatesTokenCount: finalUsage.completionTokens,
								totalTokenCount: finalUsage.totalTokens,
							}
						: undefined,
					finishReason: this.mapFinishReason(finishReason),
					turnComplete: true,
				});
			} else {
				const result = await generateText(requestParams);

				const parts: Part[] = [];
				if (result.text) {
					parts.push({ text: result.text });
				}
				if (result.toolCalls && result.toolCalls.length > 0) {
					for (const toolCall of result.toolCalls) {
						parts.push({
							functionCall: {
								id: toolCall.toolCallId,
								name: toolCall.toolName,
								args: toolCall.args,
							},
						});
					}
				}

				yield new LlmResponse({
					content: {
						role: "model",
						parts: parts.length > 0 ? parts : [{ text: "" }],
					},
					usageMetadata: result.usage
						? {
								promptTokenCount: result.usage.promptTokens,
								candidatesTokenCount: result.usage.completionTokens,
								totalTokenCount: result.usage.totalTokens,
							}
						: undefined,
					finishReason: this.mapFinishReason(result.finishReason),
					turnComplete: true,
				});
			}
		} catch (error) {
			this.logger.error(
				{
					err: error as Error,
					request: request,
					model: this.model,
				},
				`AI SDK Error: ${String(error)}`,
			);
			yield LlmResponse.fromError(error, {
				errorCode: "AI_SDK_ERROR",
				model: this.model,
			});
		}
	}

	/**
	 * Convert ADK LlmRequest to AI SDK CoreMessage format
	 */
	private convertToAiSdkMessages(llmRequest: LlmRequest): CoreMessage[] {
		const messages: CoreMessage[] = [];

		for (const content of llmRequest.contents || []) {
			const message = this.contentToAiSdkMessage(content);
			if (message) {
				messages.push(message);
			}
		}

		return messages;
	}

	/**
	 * Transform JSON schema to use lowercase types for AI SDK compatibility
	 */
	private transformSchemaForAiSdk(schema: any): any {
		if (Array.isArray(schema)) {
			return schema.map((item) => this.transformSchemaForAiSdk(item));
		}

		if (!schema || typeof schema !== "object") {
			return schema;
		}

		const transformedSchema = { ...schema };

		// Transform type property from uppercase to lowercase
		if (transformedSchema.type && typeof transformedSchema.type === "string") {
			transformedSchema.type = transformedSchema.type.toLowerCase();
		}

		// Recursively transform properties
		if (transformedSchema.properties) {
			transformedSchema.properties = Object.fromEntries(
				Object.entries(transformedSchema.properties).map(([key, value]) => [
					key,
					this.transformSchemaForAiSdk(value),
				]),
			);
		}

		// Transform array items (handles both single schema and array of schemas)
		if (transformedSchema.items) {
			transformedSchema.items = this.transformSchemaForAiSdk(
				transformedSchema.items,
			);
		}

		// Transform anyOf, oneOf, allOf
		const arrayKeywords = ["anyOf", "oneOf", "allOf"];
		for (const keyword of arrayKeywords) {
			if (transformedSchema[keyword]) {
				transformedSchema[keyword] = this.transformSchemaForAiSdk(
					transformedSchema[keyword],
				);
			}
		}

		return transformedSchema;
	}

	/**
	 * Convert ADK tools to AI SDK tools format
	 */
	private convertToAiSdkTools(llmRequest: LlmRequest): Record<string, Tool> {
		const tools: Record<string, Tool> = {};

		if (llmRequest.config?.tools) {
			for (const toolConfig of llmRequest.config.tools) {
				if ("functionDeclarations" in toolConfig) {
					for (const funcDecl of toolConfig.functionDeclarations) {
						tools[funcDecl.name] = {
							description: funcDecl.description,
							parameters: jsonSchema(
								this.transformSchemaForAiSdk(funcDecl.parameters || {}),
							),
						};
					}
				}
			}
		}
		return tools;
	}

	/**
	 * Convert ADK Content to AI SDK CoreMessage
	 */
	private contentToAiSdkMessage(content: Content): CoreMessage | null {
		const role = this.mapRole(content.role);

		if (!content.parts || content.parts.length === 0) {
			return null;
		}

		if (content.parts.length === 1 && content.parts[0].text) {
			const textContent = content.parts[0].text;

			if (role === "system") {
				return { role: "system", content: textContent };
			}
			if (role === "assistant") {
				return { role: "assistant", content: textContent };
			}
			return { role: "user", content: textContent };
		}

		if (content.parts?.some((part) => part.functionCall)) {
			const textParts = content.parts.filter((part) => part.text);
			const functionCalls = content.parts.filter((part) => part.functionCall);

			const contentParts: (
				| { type: "text"; text: string }
				| {
						type: "tool-call";
						toolCallId: string;
						toolName: string;
						args: Record<string, any>;
				  }
			)[] = [];

			for (const textPart of textParts) {
				if (textPart.text) {
					contentParts.push({
						type: "text",
						text: textPart.text,
					});
				}
			}

			for (const funcPart of functionCalls) {
				if (funcPart.functionCall) {
					contentParts.push({
						type: "tool-call",
						toolCallId: funcPart.functionCall.id,
						toolName: funcPart.functionCall.name,
						args: funcPart.functionCall.args,
					});
				}
			}

			return {
				role: "assistant" as const,
				content: contentParts,
			};
		}

		if (content.parts?.some((part) => part.functionResponse)) {
			const functionResponses = content.parts.filter(
				(part) => part.functionResponse,
			);

			const contentParts = functionResponses.map((part) => ({
				type: "tool-result" as const,
				toolCallId: part.functionResponse.id,
				toolName: part.functionResponse.name || "unknown",
				result: part.functionResponse.response,
			}));

			return {
				role: "tool" as const,
				content: contentParts,
			};
		}

		const contentParts: { type: "text"; text: string }[] = [];

		for (const part of content.parts) {
			if (part.text) {
				contentParts.push({
					type: "text",
					text: part.text,
				});
			}
		}

		if (contentParts.length === 0) {
			return null;
		}

		if (contentParts.length === 1) {
			const textContent = contentParts[0].text;
			if (role === "system") {
				return { role: "system", content: textContent };
			}
			if (role === "assistant") {
				return { role: "assistant", content: textContent };
			}
			return { role: "user", content: textContent };
		}

		if (role === "system") {
			const combinedText = contentParts.map((p) => p.text).join("");
			return { role: "system", content: combinedText };
		}
		if (role === "assistant") {
			return { role: "assistant", content: contentParts };
		}
		return { role: "user", content: contentParts };
	}

	/**
	 * Map ADK role to AI SDK role
	 */
	private mapRole(role?: string): "user" | "assistant" | "system" {
		switch (role) {
			case "model":
			case "assistant":
				return "assistant";
			case "system":
				return "system";
			default:
				return "user";
		}
	}

	/**
	 * Map AI SDK finish reason to ADK finish reason
	 */
	private mapFinishReason(
		finishReason?: string,
	): "STOP" | "MAX_TOKENS" | "FINISH_REASON_UNSPECIFIED" {
		switch (finishReason) {
			case "stop":
			case "end_of_message":
				return "STOP";
			case "length":
			case "max_tokens":
				return "MAX_TOKENS";
			default:
				return "FINISH_REASON_UNSPECIFIED";
		}
	}
}
