import crypto from "node:crypto";
import type { Logger } from "@adk/logger";
import type { GoogleGenAI } from "@google/genai";
import { CacheMetadata } from "./cache-metadata";
import type { LlmRequest } from "./llm-request";
import type { LlmResponse } from "./llm-response";

const CacheLimits = {
	GOOGLE_MIN_TOKENS: 1024,
};

const Fingerprint = {
	ALGORITHM: "sha256" as const,
	LENGTH: 16,
};

const Time = {
	MS_TO_SECONDS: 1 / 1000,
};

const CacheDefaults = {
	EXPIRE_TIME: 0,
	INVOCATIONS_USED: 0,
	INITIAL_INVOCATIONS_USED: 1,
};

const nowInSeconds = (): number => Date.now() * Time.MS_TO_SECONDS;

export class ContextCacheManager {
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
				this.logger.debug(
					`Cache is valid, reusing cache: ${llmRequest.cacheMetadata.cacheName}`,
				);

				const cacheName = llmRequest.cacheMetadata.cacheName;
				const cacheContentsCount = llmRequest.cacheMetadata.contentsCount;

				if (cacheName) {
					this.applyCacheToRequest(llmRequest, cacheName, cacheContentsCount);
					console.log(
						`✓ Cache HIT: Using cached context (${cacheContentsCount} messages)`,
					);
				}

				return llmRequest.cacheMetadata.copy();
			}

			// Invalid cache — cleanup
			const oldCacheMetadata = llmRequest.cacheMetadata;

			if (oldCacheMetadata.cacheName) {
				this.logger.debug(
					`Cache is invalid, cleaning up: ${oldCacheMetadata.cacheName}`,
				);
				await this.cleanupCache(oldCacheMetadata.cacheName);
			}

			// Recalculate fingerprint using old cached content count
			const cacheContentsCount = oldCacheMetadata.contentsCount;
			const currentFingerprint = this.generateCacheFingerprint(
				llmRequest,
				cacheContentsCount,
			);

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

			// Fingerprints differ — fallback to fingerprint-only metadata
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
				expireTime: CacheDefaults.EXPIRE_TIME,
				invocationsUsed: CacheDefaults.INVOCATIONS_USED,
			});
		}

		// No existing cache metadata
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

		return new CacheMetadata({
			fingerprint,
			contentsCount: totalContentsCount,
			expireTime: CacheDefaults.EXPIRE_TIME,
			invocationsUsed: CacheDefaults.INVOCATIONS_USED,
		});
	}

	private async isCacheValid(llmRequest: LlmRequest): Promise<boolean> {
		const cacheMetadata = llmRequest.cacheMetadata;
		this.logger.debug("Validating cache metadata", cacheMetadata);

		if (!cacheMetadata) return false;

		// Fingerprint-only metadata is not an active cache
		if (!cacheMetadata.cacheName) return false;

		const now = nowInSeconds();
		if (now >= (cacheMetadata.expireTime ?? CacheDefaults.EXPIRE_TIME)) {
			this.logger.info(`Cache expired: ${cacheMetadata.cacheName}`);
			return false;
		}

		if (!llmRequest.cacheConfig) {
			this.logger.warn("Missing cache config during validation");
			return false;
		}

		if (
			(cacheMetadata.invocationsUsed ?? 0) >
			llmRequest.cacheConfig.cacheIntervals
		) {
			this.logger.info(
				`Cache exceeded cache intervals: ${cacheMetadata.cacheName} (${cacheMetadata.invocationsUsed} > ${llmRequest.cacheConfig.cacheIntervals})`,
			);
			return false;
		}

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
			const allDeclarations = (llmRequest.config.tools || [])
				.flatMap((tool: any) => tool.functionDeclarations || [])
				.sort((a, b) => a.name.localeCompare(b.name));

			if (allDeclarations.length > 0) {
				fingerprintData.tools = [{ functionDeclarations: allDeclarations }];
			}
		}

		if (llmRequest.config?.toolConfig) {
			fingerprintData.tool_config = llmRequest.config.toolConfig;
		}

		if (cacheContentsCount > 0 && llmRequest.contents) {
			const contentsData = [];
			for (
				let i = 0;
				i < Math.min(cacheContentsCount, llmRequest.contents.length);
				i++
			) {
				contentsData.push(llmRequest.contents[i]);
			}
			fingerprintData.cached_contents = contentsData;
		}

		const fingerprintStr = JSON.stringify(fingerprintData);

		return crypto
			.createHash(Fingerprint.ALGORITHM)
			.update(fingerprintStr)
			.digest("hex")
			.substring(0, Fingerprint.LENGTH);
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

		try {
			const actualTokenCount = await this.countCacheTokens(
				llmRequest,
				cacheContentsCount,
			);

			this.logger.debug(
				`Actual cache token count from Google API: ${actualTokenCount}`,
			);

			if (actualTokenCount < minTokens) {
				console.log(
					`⊘ Cache SKIP: Context too small (${actualTokenCount} < ${minTokens} tokens)`,
				);
				return null;
			}

			if (actualTokenCount < CacheLimits.GOOGLE_MIN_TOKENS) {
				console.log(
					`⊘ Cache SKIP: Below Google minimum (${actualTokenCount} < ${CacheLimits.GOOGLE_MIN_TOKENS} tokens)`,
				);
				return null;
			}

			return await this.createCache(llmRequest, cacheContentsCount);
		} catch (e) {
			this.logger.warn("Failed to count tokens or create cache:", e);
			return null;
		}
	}

	private async countCacheTokens(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
	): Promise<number> {
		const cacheContents = llmRequest.contents.slice(0, cacheContentsCount);

		const contentsToCount = [...cacheContents];

		if (llmRequest.config?.systemInstruction) {
			const sysInstructionText =
				typeof llmRequest.config.systemInstruction === "string"
					? llmRequest.config.systemInstruction
					: JSON.stringify(llmRequest.config.systemInstruction);

			contentsToCount.unshift({
				role: "user",
				parts: [{ text: sysInstructionText }],
			});
		}

		const countConfig: any = {};

		if (llmRequest.config?.tools) {
			countConfig.tools = llmRequest.config.tools;
		}

		this.logger.debug(
			`Counting tokens for ${cacheContentsCount} contents (+ system instruction)`,
		);

		const result = await this.genaiClient.models.countTokens({
			model: llmRequest.model,
			contents: contentsToCount,
			config: countConfig,
		});

		const totalTokens = result.totalTokens || 0;
		this.logger.debug(`countTokens returned: ${totalTokens} total tokens`);

		return totalTokens;
	}

	private async createCache(
		llmRequest: LlmRequest,
		cacheContentsCount: number,
	): Promise<CacheMetadata> {
		if (!llmRequest.cacheConfig) {
			throw new Error("Cache config is required to create cache");
		}

		const cacheContents = llmRequest.contents.slice(0, cacheContentsCount);

		const cacheConfig: any = {
			contents: cacheContents,
			ttl: llmRequest.cacheConfig.ttlString,
			displayName: `adk-cache-${Math.floor(
				nowInSeconds(),
			)}-${cacheContentsCount}contents`,
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

		const cachedContent = await this.genaiClient.caches.create({
			model: llmRequest.model,
			config: cacheConfig,
		});

		const createdAt = nowInSeconds();

		console.log(
			`✓ Cache CREATED: New cache established (${cacheContentsCount} messages)`,
		);

		return new CacheMetadata({
			cacheName: cachedContent.name,
			expireTime: createdAt + llmRequest.cacheConfig.ttlSeconds,
			fingerprint: this.generateCacheFingerprint(
				llmRequest,
				cacheContentsCount,
			),
			invocationsUsed: CacheDefaults.INITIAL_INVOCATIONS_USED,
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
		if (llmRequest.config) {
			llmRequest.config.systemInstruction = undefined;
			llmRequest.config.tools = undefined;
			llmRequest.config.toolConfig = undefined;
		}

		llmRequest.config ??= {};
		llmRequest.config.cachedContent = cacheName;

		llmRequest.contents = llmRequest.contents.slice(cacheContentsCount);
	}

	public populateCacheMetadataInResponse(
		llmResponse: LlmResponse,
		cacheMetadata: CacheMetadata,
	) {
		llmResponse.cacheMetadata = cacheMetadata.copy();
	}
}
