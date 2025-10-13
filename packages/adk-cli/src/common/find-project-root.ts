import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

/**
 * Finds the root directory of a project by walking upward from a starting path.
 */
export function findProjectRoot(startDir: string) {
	const normalizedStart = normalizePath(resolve(startDir));
	let current = normalizedStart;
	const { root } = parse(current);

	while (true) {
		// Check if current directory contains a marker file or folder
		if (
			["package.json", "tsconfig.json", ".env", ".git"].some((marker) =>
				existsSync(join(current, marker)),
			)
		) {
			return current;
		}

		const parent = normalizePath(dirname(current));

		// Stop if we've reached filesystem root (e.g., "/" or "C:\")
		if (parent === current || parent === normalizePath(root)) {
			break;
		}

		current = parent;
	}

	// Fallback to the normalized starting path if no project markers were found
	return normalizedStart;
}

/**
 * Normalizes path separators to forward slashes for cross-platform comparison.
 */
function normalizePath(p: string) {
	return p.replace(/\\/g, "/");
}
