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
	/**
	 * Enable OpenAPI (Swagger) docs generation & UI at /docs and JSON at /openapi.json.
	 * Defaults to true in non-production when not provided. Disable explicitly in prod if needed.
	 */
	swagger?: boolean;
}

export const RUNTIME_CONFIG = "RUNTIME_CONFIG";
