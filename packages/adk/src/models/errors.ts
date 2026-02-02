/**
 * LLM error classes for rate limit handling across all providers.
 */

export interface LlmErrorOptions {
	model?: string;
	provider?: string;
	originalError?: Error;
}

/**
 * Shape of errors from LLM providers (OpenAI, Anthropic, Google, etc.)
 */
interface ProviderError {
	message?: string;
	status?: number;
	code?: number;
	statusCode?: number;
	type?: string;
	name?: string;
	headers?: Record<string, string> | { get?: (key: string) => string | null };
	response?: { headers?: Record<string, string> };
	error?: { type?: string; headers?: Record<string, string> };
}

/**
 * Base class for LLM-related errors
 */
export class LlmError extends Error {
	readonly model?: string;
	readonly provider?: string;
	readonly originalError?: Error;

	constructor(message: string, options: LlmErrorOptions = {}) {
		super(message);
		this.name = "LlmError";
		this.model = options.model;
		this.provider = options.provider;
		this.originalError = options.originalError;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

/**
 * Rate limit error (429) with retry metadata.
 * Thrown when the LLM provider's rate limit is exceeded.
 */
export class RateLimitError extends LlmError {
	readonly code = 429;

	constructor(message: string, options: LlmErrorOptions = {}) {
		super(message, options);
		this.name = "RateLimitError";
	}

	/**
	 * Create a RateLimitError from a provider-specific error
	 */
	static fromError(
		originalError: unknown,
		provider: string,
		model?: string,
	): RateLimitError {
		const err = originalError as ProviderError | undefined;
		const message = err?.message || String(originalError);

		return new RateLimitError(message, {
			model,
			provider,
			originalError: originalError instanceof Error ? originalError : undefined,
		});
	}

	/**
	 * Check if an error is a rate limit error (works with any provider's error)
	 */
	static isRateLimitError(error: unknown): boolean {
		if (error instanceof RateLimitError) return true;

		if (error && typeof error === "object") {
			const err = error as ProviderError;

			// Check status code
			if (err.status === 429 || err.code === 429 || err.statusCode === 429) {
				return true;
			}

			// Check error type/name
			if (
				err.type === "rate_limit_error" ||
				err.name === "RateLimitError" ||
				err.error?.type === "rate_limit_error"
			) {
				return true;
			}

			// Check message patterns
			const message = err.message?.toLowerCase() || "";
			if (
				message.includes("rate limit") ||
				message.includes("rate_limit") ||
				message.includes("too many requests") ||
				message.includes("resource exhausted") ||
				message.includes("quota exceeded")
			) {
				return true;
			}
		}

		return false;
	}
}
