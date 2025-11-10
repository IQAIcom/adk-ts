import crypto from "node:crypto";
import type {
	CachedContent,
	CreateCachedContentConfig,
	CreateCachedContentParameters,
	DeleteCachedContentParameters,
	Content as GoogleContent,
	GoogleGenAI,
	Tool as GoogleTool,
	ToolConfig as GoogleToolConfig,
} from "@google/genai";
import { LlmResponse as AdkLlmResponse } from "./llm-response";

export interface CacheConfig {
	ttlSeconds: number;
	ttlString: string;
	cacheIntervals: number;
	minTokens: number;
}

export interface ContentPart {
	text?: string;
	[key: string]: unknown;
}

export class LlmResponse extends AdkLlmResponse {
	cacheMetadata?: CacheMetadata;
}

export interface Content {
	role: string;
	parts: ContentPart[];
	modelDump?: () => Record<string, unknown>;
}

export interface LlmRequestConfig {
	systemInstruction?: string | null;
	tools?: GoogleTool[] | null;
	toolConfig?: GoogleToolConfig | null;
	cachedContent?: string | null;
}

export interface LlmRequest {
	config?: LlmRequestConfig;
	contents: Content[];
	cacheMetadata?: CacheMetadata;
	cacheConfig: CacheConfig;
	model: string;
	cacheableContentsTokenCount?: number | null;
}

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

	/**
	 * Creates a new cache manager
	 * @param genaiClient - GoogleGenAI instance for cache operations
	 */
	constructor(genaiClient: GoogleGenAI) {
		this.genaiClient = genaiClient;
	}

	/**
	 * Main cache handler for a request
	 */
	async handleContextCaching(
		llmRequest: LlmRequest,
	): Promise<CacheMetadata | null> {
		const cacheMeta = llmRequest.cacheMetadata;

		if (cacheMeta) {
			console.debug("Found existing cache metadata:", cacheMeta);
			if (await this.isCacheValid(llmRequest)) {
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
				console.debug("Cache invalid, cleaning up:", cacheMeta.cacheName);
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

	private async isCacheValid(llmRequest: LlmRequest): Promise<boolean> {
		const cache = llmRequest.cacheMetadata;
		if (!cache || !cache.cacheName) return false;

		const now = Date.now() / 1000; // seconds
		if (now >= cache.expireTime) {
			console.info("Cache expired:", cache.cacheName);
			return false;
		}

		if (cache.invocationsUsed > llmRequest.cacheConfig.cacheIntervals) {
			console.info("Cache exceeded intervals:", cache.cacheName);
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
		const data: Record<string, unknown> = {};
		if (llmRequest.config?.systemInstruction)
			data.systemInstruction = llmRequest.config.systemInstruction;
		if (llmRequest.config?.tools)
			data.tools = llmRequest.config.tools.map((t) => ({ ...t }));
		if (llmRequest.config?.toolConfig)
			data.toolConfig = { ...llmRequest.config.toolConfig };
		if (cacheContentsCount > 0 && llmRequest.contents.length > 0) {
			data.cachedContents = llmRequest.contents
				.slice(0, cacheContentsCount)
				.map((c) =>
					c.modelDump ? c.modelDump() : { role: c.role, parts: c.parts },
				);
		}

		const hash = crypto
			.createHash("sha256")
			.update(JSON.stringify(data, Object.keys(data).sort()))
			.digest("hex");

		return hash.slice(0, 16);
	}

	private async createNewCacheWithContents(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
	): Promise<CacheMetadata | null> {
		if (!llmRequest.cacheableContentsTokenCount) return null;
		if (
			llmRequest.cacheableContentsTokenCount < llmRequest.cacheConfig.minTokens
		)
			return null;

		try {
			return await this.createGeminiCache(llmRequest, cacheContentsCount);
		} catch (e) {
			console.warn("Failed to create cache:", e);
			return null;
		}
	}

	private async createGeminiCache(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
	): Promise<CacheMetadata> {
		const cacheContents = llmRequest.contents.slice(
			0,
			cacheContentsCount,
		) as unknown as GoogleContent[];

		const cacheConfig: CreateCachedContentConfig = {
			contents: cacheContents,
			ttl: llmRequest.cacheConfig.ttlString,
			displayName: `adk-cache-${Math.floor(Date.now() / 1000)}-${cacheContentsCount}contents`,
		};

		if (llmRequest.config?.systemInstruction) {
			cacheConfig.systemInstruction = llmRequest.config.systemInstruction;
		}
		if (llmRequest.config?.tools) {
			cacheConfig.tools = llmRequest.config.tools;
		}
		if (llmRequest.config?.toolConfig) {
			cacheConfig.toolConfig = llmRequest.config.toolConfig;
		}

		const params: CreateCachedContentParameters = {
			model: llmRequest.model,
			config: cacheConfig,
		};

		const cachedContent: CachedContent =
			await this.genaiClient.caches.create(params);
		const createdAt = Date.now() / 1000;
		console.info("Cache created successfully:", cachedContent.name);

		return new CacheMetadata({
			cacheName: cachedContent.name,
			expireTime: createdAt + llmRequest.cacheConfig.ttlSeconds,
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
		console.debug("Deleting cache:", cacheName);
		try {
			const params: DeleteCachedContentParameters = { name: cacheName };
			await this.genaiClient.caches.delete(params);
			console.info("Cache cleaned up:", cacheName);
		} catch (e) {
			console.warn("Failed to cleanup cache", cacheName, e);
		}
	}

	private applyCacheToRequest(
		llmRequest: LlmRequest,
		cacheName: string,
		cacheContentsCount: number,
	): void {
		if (llmRequest.config) {
			llmRequest.config.systemInstruction = null;
			llmRequest.config.tools = null;
			llmRequest.config.toolConfig = null;
			llmRequest.config.cachedContent = cacheName;
		}
		llmRequest.contents = llmRequest.contents.slice(cacheContentsCount);

		// Increment usage
		if (llmRequest.cacheMetadata) {
			llmRequest.cacheMetadata.invocationsUsed += 1;
		}
	}

	public populateCacheMetadataInResponse(
		llmResponse: LlmResponse,
		cacheMetadata: CacheMetadata,
	) {
		llmResponse.cacheMetadata = cacheMetadata.modelCopy();
	}
}
