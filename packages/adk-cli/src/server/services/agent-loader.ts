import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { BaseAgent, BuiltAgent } from "@iqai/adk";
import type { AgentBuilder } from "@iqai/adk";
import { Logger } from "../logger.js";

const ADK_CACHE_DIR = ".adk-cache";

export class AgentLoader {
	private logger: Logger;

	constructor(private quiet = false) {
		this.logger = new Logger({ name: "agent-loader", quiet: this.quiet });
	}

	/**
	 * Import a TypeScript file by compiling it on-demand
	 */
	async importTypeScriptFile(
		filePath: string,
	): Promise<Record<string, unknown>> {
		// Determine project root (for tsconfig and resolving deps)
		const startDir = dirname(filePath);
		let projectRoot = startDir;
		while (projectRoot !== "/" && projectRoot !== dirname(projectRoot)) {
			if (
				existsSync(join(projectRoot, "package.json")) ||
				existsSync(join(projectRoot, ".env"))
			) {
				break;
			}
			projectRoot = dirname(projectRoot);
		}
		// If we reached root without finding markers, use the original start directory
		if (projectRoot === "/") {
			projectRoot = startDir;
		}

		// Transpile with esbuild and import (bundles local files, preserves tools)
		try {
			const { build } = await import("esbuild");
			const cacheDir = join(projectRoot, ADK_CACHE_DIR);
			if (!existsSync(cacheDir)) {
				mkdirSync(cacheDir, { recursive: true });
			}
			const outFile = join(cacheDir, `agent-${Date.now()}.mjs`);
			// Externalize bare module imports (node_modules), bundle relative/local files
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
							return; // use default resolve (to get bundled)
						}
						return { path: args.path, external: true };
					});
				},
			};

			const tsconfigPath = join(projectRoot, "tsconfig.json");
			await build({
				entryPoints: [filePath],
				outfile: outFile,
				bundle: true,
				format: "esm",
				platform: "node",
				target: ["node22"],
				sourcemap: false,
				logLevel: "silent",
				plugins: [plugin],
				absWorkingDir: projectRoot,
				// Use tsconfig if present for path aliases
				...(existsSync(tsconfigPath) ? { tsconfig: tsconfigPath } : {}),
			});

			const mod = (await import(
				`${pathToFileURL(outFile).href}?t=${Date.now()}`
			)) as Record<string, unknown>;
			let agentExport = mod?.agent;
			if (!agentExport && mod?.default) {
				const defaultExport = mod.default as Record<string, unknown>;
				agentExport = defaultExport?.agent ?? defaultExport;
			}
			try {
				unlinkSync(outFile);
			} catch {}
			if (agentExport) {
				const isPrimitive = (
					v: unknown,
				): v is null | undefined | string | number | boolean =>
					v == null || ["string", "number", "boolean"].includes(typeof v);
				if (isPrimitive(agentExport)) {
					// Primitive named 'agent' export (e.g., a string) isn't a real agent; fall through to full-module scan
					this.logger.info(
						`Ignoring primitive 'agent' export in ${filePath}; scanning module for factory...`,
					);
				} else {
					this.logger.info(`TS agent imported via esbuild: ${filePath} ✅`);
					return { agent: agentExport };
				}
			}
			// Fallback: return full module so downstream resolver can inspect named exports (e.g., getFooAgent)
			return mod;
		} catch (e) {
			throw new Error(
				`Failed to import TS agent via esbuild: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}

	loadEnvironmentVariables(agentFilePath: string): void {
		// Load environment variables from the project directory before importing
		let projectRoot = dirname(agentFilePath);
		while (projectRoot !== "/" && projectRoot !== dirname(projectRoot)) {
			if (
				existsSync(join(projectRoot, "package.json")) ||
				existsSync(join(projectRoot, ".env"))
			) {
				break;
			}
			projectRoot = dirname(projectRoot);
		}

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
						`Warning: Could not load ${envFile} file: ${error instanceof Error ? error.message : String(error)}`,
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
	private async invokeFunctionSafely(fn: () => unknown): Promise<unknown> {
		let result = fn();
		if (result && typeof result === "object" && "then" in result) {
			result = await result;
		}
		return result;
	}

	/**
	 * Extract BaseAgent from different possible types
	 */
	private async extractBaseAgent(item: unknown): Promise<BaseAgent | null> {
		if (this.isLikelyAgentInstance(item)) {
			return item; // Already a BaseAgent
		}
		if (this.isAgentBuilder(item)) {
			// Build the AgentBuilder to get BuiltAgent, then extract agent
			const built = await item.build();
			return built.agent;
		}
		if (this.isBuiltAgent(item)) {
			// Extract agent from BuiltAgent
			return item.agent;
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
			if (value && typeof value === "object" && "agent" in value) {
				const container = value as Record<string, unknown>;
				const containerAgent = await this.extractBaseAgent(container.agent);
				if (containerAgent) {
					return containerAgent;
				}
			}

			// Handle function exports that might return agents
			if (
				typeof value === "function" &&
				(/(agent|build|create)/i.test(keyLower) ||
					(value.name &&
						/(agent|build|create)/i.test(value.name.toLowerCase())))
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
						"agent" in functionResult
					) {
						const container = functionResult as Record<string, unknown>;
						const containerAgent = await this.extractBaseAgent(container.agent);
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
		const moduleDefault = mod?.default as Record<string, unknown> | undefined;
		const candidateToResolve: unknown =
			mod?.agent ?? moduleDefault?.agent ?? moduleDefault ?? mod;

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
			(candidateToResolve && candidateToResolve === mod)
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
			"agent" in candidateToResolve
		) {
			const container = candidateToResolve as Record<string, unknown>;
			return await this.extractBaseAgent(container.agent);
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
				"agent" in functionResult
			) {
				const container = functionResult as Record<string, unknown>;
				return await this.extractBaseAgent(container.agent);
			}
		} catch (e) {
			throw new Error(
				`Failed executing exported agent function: ${e instanceof Error ? e.message : String(e)}`,
			);
		}

		return null;
	}
}
