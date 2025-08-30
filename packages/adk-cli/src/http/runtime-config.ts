export interface RuntimeConfig {
	host: string;
	port: number;
	agentsDir: string;
	quiet: boolean;
	/**
	 * Enable file watching for hot reload behaviors.
	 * Defaults to true in non-production NODE_ENV when not provided.
	 */
	hotReload?: boolean;
	/**
	 * Optional additional globs/paths to watch. If not provided, agentsDir is watched.
	 */
	watchPaths?: string[];
}

export const RUNTIME_CONFIG = "RUNTIME_CONFIG";
