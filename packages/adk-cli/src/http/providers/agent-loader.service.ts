import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, normalize, resolve } from "node:path";
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
			if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

			const outFile = this.cacheUtils.createTempFilePath(projectRoot);
			this.cacheUtils.trackCacheFile(outFile, projectRoot);

			const tsconfigPath = join(projectRoot, "tsconfig.json");
			const plugins = [
				this.pathUtils.createPathMappingPlugin(projectRoot),
				this.pathUtils.createExternalizePlugin(),
			];

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

			const dynamicRequire = createRequire(outFile);
			let mod: Record<string, unknown>;

			try {
				mod = dynamicRequire(outFile);
			} catch (error) {
				mod = await this.errorUtils.handleImportError(
					error,
					outFile,
					projectRoot,
				);
			}

			this.logger.log(
				`TS agent imported via esbuild: ${normalizedFilePath} ✅`,
			);
			return mod;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
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
