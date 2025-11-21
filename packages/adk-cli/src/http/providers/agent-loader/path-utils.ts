import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, normalize, resolve } from "node:path";
import { Logger } from "@nestjs/common";

export class PathUtils {
	constructor(
		private logger: Logger,
		private quiet = false,
	) {}

	normalizePath(path: string): string {
		return path.replace(/\\/g, "/");
	}

	parseTsConfigPaths(projectRoot: string): {
		baseUrl?: string;
		paths?: Record<string, string[]>;
	} {
		const tsconfigPath = join(projectRoot, "tsconfig.json");
		if (!existsSync(tsconfigPath)) return {};
		try {
			const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
			const { baseUrl, paths } = tsconfig.compilerOptions || {};
			return { baseUrl, paths };
		} catch (error) {
			this.logger.warn(`Failed to parse tsconfig.json: ${String(error)}`);
			return {};
		}
	}

	createExternalizePlugin() {
		return {
			name: "externalize-bare-imports",
			setup(build: any) {
				build.onResolve({ filter: /.*/ }, (args: any) => {
					const isAbsolutePath = /^[a-zA-Z]:/.test(args.path);
					if (
						args.path.startsWith(".") ||
						args.path.startsWith("/") ||
						args.path.startsWith("..") ||
						isAbsolutePath
					)
						return;
					return { path: args.path, external: true };
				});
			},
		};
	}

	createPathMappingPlugin(projectRoot: string) {
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
					if (!quiet)
						logger.debug(
							`Resolving import: "${args.path}" from "${args.importer || "unknown"}"`,
						);
					if (paths && !args.path.startsWith(".") && !isAbsolute(args.path)) {
						for (const [alias, mappings] of Object.entries(paths)) {
							const regex = new RegExp(`^${alias.replace("*", "(.*)")}$`);
							const match = args.path.match(regex);
							if (match) {
								for (const mapping of mappings) {
									const resolvedPath = mapping.includes("*")
										? mapping.replace("*", match[1])
										: mapping;
									const fullPath = normalize(
										resolve(resolvedBaseUrl, resolvedPath),
									);
									for (const ext of [".ts", ".js", ".tsx", ".jsx", ""]) {
										if (existsSync(fullPath + ext))
											return { path: fullPath + ext };
									}
								}
							}
						}
					}
					return;
				});
			},
		};
	}
}
