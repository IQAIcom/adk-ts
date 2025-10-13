import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

/**
 * Cross-platform safe project root discovery.
 * Works consistently on Windows (C:\) and Unix (/)
 */
export function findProjectRoot(startDir: string): string {
	let currentDir = fixPath(resolve(startDir));
	const { root } = parse(currentDir);

	while (true) {
		if (
			["package.json", "tsconfig.json", ".env", ".git"].some((marker) =>
				existsSync(join(currentDir, marker)),
			)
		) {
			return currentDir;
		}

		const parentDir = fixPath(dirname(currentDir));
		if (parentDir === currentDir || parentDir === fixPath(root)) {
			break;
		}
		currentDir = parentDir;
	}

	return fixPath(resolve(startDir));
}

/**
 * Force forward slashes for consistent cross-platform path comparison.
 */
function fixPath(p: string): string {
	return p.replace(/\\/g, "/");
}
