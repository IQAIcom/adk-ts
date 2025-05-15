import type { LLMRequest } from "../models/llm-request";
import type { LLMResponse } from "../models/llm-response";
import type { BaseLLMConnection } from "./base-llm-connection";

/**
 * Base class for all LLM implementations
 */
export abstract class BaseLLM {
	/**
	 * The name of the LLM model
	 */
	model: string;

	/**
	 * Constructor for BaseLLM
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
	 * Appends a user content to the request if necessary.
	 * This ensures that the model can continue to output, especially
	 * if the last message was not from the user or if contents are empty.
	 * @param llmRequest The LLMRequest to potentially modify.
	 */
	protected _maybeAppendUserContent(llmRequest: LLMRequest): void {
		const textForEmpty =
			"Handle the requests as specified in the System Instruction.";
		const textForNonUserLast =
			"Continue processing previous requests as instructed. Exit or provide a summary if no more outputs are needed.";

		if (!llmRequest.contents || llmRequest.contents.length === 0) {
			llmRequest.contents.push({
				role: "user",
				parts: [{ text: textForEmpty }],
			});
			return;
		}

		const lastContent = llmRequest.contents[llmRequest.contents.length - 1];
		if (lastContent.role !== "user") {
			llmRequest.contents.push({
				role: "user",
				parts: [{ text: textForNonUserLast }],
			});
		}
	}

	/**
	 * Generates content from the given request
	 *
	 * @param llmRequest The request to send to the LLM
	 * @param stream Whether to do streaming call
	 * @returns A generator of LLMResponses
	 */
	abstract generateContentAsync(
		llmRequest: LLMRequest,
		stream?: boolean,
	): AsyncGenerator<LLMResponse, void, unknown>;

	/**
	 * Creates a live connection to the LLM
	 *
	 * @param llmRequest The request to send to the LLM
	 * @returns BaseLLMConnection, the connection to the LLM
	 */
	connect(llmRequest: LLMRequest): BaseLLMConnection {
		throw new Error(`Live connection is not supported for ${this.model}`);
	}
}
