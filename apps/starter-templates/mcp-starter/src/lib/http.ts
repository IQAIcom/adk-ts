import type { z } from "zod";

/**
 * Custom error class for HTTP-related errors.
 *
 * Extends the standard Error class to include HTTP status codes and
 * optional response data for better error handling and debugging.
 */
export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly data?: unknown,
	) {
		super(message);
		this.name = "HttpError";
	}
}

/**
 * Utility function for making HTTP requests with JSON response parsing and validation.
 *
 * Performs a fetch request and automatically parses the JSON response.
 * Optionally validates the response data against a Zod schema for type safety.
 * Throws HttpError for non-OK responses and validation errors.
 *
 * @param url - URL to fetch from
 * @param options - Optional fetch configuration
 * @param schema - Optional Zod schema for response validation
 * @returns Promise resolving to parsed and validated JSON data
 * @throws HttpError for HTTP errors or validation failures
 */
export async function fetchJson<T>(
	url: string,
	options?: RequestInit,
	schema?: z.ZodType<T>,
): Promise<T> {
	const response = await fetch(url, options);

	if (!response.ok) {
		throw new HttpError(
			response.status,
			`HTTP error ${response.status}: ${response.statusText}`,
			await response.text().catch(() => undefined),
		);
	}

	const data = await response.json();

	if (schema) {
		try {
			return schema.parse(data);
		} catch (error) {
			throw new Error(
				`Invalid response data: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return data as T;
}
