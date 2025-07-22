import type { z } from "zod";

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
