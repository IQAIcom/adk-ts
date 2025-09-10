import { Logger } from "@adk/logger";
import { tracer } from "../telemetry";
import type { BaseLLMConnection } from "./base-llm-connection";
import type { LlmRequest } from "./llm-request";
import type { LlmResponse } from "./llm-response";

/**
 * The BaseLlm class.
 */
export abstract class BaseLlm {
	/**
	 * The name of the LLM, e.g. gemini-2.5-flash or gemini-2.5-flash-001.
	 */
	model: string;

	protected logger = new Logger({ name: "BaseLlm" });

	/**
	 * Constructor for BaseLlm
	 */
	constructor(model: string) {
		this.model = model;
	}

	/**
	 * Returns a list of supported models in regex for LLMRegistry
	 */
	static supportedModels(): string[] {
		return [];
	}

	/**
	 * Generates one content from the given contents and tools.
	 *
	 * @param llmRequest LlmRequest, the request to send to the LLM.
	 * @param stream bool = false, whether to do streaming call.
	 * @returns a generator of LlmResponse.
	 *
	 * For non-streaming call, it will only yield one LlmResponse.
	 *
	 * For streaming call, it may yield more than one response, but all yielded
	 * responses should be treated as one response by merging the
	 * parts list.
	 */
	async *generateContentAsync(
		llmRequest: LlmRequest,
		stream?: boolean,
	): AsyncGenerator<LlmResponse, void, unknown> {
		// Apply the maybeAppendUserContent fix before processing
		this.maybeAppendUserContent(llmRequest);

		yield* tracer.startActiveSpan(
			`llm_generate [${this.model}]`,
			async function* (span) {
				try {
					span.setAttributes({
						"gen_ai.system.name": "iqai-adk",
						"gen_ai.operation.name": "generate",
						"gen_ai.request.model": this.model,
						"gen_ai.request.max_tokens":
							llmRequest.config?.maxOutputTokens || 0,
						"gen_ai.request.temperature": llmRequest.config?.temperature || 0,
						"gen_ai.request.top_p": llmRequest.config?.topP || 0,
						"adk.llm_request": JSON.stringify({
							model: this.model,
							contents: llmRequest.contents?.map((content) => ({
								role: content.role,
								parts: content.parts?.map((part) => ({
									text:
										typeof part.text === "string"
											? part.text.substring(0, 200) +
												(part.text.length > 200 ? "..." : "")
											: "[non_text_content]",
								})),
							})),
							config: llmRequest.config,
						}),
						"adk.streaming": stream || false,
					});

					let responseCount = 0;
					let totalTokens = 0;

					for await (const response of this.generateContentAsyncImpl(
						llmRequest,
						stream,
					)) {
						responseCount++;

						// Update span attributes with response info
						if (response.usage) {
							totalTokens += response.usage.total_tokens || 0;
							span.setAttributes({
								"gen_ai.response.finish_reasons": [
									response.finish_reason || "unknown",
								],
								"gen_ai.usage.input_tokens": response.usage.prompt_tokens || 0,
								"gen_ai.usage.output_tokens":
									response.usage.completion_tokens || 0,
								"gen_ai.usage.total_tokens": response.usage.total_tokens || 0,
							});
						}

						yield response;
					}

					span.setAttributes({
						"adk.response_count": responseCount,
						"adk.total_tokens": totalTokens,
					});
				} catch (error) {
					span.recordException(error as Error);
					span.setStatus({ code: 2, message: (error as Error).message });
					this.logger.error("❌ ADK LLM Error:", {
						model: this.model,
						error: (error as Error).message,
					});
					throw error;
				} finally {
					span.end();
				}
			}.bind(this),
		);
	}

	/**
	 * Implementation method to be overridden by subclasses.
	 * This replaces the abstract generateContentAsync method.
	 */
	protected abstract generateContentAsyncImpl(
		llmRequest: LlmRequest,
		stream?: boolean,
	): AsyncGenerator<LlmResponse, void, unknown>;

	/**
	 * Appends a user content, so that model can continue to output.
	 *
	 * @param llmRequest LlmRequest, the request to send to the LLM.
	 */
	protected maybeAppendUserContent(llmRequest: LlmRequest): void {
		// If no content is provided, append a user content to hint model response
		// using system instruction.
		if (!llmRequest.contents || llmRequest.contents.length === 0) {
			llmRequest.contents = llmRequest.contents || [];
			llmRequest.contents.push({
				role: "user",
				parts: [
					{
						text: "Handle the requests as specified in the System Instruction.",
					},
				],
			});
			return;
		}

		// Insert a user content to preserve user intent and to avoid empty
		// model response.
		if (llmRequest.contents[llmRequest.contents.length - 1].role !== "user") {
			llmRequest.contents.push({
				role: "user",
				parts: [
					{
						text: "Continue processing previous requests as instructed. Exit or provide a summary if no more outputs are needed.",
					},
				],
			});
		}
	}
	/**
	 * Creates a live connection to the LLM.
	 *
	 * @param llmRequest LlmRequest, the request to send to the LLM.
	 * @returns BaseLLMConnection, the connection to the LLM.
	 */
	connect(_llmRequest: LlmRequest): BaseLLMConnection {
		throw new Error(`Live connection is not supported for ${this.model}.`);
	}
}
