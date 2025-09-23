import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	unlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { BaseAgent, BuiltAgent } from "@iqai/adk";
import type { AgentBuilder } from "@iqai/adk";
import { Injectable, Logger } from "@nestjs/common";
import { findProjectRoot } from "../../common/find-project-root";

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
	 * Parse TypeScript path mappings from tsconfig.json
	 */
	private parseTsConfigPaths(projectRoot: string): {
		baseUrl?: string;
		paths?: Record<string, string[]>;
	} {
		const tsconfigPath = join(projectRoot, "tsconfig.json");
		if (!existsSync(tsconfigPath)) {
			return {};
		}

		try {
			const tsconfigContent = readFileSync(tsconfigPath, "utf-8");
			const tsconfig = JSON.parse(tsconfigContent);
			const compilerOptions = tsconfig.compilerOptions || {};

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
	private createPathMappingPlugin(projectRoot: string) {
		const { baseUrl, paths } = this.parseTsConfigPaths(projectRoot);
		const resolvedBaseUrl = baseUrl
			? resolve(projectRoot, baseUrl)
			: projectRoot;
		const logger = this.logger;
		const quiet = this.quiet;

		return {
			name: "typescript-path-mapping",
			setup(build: any) {
				build.onResolve({ filter: /.*/ }, (args: any) => {
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
									const fullPath = resolve(resolvedBaseUrl, resolvedPath);
									const extensions = [".ts", ".js", ".tsx", ".jsx", ""];
									for (const ext of extensions) {
										const pathWithExt = ext ? fullPath + ext : fullPath;
										if (existsSync(pathWithExt)) {
											logger.debug(
												`Path mapping resolved: ${args.path} -> ${pathWithExt}`,
											);
											return { path: pathWithExt };
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
							const pathWithExt = envPath + ext;
							if (existsSync(pathWithExt)) {
								logger.debug(
									`Direct env import resolved: ${args.path} -> ${pathWithExt}`,
								);
								return { path: pathWithExt };
							}
						}
					}

					if (baseUrl && args.path.startsWith("../")) {
						const relativePath = args.path.replace("../", "");
						const fullPath = resolve(resolvedBaseUrl, relativePath);
						const extensions = [".ts", ".js", ".tsx", ".jsx", ""];
						for (const ext of extensions) {
							const pathWithExt = ext ? fullPath + ext : fullPath;
							if (existsSync(pathWithExt)) {
								logger.debug(
									`Relative import resolved via baseUrl: ${args.path} -> ${pathWithExt}`,
								);
								return { path: pathWithExt };
							}
						}
					}
					return;
				});
			},
		};
	}

	/**
	 * Import a TypeScript file by compiling it on-demand
	 */
	async importTypeScriptFile(
		filePath: string,
		providedProjectRoot?: string,
	): Promise<Record<string, unknown>> {
		const projectRoot =
			providedProjectRoot ?? findProjectRoot(dirname(filePath));

		if (!this.quiet) {
			this.logger.log(
				`Using project root: ${projectRoot} for agent: ${filePath}`,
			);
		}

		try {
			const { build } = await import("esbuild");
			const cacheDir = join(projectRoot, ADK_CACHE_DIR);
			if (!existsSync(cacheDir)) {
				mkdirSync(cacheDir, { recursive: true });
			}
			const outFile = join(cacheDir, `agent-${Date.now()}.cjs`);
			this.trackCacheFile(outFile, projectRoot);

			const ALWAYS_EXTERNAL_SCOPES = ["@iqai/"];
			const alwaysExternal = ["@iqai/adk"];

			const plugin = {
				name: "externalize-bare-imports",
				setup(build: {
					onResolve: (
						options: { filter: RegExp },
						callback: (args: { path: string }) =>
							| { path: string; external: boolean }
							| undefined,
					) => void;
				}) {
					build.onResolve({ filter: /.*/ }, (args: { path: string }) => {
						if (
							args.path.startsWith(".") ||
							args.path.startsWith("/") ||
							args.path.startsWith("..")
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

			const tsconfigPath = join(projectRoot, "tsconfig.json");
			const pathMappingPlugin = this.createPathMappingPlugin(projectRoot);
			const plugins = [pathMappingPlugin, plugin];

			await build({
				entryPoints: [filePath],
				outfile: outFile,
				bundle: true,
				format: "cjs", // match Nest's default compilation output
				platform: "node",
				target: ["node22"],
				sourcemap: false,
				logLevel: "silent",
				plugins,
				absWorkingDir: projectRoot,
				external: [...alwaysExternal],
				...(existsSync(tsconfigPath) ? { tsconfig: tsconfigPath } : {}),
			});

			const dynamicRequire = createRequire(outFile);
			let mod: Record<string, unknown>;
			try {
				mod = dynamicRequire(outFile) as Record<string, unknown>;
			} catch (loadErr) {
				this.logger.warn(
					`Primary require failed for built agent '${outFile}': ${loadErr instanceof Error ? loadErr.message : String(loadErr)}. Falling back to dynamic import...`,
				);
				try {
					mod = (await import(pathToFileURL(outFile).href)) as Record<
						string,
						unknown
					>;
				} catch (fallbackErr) {
					throw new Error(
						`Both require() and import() failed for built agent file '${outFile}': ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
					);
				}
			}
			let agentExport = (mod as any)?.agent;
			if (!agentExport && (mod as any)?.default) {
				const defaultExport = (mod as any).default as Record<string, unknown>;
				agentExport = (defaultExport as any)?.agent ?? defaultExport;
			}

			if (agentExport) {
				const isPrimitive = (
					v: unknown,
				): v is null | undefined | string | number | boolean =>
					v == null || ["string", "number", "boolean"].includes(typeof v);
				if (!isPrimitive(agentExport)) {
					this.logger.log(`TS agent imported via esbuild: ${filePath} ✅`);
					return { agent: agentExport as unknown };
				}
				this.logger.log(
					`Ignoring primitive 'agent' export in ${filePath}; scanning module for factory...`,
				);
			}
			return mod;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (/Cannot find module/.test(msg)) {
				this.logger.error(
					`Module resolution failed while loading agent file '${filePath}'.\n> ${msg}\nThis usually means the dependency is declared in a parent workspace package (e.g. @iqai/adk) and got externalized,\nbut is not installed in the agent project's own node_modules (common with PNPM isolated hoisting).\nFix: add it to the agent project's package.json or run: pnpm add <missing-pkg> -F <agent-workspace>.`,
				);
			}
			throw new Error(`Failed to import TS agent via esbuild: ${msg}`);
		}
	}

	loadEnvironmentVariables(agentFilePath: string): void {
		// Load environment variables from the project directory before importing
		const projectRoot = findProjectRoot(dirname(agentFilePath));

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
			"agent" in (obj as any) &&
			"runner" in (obj as any) &&
			"session" in (obj as any)
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
	private async invokeFunctionSafely(fn: () => unknown): Promise<unknown> {
		let result = fn();
		if (result && typeof result === "object" && "then" in (result as any)) {
			result = await (result as any);
		}
		return result;
	}

	/**
	 * Extract BaseAgent from different possible types
	 */
	private async extractBaseAgent(item: unknown): Promise<BaseAgent | null> {
		if (this.isLikelyAgentInstance(item)) {
			return item as BaseAgent; // Already a BaseAgent
		}
		if (this.isAgentBuilder(item)) {
			// Build the AgentBuilder to get BuiltAgent, then extract agent
			const built = await (item as AgentBuilder).build();
			return built.agent;
		}
		if (this.isBuiltAgent(item)) {
			// Extract agent from BuiltAgent
			return (item as BuiltAgent).agent;
		}
		return null;
	}

	/**
	 * Search through module exports to find potential agent exports
	 */
	private async scanModuleExports(
		mod: Record<string, unknown>,
	): Promise<BaseAgent | null> {
		for (const [key, value] of Object.entries(mod)) {
			if (key === "default") continue;
			const keyLower = key.toLowerCase();
			if (this.isPrimitive(value)) continue;

			const baseAgent = await this.extractBaseAgent(value);
			if (baseAgent) {
				return baseAgent;
			}

			// Handle static container object: export const container = { agent: <BaseAgent> }
			if (value && typeof value === "object" && "agent" in (value as any)) {
				const container = value as Record<string, unknown>;
				const containerAgent = await this.extractBaseAgent(
					(container as any).agent,
				);
				if (containerAgent) {
					return containerAgent;
				}
			}

			// Handle function exports that might return agents
			if (
				typeof value === "function" &&
				(() => {
					if (/(agent|build|create)/i.test(keyLower)) return true;
					const fnName = (value as { name?: string })?.name;
					return !!(
						fnName && /(agent|build|create)/i.test(fnName.toLowerCase())
					);
				})()
			) {
				try {
					const functionResult = await this.invokeFunctionSafely(
						value as () => unknown,
					);
					const baseAgent = await this.extractBaseAgent(functionResult);
					if (baseAgent) {
						return baseAgent;
					}

					if (
						functionResult &&
						typeof functionResult === "object" &&
						"agent" in (functionResult as any)
					) {
						const container = functionResult as Record<string, unknown>;
						const containerAgent = await this.extractBaseAgent(
							(container as any).agent,
						);
						if (containerAgent) {
							return containerAgent;
						}
					}
				} catch (e) {
					// Swallow and continue searching
				}
			}
		}

		return null;
	}

	// Enhanced resolution logic for agent exports: always returns BaseAgent
	async resolveAgentExport(mod: Record<string, unknown>): Promise<BaseAgent> {
		const moduleDefault = (mod as any)?.default as
			| Record<string, unknown>
			| undefined;
		const candidateToResolve: unknown =
			(mod as any)?.agent ??
			(moduleDefault as any)?.agent ??
			moduleDefault ??
			mod;

		// Try to extract from the initial candidate
		const directResult = await this.tryResolvingDirectCandidate(
			candidateToResolve,
			mod,
		);
		if (directResult) {
			return directResult;
		}

		// Search through module exports if no direct candidate found
		const exportResult = await this.scanModuleExports(mod);
		if (exportResult) {
			return exportResult;
		}

		// Final attempt: handle function candidate
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
		mod: Record<string, unknown>,
	): Promise<BaseAgent | null> {
		// Skip if candidate is primitive or represents the whole module
		if (
			this.isPrimitive(candidateToResolve) ||
			(candidateToResolve && candidateToResolve === (mod as unknown))
		) {
			return null;
		}

		// Try direct extraction
		const directAgent = await this.extractBaseAgent(candidateToResolve);
		if (directAgent) {
			return directAgent;
		}

		// Check if it's a container object
		if (
			candidateToResolve &&
			typeof candidateToResolve === "object" &&
			"agent" in (candidateToResolve as any)
		) {
			const container = candidateToResolve as Record<string, unknown>;
			return await this.extractBaseAgent((container as any).agent);
		}

		return null;
	}

	/**
	 * Try to resolve a function candidate by invoking it
	 */
	private async tryResolvingFunctionCandidate(
		functionCandidate: unknown,
	): Promise<BaseAgent | null> {
		try {
			const functionResult = await this.invokeFunctionSafely(
				functionCandidate as () => unknown,
			);

			// Try direct extraction from function result
			const directAgent = await this.extractBaseAgent(functionResult);
			if (directAgent) {
				return directAgent;
			}

			// Check if function result is a container
			if (
				functionResult &&
				typeof functionResult === "object" &&
				"agent" in (functionResult as any)
			) {
				const container = functionResult as Record<string, unknown>;
				return await this.extractBaseAgent((container as any).agent);
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
