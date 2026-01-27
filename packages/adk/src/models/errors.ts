/**
 * Shared LLM error classes for consistent error handling across all providers.
 */

export enum LlmErrorType {
	RATE_LIMIT = "RATE_LIMIT",
	SERVER_ERROR = "SERVER_ERROR",
	CONTEXT_LENGTH = "CONTEXT_LENGTH",
	AUTHENTICATION = "AUTHENTICATION",
	INVALID_REQUEST = "INVALID_REQUEST",
	TIMEOUT = "TIMEOUT",
	NETWORK = "NETWORK",
	UNKNOWN = "UNKNOWN",
}

export interface LlmErrorOptions {
	model?: string;
	provider?: string;
	originalError?: Error;
	retryAfterMs?: number;
	statusCode?: number;
}

/**
 * Base class for all LLM-related errors
 */
export class LlmError extends Error {
	readonly errorType: LlmErrorType;
	readonly model?: string;
	readonly provider?: string;
	readonly originalError?: Error;
	readonly timestamp: Date;

	constructor(
		message: string,
		errorType: LlmErrorType = LlmErrorType.UNKNOWN,
		options: LlmErrorOptions = {},
	) {
		super(message);
		this.name = "LlmError";
		this.errorType = errorType;
		this.model = options.model;
		this.provider = options.provider;
		this.originalError = options.originalError;
		this.timestamp = new Date();

		// Maintain proper stack trace
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
	readonly retryAfterMs?: number;
	readonly details?: any;

	constructor(
		message: string,
		options: LlmErrorOptions & { details?: any } = {},
	) {
		const enhancedMessage = `Rate limit exceeded. ${message}\n\nTo mitigate this issue:\n- Implement exponential backoff\n- Reduce request frequency\n- Consider using a fallback model`;

		super(enhancedMessage, LlmErrorType.RATE_LIMIT, options);
		this.name = "RateLimitError";
		this.retryAfterMs = options.retryAfterMs;
		this.details = options.details;
	}

	/**
	 * Create a RateLimitError from a provider-specific error
	 */
	static fromError(
		originalError: any,
		provider: string,
		model?: string,
	): RateLimitError {
		const message = originalError?.message || String(originalError);
		const retryAfterMs = RateLimitError.extractRetryAfter(originalError);

		return new RateLimitError(message, {
			model,
			provider,
			originalError,
			retryAfterMs,
			details: originalError?.details,
		});
	}

	/**
	 * Extract retry-after value from error headers (in milliseconds)
	 */
	static extractRetryAfter(error: any): number | undefined {
		// Check various header locations
		const headers =
			error?.headers || error?.response?.headers || error?.error?.headers;

		if (!headers) return undefined;

		// Headers might be a Headers object or plain object
		const retryAfter =
			headers.get?.("retry-after") ||
			headers["retry-after"] ||
			headers["Retry-After"];

		if (!retryAfter) return undefined;

		const value = Number(retryAfter);
		if (!Number.isNaN(value)) {
			// Value is in seconds, convert to ms
			return value * 1000;
		}

		// Could be a date string
		const date = Date.parse(retryAfter);
		if (!Number.isNaN(date)) {
			return Math.max(0, date - Date.now());
		}

		return undefined;
	}
}

/**
 * Server error (5xx) from the LLM provider
 */
export class ServerError extends LlmError {
	readonly statusCode: number;

	constructor(
		message: string,
		statusCode: number,
		options: LlmErrorOptions = {},
	) {
		super(message, LlmErrorType.SERVER_ERROR, options);
		this.name = "ServerError";
		this.statusCode = statusCode;
	}
}

/**
 * Context length exceeded error
 */
export class ContextLengthError extends LlmError {
	readonly maxTokens?: number;
	readonly requestedTokens?: number;

	constructor(
		message: string,
		options: LlmErrorOptions & {
			maxTokens?: number;
			requestedTokens?: number;
		} = {},
	) {
		super(message, LlmErrorType.CONTEXT_LENGTH, options);
		this.name = "ContextLengthError";
		this.maxTokens = options.maxTokens;
		this.requestedTokens = options.requestedTokens;
	}
}

/**
 * Authentication error (401/403)
 */
export class AuthenticationError extends LlmError {
	constructor(message: string, options: LlmErrorOptions = {}) {
		super(message, LlmErrorType.AUTHENTICATION, options);
		this.name = "AuthenticationError";
	}
}

/**
 * Check if an error is a rate limit error (works with any provider's error)
 */
export function isRateLimitError(error: unknown): boolean {
	if (error instanceof RateLimitError) return true;

	if (error && typeof error === "object") {
		const err = error as any;

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

/**
 * Check if an error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
	if (error instanceof ServerError) return true;

	if (error && typeof error === "object") {
		const err = error as any;
		const status = err.status || err.code || err.statusCode;
		return typeof status === "number" && status >= 500 && status < 600;
	}

	return false;
}
