import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	unlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AgentBuilder, BaseAgent, BuiltAgent } from "@iqai/adk";
import { Injectable, Logger } from "@nestjs/common";
import { findProjectRoot } from "../../common/find-project-root";
import type {
	AgentExportResult,
	AgentExportValue,
	ESBuildOnResolveArgs,
	ESBuildPlugin,
	ESBuildPluginSetup,
	ModuleExport,
	RequireLike,
	TsConfigPaths,
} from "./agent-loader.types";
import { TsConfigSchema } from "./agent-loader.types";

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
	 * Parse TypeScript path mappings from tsconfig.json
	 */
	private parseTsConfigPaths(projectRoot: string): TsConfigPaths {
		const tsconfigPath = join(projectRoot, "tsconfig.json");
		if (!existsSync(tsconfigPath)) {
			return {};
		}

		try {
			const tsconfigContent = readFileSync(tsconfigPath, "utf-8");
			const tsconfigJson: unknown = JSON.parse(tsconfigContent);
			const parsed = TsConfigSchema.safeParse(tsconfigJson);
			if (!parsed.success) {
				this.logger.warn("Invalid tsconfig.json structure");
				return {};
			}
			const compilerOptions = parsed.data.compilerOptions || {};

			return {
				baseUrl: compilerOptions.baseUrl,
				paths: compilerOptions.paths,
			};
		} catch (error) {
			this.logger.warn(
				`Failed to parse tsconfig.json: ${error instanceof Error ? error.message : String(error)}`,
			);
			return {};
		}
	}

	/**
	 * Create an esbuild plugin to handle TypeScript path mappings and relative imports
	 */
	private createPathMappingPlugin(projectRoot: string): ESBuildPlugin {
		const { baseUrl, paths } = this.parseTsConfigPaths(projectRoot);
		const resolvedBaseUrl = baseUrl
			? resolve(projectRoot, baseUrl)
			: projectRoot;
		const logger = this.logger;
		const quiet = this.quiet;
		const normalizePath = this.normalizePath.bind(this);

		return {
			name: "typescript-path-mapping",
			setup(build: ESBuildPluginSetup) {
				build.onResolve({ filter: /.*/ }, (args: ESBuildOnResolveArgs) => {
					if (!quiet) {
						logger.debug(
							`Resolving import: "${args.path}" from "${args.importer || "unknown"}"`,
						);
					}
					if (paths && !args.path.startsWith(".") && !isAbsolute(args.path)) {
						for (const [alias, mappings] of Object.entries(paths)) {
							const aliasPattern = alias.replace("*", "(.*)");
							const aliasRegex = new RegExp(`^${aliasPattern}$`);
							const match = args.path.match(aliasRegex);

							if (match) {
								for (const mapping of mappings) {
									let resolvedPath = mapping;
									if (match[1] && mapping.includes("*")) {
										resolvedPath = mapping.replace("*", match[1]);
									}
									const fullPath = normalize(
										resolve(resolvedBaseUrl, resolvedPath),
									);
									const extensions = [".ts", ".js", ".tsx", ".jsx", ""];
									for (const ext of extensions) {
										const pathWithExt = ext ? fullPath + ext : fullPath;
										if (existsSync(pathWithExt)) {
											logger.debug(
												`Path mapping resolved: ${args.path} -> ${pathWithExt}`,
											);
											return { path: normalizePath(pathWithExt) };
										}
									}
								}
							}
						}
					}

					if (args.path === "env" && baseUrl) {
						const envPath = resolve(resolvedBaseUrl, "env");
						const extensions = [".ts", ".js"];
						for (const ext of extensions) {
							const pathWithExt = normalize(envPath + ext);
							if (existsSync(pathWithExt)) {
								logger.debug(
									`Direct env import resolved: ${args.path} -> ${pathWithExt}`,
								);
								return { path: normalizePath(pathWithExt) };
							}
						}
					}

					if (baseUrl && args.path.startsWith("../")) {
						const relativePath = args.path.replace("../", "");
						const fullPath = resolve(resolvedBaseUrl, relativePath);
						const extensions = [".ts", ".js", ".tsx", ".jsx", ""];
						for (const ext of extensions) {
							const pathWithExt = normalize(ext ? fullPath + ext : fullPath);
							if (existsSync(pathWithExt)) {
								logger.debug(
									`Relative import resolved via baseUrl: ${args.path} -> ${pathWithExt}`,
								);
								return { path: normalizePath(pathWithExt) };
							}
						}
					}
					return;
				});
			},
		};
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
			// Log the error to help diagnose cache issues
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
			const needRebuild = this.isRebuildNeeded(
				outFile,
				normalizedFilePath,
				tsconfigPath,
			);

			const ALWAYS_EXTERNAL_SCOPES = ["@iqai/"];
			const alwaysExternal = ["@iqai/adk"];

			const plugin: ESBuildPlugin = {
				name: "externalize-bare-imports",
				setup(build: ESBuildPluginSetup) {
					build.onResolve({ filter: /.*/ }, (args: ESBuildOnResolveArgs) => {
						const isWindowsAbsolutePath = /^[a-zA-Z]:/.test(args.path);
						if (
							args.path.startsWith(".") ||
							args.path.startsWith("/") ||
							args.path.startsWith("..") ||
							isWindowsAbsolutePath
						) {
							return;
						}
						if (
							ALWAYS_EXTERNAL_SCOPES.some((s) => args.path.startsWith(s)) ||
							alwaysExternal.includes(args.path)
						) {
							return { path: args.path, external: true };
						}
						return { path: args.path, external: true };
					});
				},
			};

			const pathMappingPlugin = this.createPathMappingPlugin(projectRoot);
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
					entryPoints: [this.normalizePath(normalizedFilePath)],
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
		// Normalize the path first
		const normalizedAgentPath = normalize(resolve(agentFilePath));
		const projectRoot = findProjectRoot(dirname(normalizedAgentPath));

		// Check for multiple env files in priority order
		const envFiles = [
			".env.local",
			".env.development.local",
			".env.production.local",
			".env.development",
			".env.production",
			".env",
		];

		for (const envFile of envFiles) {
			const envPath = join(projectRoot, envFile);
			if (existsSync(envPath)) {
				try {
					const envContent = readFileSync(envPath, "utf8");
					const envLines = envContent.split("\n");
					for (const line of envLines) {
						const trimmedLine = line.trim();
						if (trimmedLine && !trimmedLine.startsWith("#")) {
							const [key, ...valueParts] = trimmedLine.split("=");
							if (key && valueParts.length > 0) {
								const value = valueParts.join("=").replace(/^"(.*)"$/, "$1");
								// Set environment variables in current process (only if not already set)
								if (!process.env[key.trim()]) {
									process.env[key.trim()] = value.trim();
								}
							}
						}
					}
				} catch (error) {
					this.logger.warn(
						`Warning: Could not load ${envFile} file: ${
							error instanceof Error ? error.message : String(error)
						}`,
					);
				}
			}
		}
	}

	/**
	 * Type guard to check if object is likely a BaseAgent instance
	 */
	private isLikelyAgentInstance(obj: unknown): obj is BaseAgent {
		return (
			obj != null &&
			typeof obj === "object" &&
			typeof (obj as BaseAgent).name === "string" &&
			typeof (obj as BaseAgent).runAsync === "function"
		);
	}

	/**
	 * Type guard to check if object is an AgentBuilder
	 */
	private isAgentBuilder(obj: unknown): obj is AgentBuilder {
		return (
			obj != null &&
			typeof obj === "object" &&
			typeof (obj as AgentBuilder).build === "function" &&
			typeof (obj as AgentBuilder).withModel === "function"
		);
	}

	/**
	 * Type guard to check if object is a BuiltAgent
	 */
	private isBuiltAgent(obj: unknown): obj is BuiltAgent {
		return (
			obj != null &&
			typeof obj === "object" &&
			"agent" in obj &&
			"runner" in obj &&
			"session" in obj
		);
	}

	/**
	 * Type guard to check if value is a primitive type
	 */
	private isPrimitive(
		v: unknown,
	): v is null | undefined | string | number | boolean {
		return v == null || ["string", "number", "boolean"].includes(typeof v);
	}

	/**
	 * Safely invoke a function, handling both sync and async results
	 */
	private async invokeFunctionSafely(
		fn: () => AgentExportValue,
	): Promise<AgentExportValue> {
		let result: unknown = fn();
		if (result && typeof result === "object" && "then" in result) {
			try {
				result = await (result as Promise<AgentExportValue>);
			} catch (e) {
				throw new Error(
					`Failed to await function result: ${e instanceof Error ? e.message : String(e)}`,
				);
			}
		}
		return result as AgentExportValue;
	}

	/**
	 * Extract BaseAgent from different possible types
	 * Returns both the agent and the full built context (if available)
	 */
	private async extractBaseAgent(
		item: unknown,
	): Promise<AgentExportResult | null> {
		if (this.isLikelyAgentInstance(item)) {
			return { agent: item as BaseAgent };
		}
		if (this.isAgentBuilder(item)) {
			const built = await (item as AgentBuilder).build();
			return { agent: built.agent, builtAgent: built };
		}
		if (this.isBuiltAgent(item)) {
			const builtItem = item as BuiltAgent;
			return {
				agent: builtItem.agent,
				builtAgent: builtItem,
			};
		}
		return null;
	}

	/**
	 * Search through module exports to find potential agent exports
	 */
	private async scanModuleExports(
		mod: ModuleExport,
	): Promise<AgentExportResult | null> {
		for (const [key, value] of Object.entries(mod)) {
			if (key === "default") continue;
			const keyLower = key.toLowerCase();
			if (this.isPrimitive(value)) continue;

			const result = await this.extractBaseAgent(value);
			if (result) {
				return result;
			}

			if (value && typeof value === "object" && "agent" in value) {
				const container = value as ModuleExport;
				const containerResult = await this.extractBaseAgent(container.agent);
				if (containerResult) {
					return containerResult;
				}
			}

			if (
				typeof value === "function" &&
				(() => {
					if (/(agent|build|create)/i.test(keyLower)) return true;
					const fnLike = value as { name?: string };
					const fnName = fnLike?.name;
					return !!(
						fnName && /(agent|build|create)/i.test(fnName.toLowerCase())
					);
				})()
			) {
				try {
					const functionResult = await this.invokeFunctionSafely(
						value as () => unknown as () => AgentExportValue,
					);
					const result = await this.extractBaseAgent(functionResult);
					if (result) {
						return result;
					}
				} catch (_e) {
					// Swallow and continue searching
				}
			}
		}

		return null;
	}

	async resolveAgentExport(mod: ModuleExport): Promise<AgentExportResult> {
		const moduleDefault =
			mod.default && typeof mod.default === "object"
				? (mod.default as ModuleExport)
				: undefined;
		const candidateToResolve: unknown =
			mod.agent ?? moduleDefault?.agent ?? moduleDefault ?? mod;

		const directResult = await this.tryResolvingDirectCandidate(
			candidateToResolve,
			mod,
		);
		if (directResult) {
			return directResult;
		}

		const exportResult = await this.scanModuleExports(mod);
		if (exportResult) {
			return exportResult;
		}

		if (typeof candidateToResolve === "function") {
			const functionResult =
				await this.tryResolvingFunctionCandidate(candidateToResolve);
			if (functionResult) {
				return functionResult;
			}
		}

		throw new Error(
			"No agent export resolved (expected BaseAgent, AgentBuilder, or BuiltAgent)",
		);
	}

	/**
	 * Try to resolve a direct candidate (not from scanning exports)
	 */
	private async tryResolvingDirectCandidate(
		candidateToResolve: unknown,
		mod: ModuleExport,
	): Promise<AgentExportResult | null> {
		if (
			this.isPrimitive(candidateToResolve) ||
			(candidateToResolve && candidateToResolve === (mod as unknown))
		) {
			return null;
		}

		const result = await this.extractBaseAgent(candidateToResolve);
		if (result) {
			return result;
		}

		if (
			candidateToResolve &&
			typeof candidateToResolve === "object" &&
			"agent" in candidateToResolve
		) {
			const container = candidateToResolve as ModuleExport;
			return await this.extractBaseAgent(container.agent);
		}

		return null;
	}

	/**
	 * Try to resolve a function candidate by invoking it
	 */
	private async tryResolvingFunctionCandidate(
		functionCandidate: unknown,
	): Promise<AgentExportResult | null> {
		try {
			const functionResult = await this.invokeFunctionSafely(
				functionCandidate as () => unknown as () => AgentExportValue,
			);

			const result = await this.extractBaseAgent(functionResult);
			if (result) {
				return result;
			}
		} catch (e) {
			throw new Error(
				`Failed executing exported agent function: ${
					e instanceof Error ? e.message : String(e)
				}`,
			);
		}

		return null;
	}
}
