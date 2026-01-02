import { z } from "zod";

/**
 * Configuration for context caching across all agents in an app.
 *
 * This configuration enables and controls context caching behavior for
 * all LLM agents in an app. When this config is present on an app, context
 * caching is enabled for all agents. When absent (null), context caching
 * is disabled.
 *
 * Context caching can significantly reduce costs and improve response times
 * by reusing previously processed context across multiple requests.
 */
export class ContextCacheConfig implements ContextCacheConfigProps {
	/** Maximum number of invocations to reuse the same cache before refreshing it. */
	public cacheIntervals: number;

	/** Time-to-live for cache in seconds. */
	public ttlSeconds: number;

	/** Minimum estimated request tokens required to enable caching. */
	public minTokens: number;

	constructor(params: Partial<ContextCacheConfigProps> = {}) {
		const validated = contextCacheConfigSchema.parse(params);
		this.cacheIntervals = validated.cacheIntervals;
		this.ttlSeconds = validated.ttlSeconds;
		this.minTokens = validated.minTokens;
	}

	get ttlString() {
		return `${this.ttlSeconds}s`;
	}

	toJSON() {
		return {
			cacheIntervals: this.cacheIntervals,
			ttlSeconds: this.ttlSeconds,
			minTokens: this.minTokens,
		};
	}
}

export const contextCacheConfigSchema = z.object({
	/**
	 * Maximum number of invocations to reuse the same cache before refreshing it.
	 * Must be between 1 and 100.
	 *
	 * @default 10
	 */
	cacheIntervals: z
		.number()
		.int()
		.min(1, { message: "cacheIntervals must be at least 1." })
		.max(100, { message: "cacheIntervals must not exceed 100." })
		.default(10),

	/**
	 * Time-to-live for cache in seconds. Must be greater than 0.
	 * Default: 1800 (30 minutes).
	 *
	 * @default 1800
	 */
	ttlSeconds: z
		.number()
		.int()
		.positive({ message: "ttlSeconds must be greater than 0." })
		.default(1800),

	/**
	 * Minimum estimated request tokens required to enable caching.
	 * Set higher to avoid caching small requests where overhead may exceed benefits.
	 *
	 * @default 0
	 */
	minTokens: z
		.number()
		.int()
		.min(0, { message: "minTokens must be non-negative." })
		.default(0),
});

export type ContextCacheConfigProps = z.infer<typeof contextCacheConfigSchema>;
