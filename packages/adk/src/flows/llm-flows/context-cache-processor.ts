import { InvocationContext } from "../../agents/invocation-context";
import { Event } from "../../events/event";
import { CacheMetadata } from "../../models/cache-metadata";
import { LlmRequest } from "../../models/llm-request";
import { BaseLlmRequestProcessor } from "./base-llm-processor";

export class ContextCacheRequestProcessor extends BaseLlmRequestProcessor {
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
					event.cacheMetadata.cacheName !== undefined &&
					event.cacheMetadata.cacheName !== null;

				if (hasActiveCache) {
					// Different invocation with active cache → increment invocations_used
					cacheMetadata = event.cacheMetadata.copy({
						invocationsUsed: event.cacheMetadata.invocationsUsed + 1,
					});
				} else {
					// Same invocation or no active cache
					cacheMetadata = event.cacheMetadata.copy();
				}
			}

			// Look for previous prompt token count
			if (
				previousTokenCount === undefined &&
				event.usageMetadata?.promptTokenCount !== undefined
			) {
				previousTokenCount = event.usageMetadata.promptTokenCount;
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
