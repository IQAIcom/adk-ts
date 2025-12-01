import { existsSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { Logger } from "@nestjs/common";

export const CACHE_DIR = ".adk-cache";

export class CacheUtils {
	private static activeCacheFiles = new Set<string>();
	private static projectRoots = new Set<string>();

	constructor(
		private logger: Logger,
		private quiet = false,
	) {}

	static cleanupAllCacheFiles(logger?: Logger, quiet = false): void {
		for (const file of CacheUtils.activeCacheFiles) {
			try {
				if (existsSync(file)) unlinkSync(file);
			} catch {}
		}
		CacheUtils.activeCacheFiles.clear();

		for (const root of CacheUtils.projectRoots) {
			const cacheDir = join(root, CACHE_DIR);
			try {
				if (existsSync(cacheDir)) {
					rmSync(cacheDir, { recursive: true, force: true });
					if (!quiet) logger?.log(`Cleaned cache directory: ${cacheDir}`);
				}
			} catch (e) {
				if (!quiet)
					logger?.warn(`Failed to clean cache directory ${cacheDir}:`, e);
			}
		}
		CacheUtils.projectRoots.clear();
	}

	trackCacheFile(filePath: string, projectRoot: string): void {
		CacheUtils.activeCacheFiles.add(filePath);
		CacheUtils.projectRoots.add(projectRoot);
	}

	createTempFilePath(projectRoot: string): string {
		return join(projectRoot, CACHE_DIR, `agent-${Date.now()}.cjs`);
	}
}
