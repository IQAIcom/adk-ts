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
	/**
	 * Serve bundled web UI from the CLI package.
	 * When enabled, static files from the web/ directory are served on the same port.
	 * Used by the `adk web` command for bundled mode.
	 */
	serveWeb?: boolean;
}

export const RUNTIME_CONFIG = "RUNTIME_CONFIG";
