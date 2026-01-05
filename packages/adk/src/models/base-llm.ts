import { Logger } from "@adk/logger";
import { trace } from "@opentelemetry/api";
import { shouldCaptureContent, telemetryService } from "../telemetry";
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

		// Use the active span created at a higher level (base-llm-flow.ts)
		// instead of creating a new span here to avoid duplication
		const span = trace.getActiveSpan();

		// Build proper request/response data for tracing
		const captureContent = shouldCaptureContent();

		if (span && captureContent) {
			span.setAttributes({
				"gen_ai.system": "iqai-adk",
				"gen_ai.operation.name": stream ? "stream" : "generate",
				"gen_ai.request.model": this.model,
				"gen_ai.request.max_tokens": llmRequest.config?.maxOutputTokens || 0,
				"gen_ai.request.temperature": llmRequest.config?.temperature || 0,
				"gen_ai.request.top_p": llmRequest.config?.topP || 0,
				"adk.llm.streaming": stream || false,
			});

			// Emit prompt event with full input content
			if (llmRequest.contents) {
				span.addEvent("gen_ai.content.prompt", {
					"gen_ai.prompt": JSON.stringify(llmRequest.contents),
				});
			}
		}

		let responseCount = 0;
		let totalTokens = 0;
		let inputTokens = 0;
		let outputTokens = 0;
		let firstTokenTime: number | undefined;
		const startTime = Date.now();
		let chunkCount = 0;
		let accumulatedContent: any = null;

		try {
			for await (const response of this.generateContentAsyncImpl(
				llmRequest,
				stream,
			)) {
				responseCount++;

				// Record time to first token for streaming
				if (stream && !firstTokenTime) {
					firstTokenTime = Date.now();
					const timeToFirstToken = firstTokenTime - startTime;

					// Record TTFT metric
					telemetryService.traceEnhancedLlm(
						true, // streaming
						timeToFirstToken,
					);

					// Add span event for first token
					if (span) {
						span.addEvent("gen_ai.stream.first_token", {
							time_to_first_token_ms: timeToFirstToken,
						});
					}
				}

				// Count chunks for streaming
				if (stream) {
					chunkCount++;

					// Add span event for each chunk
					if (span) {
						span.addEvent("gen_ai.stream.chunk", {
							chunk_index: chunkCount,
							timestamp: Date.now(),
						});
					}
				}

				// Accumulate content for completion event
				if (response.content) {
					accumulatedContent = response.content;
				} else if (response.text) {
					if (!accumulatedContent) {
						accumulatedContent = { role: "model", parts: [{ text: "" }] };
					}
					if (accumulatedContent.parts?.[0]) {
						accumulatedContent.parts[0].text =
							(accumulatedContent.parts[0].text || "") + response.text;
					}
				}

				// Update span attributes with response info and token usage
				if (response.usageMetadata && span) {
					inputTokens = response.usageMetadata.promptTokenCount || inputTokens;
					outputTokens =
						response.usageMetadata.candidatesTokenCount || outputTokens;
					totalTokens = response.usageMetadata.totalTokenCount || totalTokens;

					span.setAttributes({
						"gen_ai.usage.input_tokens": inputTokens,
						"gen_ai.usage.output_tokens": outputTokens,
						"gen_ai.usage.total_tokens": totalTokens,
					});
				}

				// Set finish reason if available
				if (response.finishReason && span) {
					span.setAttribute("gen_ai.response.finish_reasons", [
						response.finishReason,
					]);
				}

				yield response;
			}

			if (span) {
				span.setAttributes({
					"adk.response_count": responseCount,
				});

				// Emit completion event with final output content
				if (captureContent && accumulatedContent) {
					span.addEvent("gen_ai.content.completion", {
						"gen_ai.completion": JSON.stringify(accumulatedContent),
					});
				}
			}

			// Record final streaming metrics
			if (stream && chunkCount > 0) {
				telemetryService.traceEnhancedLlm(
					true,
					firstTokenTime ? firstTokenTime - startTime : undefined,
					chunkCount,
				);
			}
		} catch (error) {
			// Use telemetry error tracing
			telemetryService.traceError(
				error as Error,
				"model_error",
				false,
				true, // retry may be recommended for transient model errors
			);

			this.logger.error("❌ ADK LLM Error:", {
				model: this.model,
				error: (error as Error).message,
			});
			throw error;
		}
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
