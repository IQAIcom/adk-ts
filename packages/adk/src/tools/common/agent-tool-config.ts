import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYAML } from "yaml";
import { z } from "zod";
import {
	type AgentRefConfig,
	AgentRefConfigSchema,
} from "../../agents/agent-config";
import { resolveAgentReference } from "../../agents/config-agent-utils";
import { AgentTool } from "./agent-tool";

/**
 * Experimental: YAML-driven AgentTool construction
 *
 * Mirrors python AgentToolConfig using AgentRefConfig for nested agent reference.
 * Allows authoring tools in YAML that wrap a referenced agent (from YAML or code).
 */
export const AgentToolConfigYAMLSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	agent: AgentRefConfigSchema,
	function_declaration: z
		.object({
			code: z.string().min(1),
		})
		.optional(),
	output_key: z.string().optional(),
	skip_summarization: z.boolean().optional(),
	// Retry/long running flags are supported by AgentTool; allow configuring them too.
	is_long_running: z.boolean().optional(),
	should_retry_on_failure: z.boolean().optional(),
	max_retry_attempts: z.number().int().positive().optional(),
});
export type AgentToolConfigYAML = z.infer<typeof AgentToolConfigYAMLSchema>;

/**
 * Build an AgentTool from a validated YAML config object.
 */
export async function agentToolFromConfigObject(
	cfg: AgentToolConfigYAML,
	baseDir: string,
): Promise<AgentTool> {
	// Resolve inner agent via AgentRefConfig (config_path | code)
	const agent = await resolveAgentReference(
		cfg.agent as AgentRefConfig,
		baseDir,
	);

	// Optionally resolve function_declaration from code reference
	let functionDeclaration: any | undefined;
	if (cfg.function_declaration?.code) {
		const [moduleId, exportNameRaw] = cfg.function_declaration.code.split("#");
		const mod = await import(
			moduleId.startsWith("./") || moduleId.startsWith("../")
				? pathToFileURL(resolve(baseDir, moduleId)).href
				: moduleId,
		);
		const exportName = exportNameRaw ?? "default";
		functionDeclaration = (mod as any)[exportName];
		if (!functionDeclaration) {
			const available = Object.keys(mod).join(", ");
			throw new Error(
				`function_declaration export '${exportName}' not found in module '${moduleId}'. Available: [${available}]`,
			);
		}
	}

	return new AgentTool({
		name: cfg.name,
		description: cfg.description ?? agent.description,
		agent,
		functionDeclaration,
		outputKey: cfg.output_key,
		skipSummarization: cfg.skip_summarization ?? false,
		isLongRunning: cfg.is_long_running ?? false,
		shouldRetryOnFailure: cfg.should_retry_on_failure ?? false,
		maxRetryAttempts: cfg.max_retry_attempts ?? 3,
	});
}

/**
 * Load YAML from a path and construct an AgentTool.
 */
export async function agentToolFromConfigPath(
	configPath: string,
): Promise<AgentTool> {
	const absPath = isAbsolute(configPath)
		? configPath
		: resolve(process.cwd(), configPath);
	const baseDir = dirname(absPath);
	const raw = readFileSync(absPath, "utf-8");
	const parsed = parseYAML(raw);
	const cfg = AgentToolConfigYAMLSchema.parse(parsed);
	return agentToolFromConfigObject(cfg, baseDir);
}
