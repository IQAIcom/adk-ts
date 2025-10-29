import type { TsConfigPaths } from "../agent-loader.types";
import { TsConfigSchema } from "../agent-loader.types";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Logger } from "@nestjs/common";

export function parseTsConfigPaths(
	projectRoot: string,
	logger?: Logger,
): TsConfigPaths {
	const tsconfigPath = join(projectRoot, "tsconfig.json");
	if (!existsSync(tsconfigPath)) {
		return {};
	}

	try {
		const tsconfigContent = readFileSync(tsconfigPath, "utf-8");
		const tsconfigJson: unknown = JSON.parse(tsconfigContent);
		const parsed = TsConfigSchema.safeParse(tsconfigJson);

		if (!parsed.success) {
			logger?.warn(`Invalid tsconfig.json structure: ${parsed.error.message}`);
			return {};
		}

		const compilerOptions = parsed.data.compilerOptions || {};
		return {
			baseUrl: compilerOptions.baseUrl,
			paths: compilerOptions.paths,
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		logger?.warn(`Failed to parse tsconfig.json: ${msg}`);
		return {};
	}
}
