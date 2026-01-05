import { Logger } from "@adk/logger";
import type { InvocationContext } from "../../agents/invocation-context";
import type { Event } from "../../events/event";
import { CacheMetadata } from "../../models/cache-metadata";
import type { LlmRequest } from "../../models/llm-request";
import { BaseLlmRequestProcessor } from "./base-llm-processor";

export class ContextCacheRequestProcessor extends BaseLlmRequestProcessor {
	protected readonly logger: Logger;

	constructor() {
		super();
		this.logger = new Logger({ name: "ContextCacheRequestProcessor" });
	}

	private async *emptyGenerator(): AsyncGenerator<Event, void, unknown> {}

	async *runAsync(
		invocationContext: InvocationContext,
		llmRequest: LlmRequest,
	): AsyncGenerator<Event, void, unknown> {
		const agent = invocationContext.agent;

		if (invocationContext.contextCacheConfig) {
			llmRequest.cacheConfig = invocationContext.contextCacheConfig;

			const [latestCacheMetadata, previousTokenCount] =
				this.findCacheInfoFromEvents(
					invocationContext,
					agent.name,
					invocationContext.invocationId,
				);

			if (latestCacheMetadata) {
				llmRequest.cacheMetadata = latestCacheMetadata;
				this.logger.debug(
					`Found previous cache metadata: ${latestCacheMetadata.cacheName || "fingerprint-only"}`,
				);
			} else {
				this.logger.debug(
					"No previous cache metadata found, will attempt fresh cache creation",
				);
			}

			if (previousTokenCount !== undefined) {
				llmRequest.cacheableContentsTokenCount = previousTokenCount;
			}
		}

		yield* this.emptyGenerator();
	}

	/**
	 * Find cache metadata and previous token count from session events.
	 */
	private findCacheInfoFromEvents(
		invocationContext: InvocationContext,
		agentName: string,
		currentInvocationId: string,
	): [CacheMetadata | undefined, number | undefined] {
		const events = invocationContext.session?.events;
		if (!events || events.length === 0) {
			return [undefined, undefined];
		}

		let cacheMetadata: CacheMetadata | undefined;
		let previousTokenCount: number | undefined;

		// Traverse events from most recent to oldest
		for (let i = events.length - 1; i >= 0; i--) {
			const event = events[i];

			if (event.author !== agentName) {
				continue;
			}

			// Look for cache metadata
			if (!cacheMetadata && event.cacheMetadata) {
				const hasActiveCache =
					event.invocationId &&
					event.invocationId !== currentInvocationId &&
					event.cacheMetadata.cacheName != null;

				// Handle both CacheMetadata instances and plain objects (from deserialization)
				const sourceMeta = event.cacheMetadata;
				if (typeof sourceMeta.copy === "function") {
					// It's a CacheMetadata instance
					cacheMetadata = hasActiveCache
						? sourceMeta.copy({
								invocationsUsed: (sourceMeta.invocationsUsed || 0) + 1,
							})
						: sourceMeta.copy();
				} else {
					// It's a plain object, reconstruct as CacheMetadata
					const meta = new CacheMetadata({
						cacheName: sourceMeta.cacheName ?? undefined,
						expireTime: sourceMeta.expireTime ?? undefined,
						fingerprint: sourceMeta.fingerprint,
						invocationsUsed: hasActiveCache
							? (sourceMeta.invocationsUsed || 0) + 1
							: (sourceMeta.invocationsUsed ?? undefined),
						contentsCount: sourceMeta.contentsCount,
						createdAt: sourceMeta.createdAt ?? undefined,
					});
					cacheMetadata = meta;
				}
			}

			// Look for previous prompt token count
			if (
				previousTokenCount === undefined &&
				event.usageMetadata?.promptTokenCount !== undefined
			) {
				this.logger.debug(
					`Found previous token count in event ${i}: ${event.usageMetadata.promptTokenCount}`,
				);
				previousTokenCount = event.usageMetadata.promptTokenCount;
			} else if (previousTokenCount === undefined) {
				this.logger.debug(
					`No usage metadata in event ${i} (author=${event.author})`,
				);
			}

			// Stop early if both found
			if (cacheMetadata && previousTokenCount !== undefined) {
				break;
			}
		}

		return [cacheMetadata, previousTokenCount];
	}
}

export const requestProcessor = new ContextCacheRequestProcessor();
