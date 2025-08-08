import type {
	Content,
	GenerateContentResponseUsageMetadata,
	GroundingMetadata,
} from "@google/genai";

interface Candidate {
	content?: Content;
	groundingMetadata?: GroundingMetadata;
	finishReason?: string;
	finishMessage?: string;
}

interface PromptFeedback {
	blockReason?: string;
	blockReasonMessage?: string;
}

interface GenerateContentResponse {
	candidates?: Candidate[];
	usageMetadata?: GenerateContentResponseUsageMetadata;
	promptFeedback?: PromptFeedback;
}

export class LlmResponse {
	id?: string;

	text?: string;

	content?: Content;

	groundingMetadata?: GroundingMetadata;

	partial?: boolean;

	turnComplete?: boolean;

	errorCode?: string;

	errorMessage?: string;

	interrupted?: boolean;

	customMetadata?: Record<string, any>;

	usageMetadata?: GenerateContentResponseUsageMetadata;

	candidateIndex?: number;

	finishReason?: string;

	error?: Error;

	constructor(data: Partial<LlmResponse> = {}) {
		Object.assign(this, data);
	}

	static create(generateContentResponse: GenerateContentResponse): LlmResponse {
		const usageMetadata = generateContentResponse.usageMetadata;
		if (
			generateContentResponse.candidates &&
			generateContentResponse.candidates.length > 0
		) {
			const candidate = generateContentResponse.candidates[0];
			if (candidate.content && (candidate.content as any).parts) {
				return new LlmResponse({
					content: candidate.content,
					groundingMetadata: candidate.groundingMetadata,
					usageMetadata,
				});
			}
			return new LlmResponse({
				errorCode: candidate.finishReason,
				errorMessage: candidate.finishMessage,
				usageMetadata,
			});
		}
		if (generateContentResponse.promptFeedback) {
			const promptFeedback = generateContentResponse.promptFeedback;
			return new LlmResponse({
				errorCode: promptFeedback.blockReason,
				errorMessage: promptFeedback.blockReasonMessage,
				usageMetadata,
			});
		}
		return new LlmResponse({
			errorCode: "UNKNOWN_ERROR",
			errorMessage: "Unknown error.",
			usageMetadata,
		});
	}

	static fromError(
		error: unknown,
		options: { errorCode?: string; model?: string } = {},
	): LlmResponse {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorCode = options.errorCode || "UNKNOWN_ERROR";

		return new LlmResponse({
			errorCode,
			errorMessage: `LLM call failed for model ${
				options.model || "unknown"
			}: ${errorMessage}`,
			content: {
				role: "model",
				parts: [{ text: `Error: ${errorMessage}` }],
			},
			finishReason: "STOP",
			error: error instanceof Error ? error : new Error(errorMessage),
		});
	}
}
