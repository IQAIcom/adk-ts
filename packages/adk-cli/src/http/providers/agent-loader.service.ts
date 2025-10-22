import { createHash } from "node:crypto";
import { existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BaseAgent } from "@iqai/adk";
import { Injectable, Logger } from "@nestjs/common";
import { findProjectRoot } from "../../common/find-project-root";
import { AgentResolver } from "./agent-loader/agent-resolver";
import { CACHE_DIR, CacheUtils } from "./agent-loader/cache-utils";
import { EnvUtils } from "./agent-loader/env-utils";
import { ErrorHandlingUtils } from "./agent-loader/error-handling-utils";
import { PathUtils } from "./agent-loader/path-utils";
import { TypeGuards } from "./agent-loader/type-guards";

@Injectable()
export class AgentLoader {
	private logger: Logger;
	private static cacheCleanupRegistered = false;
	private readonly cacheUtils: CacheUtils;
	private readonly envUtils: EnvUtils;
	private readonly pathUtils: PathUtils;
	private readonly errorUtils: ErrorHandlingUtils;
	private readonly guards: TypeGuards;
	private readonly resolver: AgentResolver;

	constructor(private quiet = false) {
		this.logger = new Logger("agent-loader");
		this.registerCleanupHandlers();

		this.cacheUtils = new CacheUtils(this.logger, this.quiet);
		this.envUtils = new EnvUtils(this.logger, this.quiet);
		this.pathUtils = new PathUtils(this.logger, this.quiet);
		this.errorUtils = new ErrorHandlingUtils(this.logger);
		this.guards = new TypeGuards();
		this.resolver = new AgentResolver(this.logger, this.quiet, this.guards);
	}

	private registerCleanupHandlers(): void {
		if (AgentLoader.cacheCleanupRegistered) return;
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

	static cleanupAllCacheFiles(logger?: Logger, quiet = false): void {
		CacheUtils.cleanupAllCacheFiles(logger, quiet);
	}

	loadEnvironmentVariables(agentFilePath: string): void {
		this.envUtils.loadEnvironmentVariables(agentFilePath);
	}

	/**
	 * Check if a rebuild is needed based on file modification times
	 */
	private isRebuildNeeded(
		outFile: string,
		sourceFile: string,
		tsconfigPath: string,
	): boolean {
		if (!existsSync(outFile)) {
			return true;
		}

		try {
			const outStat = statSync(outFile);
			const srcStat = statSync(sourceFile);
			const tsconfigMtime = existsSync(tsconfigPath)
				? statSync(tsconfigPath).mtimeMs
				: 0;

			const needRebuild = !(
				outStat.mtimeMs >= srcStat.mtimeMs && outStat.mtimeMs >= tsconfigMtime
			);

			if (!needRebuild && !this.quiet) {
				this.logger.debug(`Reusing cached build: ${outFile}`);
			}

			return needRebuild;
		} catch (error) {
			if (!this.quiet) {
				this.logger.warn(
					`Failed to check cache freshness for ${outFile}: ${
						error instanceof Error ? error.message : String(error)
					}. Forcing rebuild.`,
				);
			}
			return true;
		}
	}

	/**
	 * Import a TypeScript file by compiling it on-demand
	 */
	async importTypeScriptFile(
		filePath: string,
		providedProjectRoot?: string,
	): Promise<Record<string, unknown>> {
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
			const cacheDir = join(projectRoot, CACHE_DIR);
			if (!existsSync(cacheDir)) {
				mkdirSync(cacheDir, { recursive: true });
			}

			// Deterministic cache file path per source file
			const cacheKey = createHash("sha1")
				.update(this.pathUtils.normalizePath(normalizedFilePath))
				.digest("hex");
			const outFile = normalize(join(cacheDir, `agent-${cacheKey}.cjs`));
			this.cacheUtils.trackCacheFile(outFile, projectRoot);

			const tsconfigPath = join(projectRoot, "tsconfig.json");

			// Check if we need to rebuild
			const needRebuild = this.isRebuildNeeded(
				outFile,
				normalizedFilePath,
				tsconfigPath,
			);

			const plugins = [
				this.pathUtils.createPathMappingPlugin(projectRoot),
				this.pathUtils.createExternalizePlugin(),
			];

			if (needRebuild) {
				// Delete old cache file before rebuilding
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
					entryPoints: [this.pathUtils.normalizePath(normalizedFilePath)],
					outfile: outFile,
					bundle: true,
					format: "cjs",
					platform: "node",
					target: ["node22"],
					sourcemap: false,
					logLevel: "silent",
					plugins,
					absWorkingDir: projectRoot,
					external: ["@iqai/adk"],
					...(existsSync(tsconfigPath) ? { tsconfig: tsconfigPath } : {}),
				});
			}

			const dynamicRequire = createRequire(outFile);

			// Bust require cache if we rebuilt
			try {
				if (needRebuild) {
					const resolved = (dynamicRequire as any).resolve
						? (dynamicRequire as any).resolve(outFile)
						: outFile;
					if ((dynamicRequire as any).cache?.[resolved]) {
						delete (dynamicRequire as any).cache[resolved];
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

			let mod: Record<string, unknown>;

			try {
				mod = dynamicRequire(outFile) as Record<string, unknown>;
			} catch (loadErr) {
				this.logger.warn(
					`Primary require failed for built agent '${outFile}': ${
						loadErr instanceof Error ? loadErr.message : String(loadErr)
					}. Falling back to dynamic import...`,
				);
				try {
					mod = (await import(pathToFileURL(outFile).href)) as Record<
						string,
						unknown
					>;
				} catch (fallbackErr) {
					// Handle env-related import errors
					mod = await this.errorUtils.handleImportError(
						fallbackErr,
						outFile,
						projectRoot,
					);
				}
			}

			this.logger.log(
				`TS agent imported via esbuild: ${normalizedFilePath} ✅`,
			);
			return mod;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);

			const envCheck = this.errorUtils.isMissingEnvError(e);
			if (!envCheck.isMissing) {
				if ("formatUserError" in this.errorUtils) {
					this.logger.error(this.errorUtils.formatUserError(e));
				} else {
					this.logger.error(`❌ Error loading TypeScript agent: ${msg}`);
				}
			}

			if (/Cannot find module/.test(msg)) {
				this.logger.error(
					`Module resolution failed while loading agent file '${filePath}'.\n> ${msg}\n` +
						"This usually means the dependency is declared in a parent workspace package and got externalized,\n" +
						"but is not installed in the agent project's own node_modules.\n" +
						"Fix: add it to the agent project's package.json or run: pnpm add <missing-pkg> -F <agent-workspace>.",
				);
			}

			throw new Error(`Failed to import TS agent via esbuild: ${msg}`);
		}
	}

	async resolveAgentExport(mod: Record<string, unknown>): Promise<BaseAgent> {
		return this.resolver.resolveAgentExport(mod);
	}
}
