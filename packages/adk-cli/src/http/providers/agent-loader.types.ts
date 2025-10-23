import type { AgentBuilder, BaseAgent, BuiltAgent } from "@iqai/adk";
import { z } from "zod";

/**
 * Session state - keyed object with unknown values
 */
export type SessionState = Record<string, unknown>;

/**
 * Session-like object with optional state
 */
export interface SessionWithState {
	state?: SessionState;
}

/**
 * Possible agent export types
 */
export type PossibleAgentExport =
	| BaseAgent
	| AgentBuilder
	| BuiltAgent
	| { agent: BaseAgent | AgentBuilder | BuiltAgent }
	| (() =>
			| BaseAgent
			| AgentBuilder
			| BuiltAgent
			| Promise<BaseAgent | AgentBuilder | BuiltAgent>);

/**
 * TypeScript path configuration from tsconfig.json
 */
export interface TsConfigPaths {
	baseUrl?: string;
	paths?: Record<string, string[]>;
}

/**
 * ESBuild plugin setup callback arguments
 */
export interface ESBuildOnResolveArgs {
	path: string;
	importer: string;
	namespace: string;
	resolveDir: string;
	kind: string;
	pluginData: Record<string, string | number | boolean>;
}

/**
 * ESBuild plugin setup callback result
 */
export interface ESBuildOnResolveResult {
	path: string;
	external?: boolean;
	namespace?: string;
	pluginData?: Record<string, string | number | boolean>;
}

/**
 * ESBuild plugin setup interface
 */
export interface ESBuildPluginSetup {
	onResolve: (
		options: { filter: RegExp; namespace?: string },
		callback: (
			args: ESBuildOnResolveArgs,
		) => ESBuildOnResolveResult | undefined,
	) => void;
}

/**
 * ESBuild plugin structure
 */
export interface ESBuildPlugin {
	name: string;
	setup: (build: ESBuildPluginSetup) => void;
}

/**
 * Require-like interface for dynamic module loading
 */
export interface RequireLike {
	(id: string): ModuleExport;
	resolve?: (id: string) => string;
	cache?: Record<string, { exports: ModuleExport }>;
}

/**
 * Result of agent export resolution
 */
export interface AgentExportResult {
	agent: BaseAgent;
	builtAgent?: BuiltAgent;
}

/**
 * Possible agent export value types
 */
export type AgentExportValue =
	| BaseAgent
	| BuiltAgent
	| AgentBuilder
	| (() =>
			| BaseAgent
			| BuiltAgent
			| AgentBuilder
			| Promise<BaseAgent | BuiltAgent | AgentBuilder>);

/**
 * Module export shape from dynamic import
 */
export interface ModuleExport extends Record<string, unknown> {
	default?: AgentExportValue | ModuleExport | unknown;
	agent?: AgentExportValue | unknown;
}

/**
 * Zod schema for validating tsconfig.json structure
 */
export const TsConfigSchema = z.object({
	compilerOptions: z
		.object({
			baseUrl: z.string().optional(),
			paths: z.record(z.string(), z.array(z.string())).optional(),
		})
		.optional(),
});
