import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Injectable, Logger } from "@nestjs/common";
import { findProjectRoot } from "../../common/find-project-root";
import {
	isRebuildNeeded as checkRebuildNeeded,
	createExternalizePlugin,
} from "./agent-loader/build-utils";
import { loadEnvironmentVariables as loadEnv } from "./agent-loader/env";
import { createPathMappingPlugin } from "./agent-loader/path-plugin";
import { resolveAgentExport as resolveAgentExportHelper } from "./agent-loader/resolver";
import { normalizePathForEsbuild } from "./agent-loader/utils";
import type {
	AgentExportResult,
	ModuleExport,
	RequireLike,
} from "./agent-loader.types";

const ADK_CACHE_DIR = ".adk-cache";

@Injectable()
export class AgentLoader {
	private logger: Logger;
	private static cacheCleanupRegistered = false;
	private static activeCacheFiles = new Set<string>();
	private static projectRoots = new Set<string>();

	constructor(private quiet = false) {
		this.logger = new Logger("agent-loader");
		this.registerCleanupHandlers();
	}

	/**
	 * Register error handlers (no automatic cache cleanup)
	 */
	private registerCleanupHandlers(): void {
		if (AgentLoader.cacheCleanupRegistered) {
			return;
		}
		AgentLoader.cacheCleanupRegistered = true;

		process.on("uncaughtException", (error) => {
			this.logger.error("Uncaught exception:", error);
			process.exit(1);
		});

		process.on("unhandledRejection", (reason, promise) => {
			this.logger.error("Unhandled rejection at:", promise, "reason:", reason);
			process.exit(1);
		});
	}

	/**
	 * Clean up all cache files from all project roots
	 * (manual or test/debug use only)
	 */
	static cleanupAllCacheFiles(logger?: Logger, quiet = false): void {
		try {
			// Clean individual tracked files first
			for (const filePath of AgentLoader.activeCacheFiles) {
				try {
					if (existsSync(filePath)) {
						unlinkSync(filePath);
					}
				} catch {}
			}
			AgentLoader.activeCacheFiles.clear();

			// Clean entire cache directories
			for (const projectRoot of AgentLoader.projectRoots) {
				const cacheDir = join(projectRoot, ADK_CACHE_DIR);
				try {
					if (existsSync(cacheDir)) {
						rmSync(cacheDir, { recursive: true, force: true });
						if (!quiet) {
							logger?.log(`Cleaned cache directory: ${cacheDir}`);
						}
					}
				} catch (error) {
					if (!quiet) {
						logger?.warn(`Failed to clean cache directory ${cacheDir}:`, error);
					}
				}
			}
			AgentLoader.projectRoots.clear();
		} catch (error) {
			if (!quiet) {
				logger?.warn("Error during cache cleanup:", error);
			}
		}
	}

	/**
	 * Track a cache file for cleanup
	 */
	private trackCacheFile(filePath: string, projectRoot: string): void {
		AgentLoader.activeCacheFiles.add(filePath);
		AgentLoader.projectRoots.add(projectRoot);
	}

	/**
	 * Normalize path to use forward slashes (cross-platform)
	 */
	private normalizePath(path: string): string {
		return path.replace(/\\/g, "/");
	}

	/**
	 * Import a TypeScript file by compiling it on-demand
	 * @param filePath - Path to the TypeScript file
	 * @param providedProjectRoot - Optional project root path
	 * @param forceInvalidateCache - Force cache invalidation (full reload)
	 */
	async importTypeScriptFile(
		filePath: string,
		providedProjectRoot?: string,
		forceInvalidateCache?: boolean,
	): Promise<ModuleExport> {
		// Normalize the input file path
		const normalizedFilePath = normalize(resolve(filePath));
		const projectRoot =
			providedProjectRoot ?? findProjectRoot(dirname(normalizedFilePath));

		if (!this.quiet) {
			this.logger.log(
				`Using project root: ${projectRoot} for agent: ${normalizedFilePath}`,
			);
		}

		try {
			const { build } = await import("esbuild");
			const cacheDir = join(projectRoot, ADK_CACHE_DIR);
			if (!existsSync(cacheDir)) {
				mkdirSync(cacheDir, { recursive: true });
			}

			// Deterministic cache file path per source file to avoid unbounded cache growth
			const cacheKey = createHash("sha1")
				.update(this.normalizePath(normalizedFilePath))
				.digest("hex");
			const outFile = normalize(join(cacheDir, `agent-${cacheKey}.cjs`));
			this.trackCacheFile(outFile, projectRoot);

			// Define tsconfigPath once for reuse
			const tsconfigPath = join(projectRoot, "tsconfig.json");

			// Check if we need to rebuild
			// Force rebuild if explicitly requested (e.g., initial state changed)
			const needRebuild =
				forceInvalidateCache ||
				checkRebuildNeeded(
					outFile,
					normalizedFilePath,
					tsconfigPath,
					this.logger,
					this.quiet,
				);

			if (forceInvalidateCache && !this.quiet) {
				this.logger.log(`Forcing cache invalidation for ${normalizedFilePath}`);
			}

			const ALWAYS_EXTERNAL_SCOPES = ["@iqai/"];
			const alwaysExternal = ["@iqai/adk"];
			const plugin = createExternalizePlugin(
				alwaysExternal,
				ALWAYS_EXTERNAL_SCOPES,
			);

			const pathMappingPlugin = createPathMappingPlugin(projectRoot, {
				logger: this.logger,
				quiet: this.quiet,
			});
			const plugins = [pathMappingPlugin, plugin];

			if (needRebuild) {
				// Delete old cache file before rebuilding to avoid stale cache on build failure
				try {
					if (existsSync(outFile)) {
						unlinkSync(outFile);
						if (!this.quiet) {
							this.logger.debug(`Deleted old cache file: ${outFile}`);
						}
					}
				} catch (error) {
					if (!this.quiet) {
						this.logger.warn(
							`Failed to delete old cache file ${outFile}: ${
								error instanceof Error ? error.message : String(error)
							}`,
						);
					}
				}

				await build({
					entryPoints: [normalizePathForEsbuild(normalizedFilePath)],
					outfile: outFile,
					bundle: true,
					format: "cjs",
					platform: "node",
					target: ["node22"],
					sourcemap: false,
					logLevel: "silent",
					plugins,
					absWorkingDir: projectRoot,
					external: [...alwaysExternal],
					...(existsSync(tsconfigPath) ? { tsconfig: tsconfigPath } : {}),
				});
			}

			const dynamicRequire = createRequire(outFile) as RequireLike;
			// Bust require cache if we rebuilt the same outFile path
			try {
				if (needRebuild) {
					const resolved = dynamicRequire.resolve
						? dynamicRequire.resolve(outFile)
						: outFile;
					if (dynamicRequire.cache?.[resolved]) {
						delete dynamicRequire.cache[resolved];
					}
				}
			} catch (error) {
				if (!this.quiet) {
					this.logger.warn(
						`Failed to invalidate require cache for ${outFile}: ${
							error instanceof Error ? error.message : String(error)
						}. Stale code may be executed.`,
					);
				}
			}

			let mod: ModuleExport;
			try {
				mod = dynamicRequire(outFile) as ModuleExport;
			} catch (loadErr) {
				this.logger.warn(
					`Primary require failed for built agent '${outFile}': ${
						loadErr instanceof Error ? loadErr.message : String(loadErr)
					}. Falling back to dynamic import...`,
				);
				try {
					mod = (await import(pathToFileURL(outFile).href)) as ModuleExport;
				} catch (fallbackErr) {
					throw new Error(
						`Both require() and import() failed for built agent file '${outFile}': ${
							fallbackErr instanceof Error
								? fallbackErr.message
								: String(fallbackErr)
						}`,
					);
				}
			}

			let agentExport = mod.agent;
			if (!agentExport && mod.default) {
				const defaultExport = mod.default;
				if (
					defaultExport &&
					typeof defaultExport === "object" &&
					"agent" in defaultExport
				) {
					const defaultObj = defaultExport as ModuleExport;
					agentExport = defaultObj.agent ?? defaultExport;
				} else {
					agentExport = defaultExport;
				}
			}

			if (agentExport) {
				const isPrimitive = (
					v: unknown,
				): v is null | undefined | string | number | boolean =>
					v == null || ["string", "number", "boolean"].includes(typeof v);
				if (!isPrimitive(agentExport)) {
					this.logger.log(
						`TS agent imported via esbuild: ${normalizedFilePath} ✅`,
					);
					return { agent: agentExport as unknown };
				}
				this.logger.log(
					`Ignoring primitive 'agent' export in ${normalizedFilePath}; scanning module for factory...`,
				);
			}
			return mod;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (/Cannot find module/.test(msg)) {
				this.logger.error(
					`Module resolution failed while loading agent file '${normalizedFilePath}'.\n> ${msg}\nThis usually means the dependency is declared in a parent workspace package (e.g. @iqai/adk) and got externalized,\nbut is not installed in the agent project's own node_modules (common with PNPM isolated hoisting).\nFix: add it to the agent project's package.json or run: pnpm add <missing-pkg> -F <agent-workspace>.`,
				);
			}
			throw new Error(`Failed to import TS agent via esbuild: ${msg}`);
		}
	}

	loadEnvironmentVariables(agentFilePath: string): void {
		loadEnv(agentFilePath, this.logger);
	}

	async resolveAgentExport(mod: ModuleExport): Promise<AgentExportResult> {
		return resolveAgentExportHelper(mod);
	}
}
