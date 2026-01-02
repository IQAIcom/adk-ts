import crypto from "node:crypto";
import type { Logger } from "@adk/logger";
import type { GoogleGenAI } from "@google/genai";
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
		if (llmRequest.cacheMetadata) {
			this.logger.debug(
				"Found existing cache metadata:",
				llmRequest.cacheMetadata,
			);

			if (await this.isCacheValid(llmRequest)) {
				// Valid cache found - use it
				this.logger.debug(
					`Cache is valid, reusing cache: ${llmRequest.cacheMetadata.cacheName}`,
				);
				const cacheName = llmRequest.cacheMetadata.cacheName;
				const cacheContentsCount = llmRequest.cacheMetadata.contentsCount;

				if (cacheName) {
					this.applyCacheToRequest(llmRequest, cacheName, cacheContentsCount);
				}

				return llmRequest.cacheMetadata.copy();
			}

			// Invalid cache - clean it up and check if we should create new one
			const oldCacheMetadata = llmRequest.cacheMetadata;

			// Only cleanup if there's an active cache
			if (oldCacheMetadata.cacheName) {
				this.logger.debug(
					`Cache is invalid, cleaning up: ${oldCacheMetadata.cacheName}`,
				);
				await this.cleanupCache(oldCacheMetadata.cacheName);
			}

			// Calculate current fingerprint using contents count from old metadata
			const cacheContentsCount = oldCacheMetadata.contentsCount;
			const currentFingerprint = this.generateCacheFingerprint(
				llmRequest,
				cacheContentsCount,
			);

			// If fingerprints match, create new cache (expired but same content)
			if (currentFingerprint === oldCacheMetadata.fingerprint) {
				this.logger.debug(
					"Fingerprints match after invalidation, creating new cache",
				);
				const cacheMetadata = await this.createNewCacheWithContents(
					llmRequest,
					cacheContentsCount,
				);

				if (cacheMetadata?.cacheName) {
					this.applyCacheToRequest(
						llmRequest,
						cacheMetadata.cacheName,
						cacheContentsCount,
					);
					return cacheMetadata;
				}
			}

			// Fingerprints don't match - recalculate with total contents
			this.logger.debug(
				"Fingerprints don't match, returning fingerprint-only metadata",
			);
			const totalContentsCount = llmRequest.contents.length;
			const fingerprintForAll = this.generateCacheFingerprint(
				llmRequest,
				totalContentsCount,
			);

			return new CacheMetadata({
				fingerprint: fingerprintForAll,
				contentsCount: totalContentsCount,
				expireTime: 0,
				invocationsUsed: 0,
			});
		}

		// No existing cache metadata - attempt to create one immediately
		this.logger.debug(
			"No existing cache metadata, attempting to create new cache",
		);
		const totalContentsCount = llmRequest.contents.length;
		const fingerprint = this.generateCacheFingerprint(
			llmRequest,
			totalContentsCount,
		);

		const cacheMetadata = await this.createNewCacheWithContents(
			llmRequest,
			totalContentsCount,
		);

		if (cacheMetadata?.cacheName) {
			this.applyCacheToRequest(
				llmRequest,
				cacheMetadata.cacheName,
				totalContentsCount,
			);
			return cacheMetadata;
		}

		// Fallback to fingerprint-only metadata
		return new CacheMetadata({
			fingerprint,
			contentsCount: totalContentsCount,
			expireTime: 0,
			invocationsUsed: 0,
		});
	}

	private async isCacheValid(llmRequest: LlmRequest): Promise<boolean> {
		const cacheMetadata = llmRequest.cacheMetadata;
		this.logger.debug("Validating cache metadata", cacheMetadata);

		if (!cacheMetadata) {
			return false;
		}

		// Fingerprint-only metadata is not a valid active cache
		if (!cacheMetadata.cacheName) {
			return false;
		}

		// Check if cache has expired
		const now = Date.now() / 1000;
		if (now >= (cacheMetadata.expireTime ?? 0)) {
			this.logger.info(`Cache expired: ${cacheMetadata.cacheName}`);
			return false;
		}

		// Check if cache has been used for too many invocations
		if (!llmRequest.cacheConfig) {
			this.logger.warn("Missing cache config during validation");
			return false;
		}

		if (
			(cacheMetadata.invocationsUsed ?? 0) >
			llmRequest.cacheConfig.cacheIntervals
		) {
			this.logger.info(
				`Cache exceeded cache intervals: ${cacheMetadata.cacheName} (${cacheMetadata.invocationsUsed} > ${llmRequest.cacheConfig.cacheIntervals} intervals)`,
			);
			return false;
		}

		// Check if fingerprint matches using cached contents count
		const currentFingerprint = this.generateCacheFingerprint(
			llmRequest,
			cacheMetadata.contentsCount,
		);

		this.logger.debug("Current fingerprint:", currentFingerprint);
		this.logger.debug("Cached fingerprint:", cacheMetadata.fingerprint);

		if (currentFingerprint !== cacheMetadata.fingerprint) {
			this.logger.debug("Cache content fingerprint mismatch");
			return false;
		}

		return true;
	}

	private generateCacheFingerprint(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
	): string {
		const fingerprintData: Record<string, unknown> = {};

		if (llmRequest.config?.systemInstruction) {
			fingerprintData.system_instruction = llmRequest.config.systemInstruction;
		}

		if (llmRequest.config?.tools) {
			const toolsData = llmRequest.config.tools.map((tool: any) =>
				typeof tool.toJSON === "function" ? tool.toJSON() : tool,
			);
			fingerprintData.tools = toolsData;
		}

		if (llmRequest.config?.toolConfig) {
			fingerprintData.tool_config = llmRequest.config.toolConfig;
		}

		// Include first N contents in fingerprint
		if (cacheContentsCount > 0 && llmRequest.contents) {
			const contentsData = [];
			for (
				let i = 0;
				i < Math.min(cacheContentsCount, llmRequest.contents.length);
				i++
			) {
				const content = llmRequest.contents[i];
				contentsData.push(content);
			}
			fingerprintData.cached_contents = contentsData;
		}

		// Generate hash using string representation
		const fingerprintStr = JSON.stringify(fingerprintData);
		return crypto
			.createHash("sha256")
			.update(fingerprintStr)
			.digest("hex")
			.substring(0, 16);
	}

	private async createNewCacheWithContents(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
	): Promise<CacheMetadata | null> {
		if (!llmRequest.cacheConfig) {
			this.logger.warn("Missing cache config in createNewCacheWithContents");
			return null;
		}

		const minTokens = llmRequest.cacheConfig.minTokens;

		// Check if we have token count from previous response
		let tokenCount = llmRequest.cacheableContentsTokenCount;

		// If no previous token count, try to count tokens or check if minTokens is 0
		if (tokenCount === undefined) {
			if (minTokens === 0) {
				// If minTokens is 0, we can skip counting and proceed
				this.logger.debug(
					"No previous token count, but minTokens is 0, proceeding with cache creation",
				);
			} else {
				// Try to count tokens using the API
				this.logger.debug(
					"No previous token count, attempting to count tokens using API",
				);
				try {
					// We need to count tokens for the content we intend to cache
					// Note: This adds latency to the first request
					const countResult = await this.genaiClient.models.countTokens({
						model: llmRequest.model,
						contents: llmRequest.contents.slice(0, cacheContentsCount),
					});
					tokenCount = countResult.totalTokens;
					this.logger.debug(`Counted tokens: ${tokenCount}`);
				} catch (e) {
					this.logger.warn(
						"Failed to count tokens for cache decision, skipping cache creation:",
						e,
					);
					return null;
				}
			}
		}

		// Validate token count if we have one (or computed one)
		if (tokenCount !== undefined && tokenCount < minTokens) {
			this.logger.info(
				`Request too small for caching (${tokenCount} < ${minTokens} tokens)`,
			);
			return null;
		}

		try {
			return await this.createGeminiCache(llmRequest, cacheContentsCount);
		} catch (e) {
			this.logger.warn("Failed to create cache:", e);
			return null;
		}
	}

	private async createGeminiCache(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
	): Promise<CacheMetadata> {
		if (!llmRequest.cacheConfig) {
			throw new Error("Cache config is required to create cache");
		}

		// Prepare cache contents (first N contents + system instruction + tools)
		const cacheContents = llmRequest.contents.slice(0, cacheContentsCount);

		const cacheConfig: any = {
			contents: cacheContents,
			ttl: llmRequest.cacheConfig.ttlString,
			displayName: `adk-cache-${Math.floor(Date.now() / 1000)}-${cacheContentsCount}contents`,
		};

		// Add system instruction if present
		if (llmRequest.config?.systemInstruction) {
			cacheConfig.systemInstruction = llmRequest.config.systemInstruction;
			this.logger.debug(
				`Added system instruction to cache config (length=${llmRequest.config.systemInstruction.toString().length})`,
			);
		}

		// Add tools if present
		if (llmRequest.config?.tools) {
			cacheConfig.tools = llmRequest.config.tools;
		}

		// Add tool config if present
		if (llmRequest.config?.toolConfig) {
			cacheConfig.toolConfig = llmRequest.config.toolConfig;
		}

		this.logger.debug(
			`Creating cache with model ${llmRequest.model} and config:`,
			cacheConfig,
		);

		const cachedContent = await this.genaiClient.caches.create({
			model: llmRequest.model,
			config: cacheConfig,
		});

		this.logger.debug("Cache created successfully:", cachedContent);

		// Set precise creation timestamp right after cache creation
		const createdAt = Date.now() / 1000;
		this.logger.info(`Cache created successfully: ${cachedContent.name}`);

		// Return complete cache metadata with precise timing
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

	async cleanupCache(cacheName: string): Promise<void> {
		this.logger.debug(`Attempting to delete cache: ${cacheName}`);
		try {
			await this.genaiClient.caches.delete({ name: cacheName });
			this.logger.info(`Cache cleaned up: ${cacheName}`);
		} catch (e) {
			this.logger.warn(`Failed to cleanup cache ${cacheName}:`, e);
		}
	}

	private applyCacheToRequest(
		llmRequest: LlmRequest,
		cacheName: string,
		cacheContentsCount: number,
	): void {
		// Clear system instruction, tools, and toolConfig as they're in the cache
		if (llmRequest.config) {
			llmRequest.config.systemInstruction = undefined;
			llmRequest.config.tools = undefined;
			llmRequest.config.toolConfig = undefined;
		}

		// Set cached content reference
		if (!llmRequest.config) {
			llmRequest.config = {};
		}

		this.logger.debug("Setting cached content reference:", cacheName);

		llmRequest.config.cachedContent = cacheName;

		// Remove cached contents from the request
		llmRequest.contents = llmRequest.contents.slice(cacheContentsCount);
	}

	public populateCacheMetadataInResponse(
		llmResponse: LlmResponse,
		cacheMetadata: CacheMetadata,
	) {
		llmResponse.cacheMetadata = cacheMetadata.copy();
	}
}
