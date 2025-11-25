export function normalizePathForEsbuild(path: string): string {
	return path.replace(/\\/g, "/");
}
