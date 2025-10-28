import type {
	ESBuildOnResolveArgs,
	ESBuildPlugin,
	ESBuildPluginSetup,
} from "../agent-loader.types";
import { parseTsConfigPaths } from "./tsconfig";
import { existsSync } from "node:fs";
import { isAbsolute, normalize, resolve } from "node:path";
import type { Logger } from "@nestjs/common";
import { normalizePathForEsbuild } from "./utils";

export function createPathMappingPlugin(
	projectRoot: string,
	opts: { logger?: Logger; quiet?: boolean } = {},
): ESBuildPlugin {
	const { baseUrl, paths } = parseTsConfigPaths(projectRoot, opts.logger);
	const resolvedBaseUrl = baseUrl ? resolve(projectRoot, baseUrl) : projectRoot;
	const logger = opts.logger;
	const quiet = !!opts.quiet;

	return {
		name: "typescript-path-mapping",
		setup(build: ESBuildPluginSetup) {
			build.onResolve({ filter: /.*/ }, (args: ESBuildOnResolveArgs) => {
				if (!quiet) {
					logger?.debug(
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
										logger?.debug(
											`Path mapping resolved: ${args.path} -> ${pathWithExt}`,
										);
										return { path: normalizePathForEsbuild(pathWithExt) };
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
							logger?.debug(
								`Direct env import resolved: ${args.path} -> ${pathWithExt}`,
							);
							return { path: normalizePathForEsbuild(pathWithExt) };
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
							logger?.debug(
								`Relative import resolved via baseUrl: ${args.path} -> ${pathWithExt}`,
							);
							return { path: normalizePathForEsbuild(pathWithExt) };
						}
					}
				}
				return;
			});
		},
	};
}
