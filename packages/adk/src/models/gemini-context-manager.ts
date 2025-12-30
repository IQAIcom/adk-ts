import crypto from "node:crypto";
import type { ContextCacheConfig } from "@adk/agents/context-cache-config";
import type { Logger } from "@adk/logger";
import type {
	CachedContent,
	CreateCachedContentConfig,
	CreateCachedContentParameters,
	DeleteCachedContentParameters,
	GoogleGenAI,
	Tool,
} from "@google/genai";
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

		const cacheMeta = llmRequest.cacheMetadata;

		if (cacheMeta) {
			this.logger.debug("Found existing cache metadata:", cacheMeta);
			if (await this.isCacheValid(llmRequest, cacheConfig)) {
				const updatedMeta = cacheMeta.copy({
					invocationsUsed: (cacheMeta.invocationsUsed ?? 0) + 1,
				});
				const cacheName = updatedMeta.cacheName;
				const contentsCount = updatedMeta.contentsCount;
				if (cacheName) {
					this.applyCacheToRequest(llmRequest, cacheName, contentsCount);
				}
				return updatedMeta;
			}

			if (cacheMeta.cacheName) {
				this.logger.debug("Cache invalid, cleaning up:", cacheMeta.cacheName);
				await this.cleanupCache(cacheMeta.cacheName);
			}

			const currentFingerprint = this.generateCacheFingerprint(
				llmRequest,
				cacheMeta.contentsCount,
			);

			if (currentFingerprint === cacheMeta.fingerprint) {
				const newCache = await this.createNewCacheWithContents(
					llmRequest,
					cacheMeta.contentsCount,
					cacheConfig,
				);
				if (newCache) {
					this.applyCacheToRequest(
						llmRequest,
						newCache.cacheName!,
						newCache.contentsCount,
					);
					return newCache;
				}
			}

			const totalContents = llmRequest.contents.length;
			const fingerprintForAll = this.generateCacheFingerprint(
				llmRequest,
				totalContents,
			);
			return new CacheMetadata({
				fingerprint: fingerprintForAll,
				contentsCount: totalContents,
				expireTime: 0,
				invocationsUsed: 0,
			});
		}

		const totalContents = llmRequest.contents.length;
		const fingerprint = this.generateCacheFingerprint(
			llmRequest,
			totalContents,
		);
		return new CacheMetadata({
			fingerprint,
			contentsCount: totalContents,
			expireTime: 0,
			invocationsUsed: 0,
		});
	}

	private async isCacheValid(
		llmRequest: LlmRequest,
		cacheConfig: ContextCacheConfig,
	): Promise<boolean> {
		const cache = llmRequest.cacheMetadata;
		if (!cache || !cache.cacheName) return false;

		const now = Date.now() / 1000;
		const expireTime = cache.expireTime ?? 0;
		if (now >= expireTime) {
			this.logger.info("Cache expired:", cache.cacheName);
			return false;
		}

		const invocationsUsed = cache.invocationsUsed ?? 0;
		if (invocationsUsed >= cacheConfig.cacheIntervals) {
			this.logger.info("Cache exceeded intervals:", cache.cacheName);
			return false;
		}

		const currentFingerprint = this.generateCacheFingerprint(
			llmRequest,
			cache.contentsCount,
		);
		return currentFingerprint === cache.fingerprint;
	}

	private generateCacheFingerprint(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
	): string {
		const seen = new WeakSet();

		function canonicalize(value: unknown): unknown {
			if (value && typeof value === "object") {
				if (seen.has(value as object)) return "[Circular]";
				seen.add(value as object);
			}

			if (value === undefined) return null;
			if (typeof value === "bigint") return value.toString();
			if (value instanceof Date) return value.toISOString();

			if (Array.isArray(value)) {
				return value.map(canonicalize);
			}

			if (value instanceof Map) {
				// Sort Map entries by key for determinism
				return Array.from(value.entries())
					.sort(([a], [b]) => (a > b ? 1 : -1))
					.map(([k, v]) => [k, canonicalize(v)]);
			}

			if (value instanceof Set) {
				// Sort set values for deterministic order
				return Array.from(value.values())
					.map(canonicalize)
					.sort((a, b) => (JSON.stringify(a) > JSON.stringify(b) ? 1 : -1));
			}

			if (value && typeof value === "object") {
				const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
				const result: Record<string, unknown> = {};
				for (const key of sortedKeys) {
					result[key] = canonicalize((value as Record<string, unknown>)[key]);
				}
				return result;
			}

			return value;
		}

		const data: Record<string, unknown> = {};

		if (llmRequest.config?.systemInstruction)
			data.systemInstruction = llmRequest.config.systemInstruction;

		if (llmRequest.config?.tools)
			data.tools = llmRequest.config.tools.map((t) => canonicalize(t));

		if (llmRequest.config?.toolConfig)
			data.toolConfig = canonicalize(llmRequest.config.toolConfig);

		if (cacheContentsCount > 0 && llmRequest.contents.length > 0) {
			data.cachedContents = llmRequest.contents
				.slice(0, cacheContentsCount)
				.map((c) => canonicalize({ role: c.role, parts: c.parts }));
		}

		const canonicalData = canonicalize(data);
		const json = JSON.stringify(canonicalData);
		const hash = crypto.createHash("sha256").update(json).digest("hex");

		return hash;
	}

	private async createNewCacheWithContents(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
		cacheConfig: ContextCacheConfig,
	): Promise<CacheMetadata | null> {
		if (!llmRequest.cacheableContentsTokenCount) return null;
		if (llmRequest.cacheableContentsTokenCount < cacheConfig.minTokens)
			return null;

		try {
			return await this.createGeminiCache(
				llmRequest,
				cacheContentsCount,
				cacheConfig,
			);
		} catch (e) {
			this.logger.warn("Failed to create cache:", e);
			return null;
		}
	}

	private async createGeminiCache(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
		cacheConfig: ContextCacheConfig,
	): Promise<CacheMetadata> {
		const cacheContents = llmRequest.contents.slice(0, cacheContentsCount);
		const model = llmRequest.model;

		if (!model) {
			throw new Error("Model name is required to create a Gemini cache.");
		}

		console.log("Creating cache with contents:", cacheContents);
		const createCacheConfig: CreateCachedContentConfig = {
			contents: cacheContents,
			ttl: cacheConfig.ttlString,
			displayName: `adk-cache-${Math.floor(Date.now() / 1000)}-${cacheContentsCount}contents`,
		};

		if (llmRequest.config?.systemInstruction) {
			createCacheConfig.systemInstruction = llmRequest.config.systemInstruction;
		}

		if (llmRequest.config?.tools) {
			createCacheConfig.tools = llmRequest.config.tools as unknown as Tool[];
		}

		if (llmRequest.config?.toolConfig) {
			createCacheConfig.toolConfig = llmRequest.config.toolConfig;
		}

		const params: CreateCachedContentParameters = {
			model,
			config: createCacheConfig,
		};

		const cachedContent: CachedContent =
			await this.genaiClient.caches.create(params);
		const createdAt = Date.now() / 1000;
		this.logger.info("Cache created successfully:", cachedContent.name);

		return new CacheMetadata({
			cacheName: cachedContent.name,
			expireTime: createdAt + cacheConfig.ttlSeconds,
			fingerprint: this.generateCacheFingerprint(
				llmRequest,
				cacheContentsCount,
			),
			invocationsUsed: 1,
			contentsCount: cacheContentsCount,
			createdAt,
		});
	}

	private async cleanupCache(cacheName: string): Promise<void> {
		this.logger.debug("Deleting cache:", cacheName);
		try {
			const params: DeleteCachedContentParameters = { name: cacheName };
			await this.genaiClient.caches.delete(params);
			this.logger.info("Cache cleaned up:", cacheName);
		} catch (e) {
			this.logger.warn("Failed to cleanup cache", cacheName, e);
		}
	}

	private applyCacheToRequest(
		llmRequest: LlmRequest,
		cacheName: string,
		cacheContentsCount: number,
	): void {
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
	): void {
		llmResponse.cacheMetadata = cacheMetadata.copy();
	}
}
