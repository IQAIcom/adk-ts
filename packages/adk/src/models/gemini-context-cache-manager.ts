import crypto from "node:crypto";
import type { ContextCacheConfig } from "@adk/agents/context-cache-config";
import { Logger } from "@adk/logger";
import type {
	CachedContent,
	CreateCachedContentConfig,
	CreateCachedContentParameters,
	DeleteCachedContentParameters,
	GoogleGenAI,
} from "@google/genai";
import type { LlmRequest } from "./llm-request";
import type { LlmResponse } from "./llm-response";

export class CacheMetadata {
	cacheName?: string;
	expireTime: number;
	fingerprint: string;
	invocationsUsed: number;
	contentsCount: number;
	createdAt?: number;

	constructor(params: Partial<CacheMetadata>) {
		this.cacheName = params.cacheName;
		this.expireTime = params.expireTime ?? 0;
		this.fingerprint = params.fingerprint ?? "";
		this.invocationsUsed = params.invocationsUsed ?? 0;
		this.contentsCount = params.contentsCount ?? 0;
		this.createdAt = params.createdAt;
	}

	modelCopy(): CacheMetadata {
		return new CacheMetadata({ ...this });
	}
}

/**
 * Manages context caching for Gemini models with type-safe operations
 */
export class GeminiContextCacheManager {
	private readonly genaiClient: GoogleGenAI;
	private readonly logger: Logger;
	private readonly MAX_HASH_LENGTH = 32;
	private readonly MIN_HASH_LENGTH = 0;

	/**
	 * Creates a new cache manager
	 * @param genaiClient - GoogleGenAI instance for cache operations
	 */
	constructor(genaiClient: GoogleGenAI, logger: Logger) {
		this.genaiClient = genaiClient;
		this.logger = logger;
	}

	/**
	 * Main cache handler for a request
	 */
	async handleContextCaching(
		llmRequest: LlmRequest,
	): Promise<CacheMetadata | null> {
		// Type assertion for cache config
		const cacheConfig = llmRequest.cacheConfig;
		if (!cacheConfig) return null;

		const cacheMeta = llmRequest.cacheMetadata;

		if (cacheMeta) {
			this.logger.debug("Found existing cache metadata:", cacheMeta);
			if (await this.isCacheValid(llmRequest, cacheConfig)) {
				// Increment usage count
				cacheMeta.invocationsUsed += 1;
				const cacheName = cacheMeta.cacheName;
				const contentsCount = cacheMeta.contentsCount;
				if (cacheName) {
					this.applyCacheToRequest(llmRequest, cacheName, contentsCount);
				}
				return cacheMeta.modelCopy();
			}

			// Cleanup old cache
			if (cacheMeta.cacheName) {
				this.logger.debug("Cache invalid, cleaning up:", cacheMeta.cacheName);
				await this.cleanupCache(cacheMeta.cacheName);
			}

			const currentFingerprint = this.generateCacheFingerprint(
				llmRequest,
				cacheMeta.contentsCount,
			);

			// Fingerprints match after invalidation -> create new cache
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

			// Fingerprints don't match -> return fingerprint-only metadata
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

		// No existing cache -> return fingerprint-only metadata
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

		const now = Date.now() / 1000; // seconds
		if (now >= cache.expireTime) {
			this.logger.info("Cache expired:", cache.cacheName);
			return false;
		}

		if (cache.invocationsUsed >= cacheConfig.cacheIntervals) {
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

		function canonicalize(value: unknown) {
			// Avoid circular references
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

		return hash.slice(this.MIN_HASH_LENGTH, this.MAX_HASH_LENGTH);
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

		const createCacheConfig: CreateCachedContentConfig = {
			contents: cacheContents,
			ttl: cacheConfig.ttlString,
			displayName: `adk-cache-${Math.floor(Date.now() / 1000)}-${cacheContentsCount}contents`,
		};

		if (llmRequest.config?.systemInstruction) {
			createCacheConfig.systemInstruction = llmRequest.config.systemInstruction;
		}

		if (llmRequest.config?.tools) {
			createCacheConfig.tools = llmRequest.config.tools;
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
		llmResponse.cacheMetadata = cacheMetadata.modelCopy();
	}
}
