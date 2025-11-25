import type { ESBuildPlugin } from "../agent-loader.types";

export function createExternalizePlugin(
	alwaysExternal: string[] = ["@iqai/adk"],
	scopes: string[] = ["@iqai/"],
): ESBuildPlugin {
	const ALWAYS_EXTERNAL_SCOPES = scopes;
	const explicitExternals = new Set(alwaysExternal);

	return {
		name: "externalize-bare-imports",
		setup(build) {
			build.onResolve({ filter: /.*/ }, (args) => {
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
					explicitExternals.has(args.path)
				) {
					return { path: args.path, external: true };
				}
				return { path: args.path, external: true };
			});
		},
	};
}

export function isRebuildNeeded(
	outFile: string,
	sourceFile: string,
	tsconfigPath: string,
	logger?: { debug: (m: string) => void; warn: (...args: any[]) => void },
	quiet = false,
): boolean {
	const { existsSync, statSync } =
		require("node:fs") as typeof import("node:fs");
	if (!existsSync(outFile)) return true;
	try {
		const outStat = statSync(outFile);
		const srcStat = statSync(sourceFile);
		const tsconfigMtime = existsSync(tsconfigPath)
			? statSync(tsconfigPath).mtimeMs
			: 0;
		const needRebuild = !(
			outStat.mtimeMs >= srcStat.mtimeMs && outStat.mtimeMs >= tsconfigMtime
		);
		if (!needRebuild && !quiet) {
			logger?.debug?.(`Reusing cached build: ${outFile}`);
		}
		return needRebuild;
	} catch (error) {
		if (!quiet) {
			const msg = error instanceof Error ? error.message : String(error);
			logger?.warn?.(
				`Failed to check cache freshness for ${outFile}: ${msg}. Forcing rebuild.`,
			);
		}
		return true;
	}
}
