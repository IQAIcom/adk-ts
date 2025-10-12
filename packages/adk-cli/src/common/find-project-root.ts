import { existsSync } from "node:fs";
import { dirname, join, normalize, parse, resolve } from "node:path";

/**
 * Discover the project root by traversing up from a given directory
 * looking for package.json, tsconfig.json, .env, or .git files.
 */
export function findProjectRoot(startDir: string): string {
	// Normalize the starting directory path for cross-platform compatibility
	let projectRoot = normalize(resolve(startDir));
	const { root } = parse(projectRoot);

	// Traverse up the directory tree
	while (projectRoot !== root) {
		// Check for project markers
		if (
			["package.json", "tsconfig.json", ".env", ".git"].some((marker) =>
				existsSync(join(projectRoot, marker)),
			)
		) {
			return projectRoot;
		}

		// Move up one directory
		const parentDir = dirname(projectRoot);

		// Check if we've reached the root (handles both Unix '/' and Windows 'C:\')
		if (parentDir === projectRoot) {
			break;
		}

		projectRoot = parentDir;
	}

	// If no markers found, fall back to the normalized startDir
	return normalize(resolve(startDir));
}
