import crypto from "node:crypto";
import type { ContextCacheConfig } from "@adk/agents/context-cache-config";
import type { Logger } from "@adk/logger";
import type { Content, GoogleGenAI } from "@google/genai";
import { CacheMetadata } from "./cache-metadata";
import type { LlmRequest } from "./llm-request";
import type { LlmResponse } from "./llm-response";

export class GeminiContextCacheManager {
	private readonly genaiClient: GoogleGenAI;
	private readonly logger: Logger;

	constructor(genaiClient: GoogleGenAI, logger: Logger) {
		this.genaiClient = genaiClient;
		this.logger = logger;
	}

	async handleContextCaching(
		llmRequest: LlmRequest,
	): Promise<CacheMetadata | null> {
		const cacheConfig = llmRequest.contextCacheConfig;
		if (!cacheConfig) return null;

		const contentsForFingerprint = this.convertContentsForFingerprint(
			llmRequest.contents || [],
		);
		const cacheMeta = llmRequest.cacheMetadata;

		if (cacheMeta) {
			this.logger.debug("Found existing cache metadata:", cacheMeta);

			if (
				await this.isCacheValid(llmRequest, cacheConfig, contentsForFingerprint)
			) {
				const updatedMeta = cacheMeta.copy({
					invocationsUsed: (cacheMeta.invocationsUsed ?? 0) + 1,
				});
				if (updatedMeta.cacheName) {
					this.applyCacheToRequest(
						llmRequest,
						updatedMeta.cacheName,
						updatedMeta.contentsCount,
					);
				}
				return updatedMeta;
			}

			if (cacheMeta.cacheName) {
				await this.cleanupCache(cacheMeta.cacheName);
			}
		}

		const totalContents = llmRequest.contents.length;
		const fingerprint = this.generateCacheFingerprint(
			llmRequest,
			totalContents,
			contentsForFingerprint,
		);

		return new CacheMetadata({
			fingerprint,
			contentsCount: totalContents,
			expireTime: 0,
			invocationsUsed: 0,
		});
	}

	private convertContentsForFingerprint(contents: any[]): Content[] {
		return contents.map((content) => ({
			role: content.role === "assistant" ? "model" : content.role,
			parts: content.parts || [{ text: content.content || "" }],
		}));
	}

	private async isCacheValid(
		llmRequest: LlmRequest,
		cacheConfig: ContextCacheConfig,
		contentsForFingerprint: Content[],
	): Promise<boolean> {
		const cache = llmRequest.cacheMetadata;
		if (!cache || !cache.cacheName) return false;

		const now = Date.now() / 1000;
		if ((cache.expireTime ?? 0) <= now) return false;
		if ((cache.invocationsUsed ?? 0) >= cacheConfig.cacheIntervals)
			return false;

		const currentFingerprint = this.generateCacheFingerprint(
			llmRequest,
			cache.contentsCount,
			contentsForFingerprint,
		);
		return currentFingerprint === cache.fingerprint;
	}

	private generateCacheFingerprint(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
		contentsForFingerprint: Content[],
	): string {
		const data: Record<string, unknown> = {};
		if (llmRequest.config?.systemInstruction)
			data.systemInstruction = llmRequest.config.systemInstruction;
		if (llmRequest.config?.tools) data.tools = llmRequest.config.tools;
		if (llmRequest.config?.toolConfig)
			data.toolConfig = llmRequest.config.toolConfig;

		if (cacheContentsCount > 0 && contentsForFingerprint.length > 0) {
			data.cachedContents = contentsForFingerprint.slice(0, cacheContentsCount);
		}

		const json = JSON.stringify(data);
		return crypto.createHash("sha256").update(json).digest("hex");
	}

	private async cleanupCache(cacheName: string): Promise<void> {
		try {
			await this.genaiClient.caches.delete({ name: cacheName });
			this.logger.info("Cache cleaned up:", cacheName);
		} catch (e) {
			this.logger.warn("Failed to cleanup cache:", cacheName, e);
		}
	}

	private applyCacheToRequest(
		llmRequest: LlmRequest,
		cacheName: string,
		cacheContentsCount: number,
	) {
		llmRequest.config = {
			...llmRequest.config,
			systemInstruction: undefined,
			tools: undefined,
			toolConfig: undefined,
			cachedContent: cacheName,
		};
		llmRequest.contents = llmRequest.contents.slice(cacheContentsCount);
	}

	public populateCacheMetadataInResponse(
		llmResponse: LlmResponse,
		cacheMetadata: CacheMetadata,
	) {
		llmResponse.cacheMetadata = cacheMetadata.copy();
	}
}
