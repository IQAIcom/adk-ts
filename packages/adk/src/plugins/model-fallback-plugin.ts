import type { BaseAgent, CallbackContext } from "@adk/agents";
import { Logger } from "@adk/logger";
import type { LlmRequest } from "@adk/models";
import type { BaseLlm } from "../models/base-llm";
import { RateLimitError } from "../models/errors";
import { LLMRegistry } from "../models/llm-registry";
import { LlmResponse } from "../models/llm-response";
import { BasePlugin } from "./base-plugin";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

interface FallbackState {
	retryCount: number;
	fallbackIndex: number;
}

interface AgentWithCanonicalModel extends BaseAgent {
	canonicalModel?: BaseLlm;
}

/**
 * Plugin that provides automatic model fallback on rate limit errors.
 * On rate limit (429), retries the same model up to maxRetries times with a fixed delay.
 */
export class ModelFallbackPlugin extends BasePlugin {
	private readonly logger = new Logger({ name: "ModelFallbackPlugin" });
	private readonly fallbackModels: string[];
	private readonly maxRetries: number;
	private readonly retryDelayMs: number;

	/**
	 * Track state per invocation: retry count and fallback index
	 */
	private state: Map<string, FallbackState> = new Map();

	constructor(
		fallbackModels: string[],
		maxRetries: number = DEFAULT_MAX_RETRIES,
		retryDelayMs: number = DEFAULT_RETRY_DELAY_MS,
	) {
		super("model_fallback_plugin");
		this.fallbackModels = fallbackModels;
		this.maxRetries = maxRetries;
		this.retryDelayMs = retryDelayMs;
	}

	async onModelErrorCallback(params: {
		callbackContext: CallbackContext;
		llmRequest: LlmRequest;
		error: unknown;
	}): Promise<LlmResponse | undefined> {
		const { callbackContext, llmRequest, error } = params;

		// Only handle rate limit errors
		if (!RateLimitError.isRateLimitError(error)) {
			return undefined;
		}

		const invocationId = callbackContext.invocationContext.invocationId;

		let fallbackState = this.state.get(invocationId);
		if (!fallbackState) {
			fallbackState = { retryCount: 0, fallbackIndex: -1 };
			this.state.set(invocationId, fallbackState);
		}

		const currentModel =
			fallbackState.fallbackIndex === -1
				? llmRequest.model ||
					(callbackContext.invocationContext.agent as AgentWithCanonicalModel)
						.canonicalModel?.model ||
					"unknown"
				: this.fallbackModels[fallbackState.fallbackIndex];

		if (fallbackState.retryCount < this.maxRetries) {
			fallbackState.retryCount++;

			this.logger.info(
				`Rate limited on ${currentModel}, retry ${fallbackState.retryCount}/${this.maxRetries} after ${this.retryDelayMs}ms`,
			);

			await this.sleep(this.retryDelayMs);

			try {
				const llm =
					fallbackState.fallbackIndex === -1
						? ((
								callbackContext.invocationContext
									.agent as AgentWithCanonicalModel
							).canonicalModel as BaseLlm)
						: LLMRegistry.newLLM(currentModel);

				const response = await this.executeModel(llm, llmRequest);
				this.logger.info(
					`Retry ${fallbackState.retryCount} successful on ${currentModel}`,
				);
				this.state.delete(invocationId);
				return response;
			} catch (retryError) {
				return this.onModelErrorCallback({
					callbackContext,
					llmRequest,
					error: retryError,
				});
			}
		}

		// Retries exhausted, try next fallback model
		fallbackState.fallbackIndex++;
		fallbackState.retryCount = 0;

		if (fallbackState.fallbackIndex >= this.fallbackModels.length) {
			this.logger.warn(
				`All models exhausted (primary + ${this.fallbackModels.length} fallbacks)`,
			);
			this.state.delete(invocationId);
			return undefined; // Let error propagate
		}

		const fallbackModel = this.fallbackModels[fallbackState.fallbackIndex];

		this.logger.info(`Falling back from ${currentModel} to ${fallbackModel}`);

		try {
			const fallbackLlm = LLMRegistry.newLLM(fallbackModel);
			const response = await this.executeModel(fallbackLlm, llmRequest);

			this.logger.info(`Fallback to ${fallbackModel} successful`);
			this.state.delete(invocationId);
			return response;
		} catch (fallbackError) {
			return this.onModelErrorCallback({
				callbackContext,
				llmRequest,
				error: fallbackError,
			});
		}
	}

	/**
	 * Clean up state after successful model calls
	 */
	async afterModelCallback(params: {
		callbackContext: CallbackContext;
		llmResponse: LlmResponse;
	}): Promise<LlmResponse | undefined> {
		const invocationId = params.callbackContext.invocationContext.invocationId;
		this.state.delete(invocationId);
		return undefined;
	}

	private async executeModel(
		llm: BaseLlm,
		llmRequest: LlmRequest,
	): Promise<LlmResponse> {
		let finalResponse: LlmResponse | undefined;

		for await (const response of llm.generateContentAsync(llmRequest, false)) {
			finalResponse = response;
		}

		if (!finalResponse) {
			throw new Error("No response from model");
		}

		return finalResponse;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
