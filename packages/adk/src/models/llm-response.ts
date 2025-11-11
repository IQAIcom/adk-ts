import type {
	Content,
	GenerateContentResponseUsageMetadata,
	GroundingMetadata,
} from "@google/genai";
import type { CacheMetadata } from "./gemini-context-cache-manager";

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

	/**
	 * Cache metadata for context caching operations
	 */
	cacheMetadata?: CacheMetadata;

	usageMetadata?: GenerateContentResponseUsageMetadata;

	candidateIndex?: number;

	finishReason?: string;

	error?: Error;

	/** LLM request metadata for debugging */
	requestMetadata?: {
		model?: string;
		config?: any;
		systemInstruction?: string;
		tools?: any[];
		contents?: any[];
	};

	/** LLM response metadata for debugging */
	responseMetadata?: {
		content?: any;
		finishReason?: string;
		usageMetadata?: any;
		functionCalls?: any[];
		functionResponses?: any[];
		toolName?: string;
		toolResult?: any;
		mergedFrom?: number;
	};

	constructor(data: Partial<LlmResponse> = {}) {
		Object.assign(this, data);
	}

	// Extract function calls from the response content (if any)
	getFunctionCalls(): any[] {
		const calls: any[] = [];
		const content: any = this.content as any;
		if (content && Array.isArray(content.parts)) {
			for (const part of content.parts) {
				if (part.functionCall) calls.push(part.functionCall);
			}
		}
		return calls;
	}

	// Extract function responses from the response content (if any)
	getFunctionResponses(): any[] {
		const responses: any[] = [];
		const content: any = this.content as any;
		if (content && Array.isArray(content.parts)) {
			for (const part of content.parts) {
				if (part.functionResponse) responses.push(part.functionResponse);
			}
		}
		return responses;
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
