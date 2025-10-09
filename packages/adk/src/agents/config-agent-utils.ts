import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	type AgentRefConfig,
	type AnyAgentConfigYAML,
	BaseAgentConfigSchema,
	type BuiltInAgentConfigYAML,
	type CodeConfig,
	isBuiltInAgentClass,
	LoopAgentConfigSchema,
	ParallelAgentConfigSchema,
	SequentialAgentConfigSchema,
	validateAnyAgentConfig,
} from "./agent-config";
import type { BaseAgent } from "./base-agent";
import { LlmAgent } from "./llm-agent";
import { LoopAgent } from "./loop-agent";
import { ParallelAgent } from "./parallel-agent";
import { SequentialAgent } from "./sequential-agent";

/**
 * Experimental: YAML-driven Agent construction for TypeScript ADK
 *
 * This mirrors the python implementation:
 * - Load YAML
 * - Validate with discriminated schemas
 * - Construct built-in agents directly
 * - Resolve sub-agents via AgentRefConfig (config_path/code)
 * - For custom agents, delegate to class static fromConfig or configSchema
 */

function ensureArray<T>(v: T | T[] | undefined): T[] | undefined {
	if (v == null) return undefined;
	return Array.isArray(v) ? (v as T[]) : [v as T];
}

function isFunction(v: unknown): v is (...args: any[]) => any {
	return typeof v === "function";
}

function isBaseAgentInstance(v: unknown): v is BaseAgent {
	return (
		!!v &&
		typeof v === "object" &&
		typeof (v as BaseAgent).name === "string" &&
		typeof (v as BaseAgent).runAsync === "function"
	);
}

/**
 * Dynamic module loader that supports:
 * - package/module ids (e.g. "my-lib/agents")
 * - absolute paths (e.g. "/abs/path/to/mod.js")
 * - relative paths resolved against baseDir (e.g. "./mod.ts")
 */
async function importModule(
	moduleId: string,
	baseDir?: string,
): Promise<Record<string, any>> {
	let target = moduleId;
	// If relative path, resolve to absolute file URL
	if (moduleId.startsWith("./") || moduleId.startsWith("../")) {
		if (!baseDir)
			throw new Error(
				`Relative module path '${moduleId}' requires a base directory`,
			);
		const abs = resolve(baseDir, moduleId);
		target = pathToFileURL(abs).href;
	} else if (isAbsolute(moduleId)) {
		target = pathToFileURL(moduleId).href;
	}
	return (await import(target)) as Record<string, any>;
}

/**
 * Resolve code reference "module#exportName"
 */
async function resolveCodeReference<T = unknown>(
	codeRef: string,
	baseDir?: string,
): Promise<T> {
	const [moduleId, exportNameRaw] = codeRef.split("#");
	if (!moduleId) {
		throw new Error(`Invalid code reference '${codeRef}': missing module id`);
	}
	const mod = await importModule(moduleId, baseDir);
	const exportName = exportNameRaw ?? "default";
	const picked = (mod as any)[exportName];
	if (picked === undefined) {
		const available = Object.keys(mod).join(", ");
		throw new Error(
			`Export '${exportName}' not found in module '${moduleId}'. Available: [${available}]`,
		);
	}
	return picked as T;
}

/**
 * Resolve a list of CodeConfig into callables/objects
 */
async function resolveCodeList(
	list: CodeConfig[] | undefined,
	baseDir: string,
): Promise<any[] | undefined> {
	if (!list || list.length === 0) return undefined;
	const results: any[] = [];
	for (const item of list) {
		const entity = await resolveCodeReference<any>(item.code, baseDir);
		results.push(entity);
	}
	return results;
}

/**
 * Resolve AgentRefConfig to a BaseAgent
 */
export async function resolveAgentReference(
	ref: AgentRefConfig,
	baseDir: string,
): Promise<BaseAgent> {
	if (ref.config_path) {
		const configPath = ref.config_path.startsWith(".")
			? resolve(baseDir, ref.config_path)
			: ref.config_path;
		return await fromConfig(configPath);
	}
	if (ref.code) {
		const instance = await resolveCodeReference<any>(ref.code, baseDir);
		if (!isBaseAgentInstance(instance)) {
			throw new Error(
				`Code reference '${ref.code}' did not resolve to a BaseAgent instance`,
			);
		}
		return instance;
	}
	throw new Error("AgentRefConfig must specify either config_path or code");
}

/**
 * Load raw YAML and validate into concrete config type
 */
async function loadAndValidateConfig(
	configPath: string,
): Promise<{ config: AnyAgentConfigYAML; baseDir: string }> {
	const absPath = isAbsolute(configPath)
		? configPath
		: resolve(process.cwd(), configPath);
	const baseDir = dirname(absPath);
	const rawText = readFileSync(absPath, "utf-8");

	let rawObj: unknown;
	try {
		const yamlMod: any = await import("yaml");
		const parse = yamlMod?.parse || yamlMod?.default?.parse;
		if (!parse) {
			throw new Error("Failed to load YAML parser: parse() not found");
		}
		rawObj = parse(rawText);
	} catch (e) {
		throw new Error(
			`Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`,
		);
	}

	const config = validateAnyAgentConfig(rawObj);
	return { config, baseDir };
}

/**
 * Construct built-in agent instances with snake_case -> camelCase mapping
 */
async function constructBuiltInAgent(
	config: BuiltInAgentConfigYAML,
	baseDir: string,
): Promise<BaseAgent> {
	// Common: sub agents and before/after agent callbacks
	const subAgents: BaseAgent[] = [];
	for (const ref of config.sub_agents ?? []) {
		subAgents.push(await resolveAgentReference(ref, baseDir));
	}

	const beforeAgentCallbacksList = await resolveCodeList(
		config.before_agent_callbacks ?? [],
		baseDir,
	);
	const afterAgentCallbacksList = await resolveCodeList(
		config.after_agent_callbacks ?? [],
		baseDir,
	);

	switch (config.agent_class) {
		case "LlmAgent": {
			// Tools may be functions or BaseTool instances via code refs
			const tools = (await resolveCodeList(config.tools ?? [], baseDir)) ?? [];

			// Model/tool callbacks
			const beforeModelCallbacks = await resolveCodeList(
				config.before_model_callbacks ?? [],
				baseDir,
			);
			const afterModelCallbacks = await resolveCodeList(
				config.after_model_callbacks ?? [],
				baseDir,
			);
			const beforeToolCallbacks = await resolveCodeList(
				config.before_tool_callbacks ?? [],
				baseDir,
			);
			const afterToolCallbacks = await resolveCodeList(
				config.after_tool_callbacks ?? [],
				baseDir,
			);

			const agent = new LlmAgent({
				name: config.name,
				description: config.description ?? "",
				subAgents,
				beforeAgentCallback: ensureArray(beforeAgentCallbacksList) as any,
				afterAgentCallback: ensureArray(afterAgentCallbacksList) as any,

				instruction: config.instruction ?? "",
				globalInstruction: config.global_instruction ?? "",
				model: config.model ?? "",

				disallowTransferToParent: config.disallow_transfer_to_parent ?? false,
				disallowTransferToPeers: config.disallow_transfer_to_peers ?? false,
				includeContents: (config.include_contents as any) ?? "default",
				outputKey: config.output_key,

				tools: tools as any[],

				beforeModelCallback: ensureArray(beforeModelCallbacks) as any,
				afterModelCallback: ensureArray(afterModelCallbacks) as any,
				beforeToolCallback: ensureArray(beforeToolCallbacks) as any,
				afterToolCallback: ensureArray(afterToolCallbacks) as any,
			});

			return agent;
		}
		case "LoopAgent": {
			const parsed = LoopAgentConfigSchema.parse(config);
			return new LoopAgent({
				name: parsed.name,
				description: parsed.description ?? "",
				subAgents,
				maxIterations: parsed.max_iterations,
			});
		}
		case "ParallelAgent": {
			const parsed = ParallelAgentConfigSchema.parse(config);
			return new ParallelAgent({
				name: parsed.name,
				description: parsed.description ?? "",
				subAgents,
			});
		}
		case "SequentialAgent": {
			const parsed = SequentialAgentConfigSchema.parse(config);
			return new SequentialAgent({
				name: parsed.name,
				description: parsed.description ?? "",
				subAgents,
			});
		}
	}
	// Should be unreachable due to discriminated parse
	throw new Error(
		`Unsupported built-in agent_class: ${(config as any).agent_class}`,
	);
}

/**
 * Construct a custom (user-defined) agent class.
 *
 * Conventions for custom classes:
 * - agent_class MUST be a code reference "module#ExportClass".
 * - If the class defines static fromConfig(yamlConfig: any, configDir: string): Promise<BaseAgent> | BaseAgent
 *   then it will be used.
 * - Else, if the class defines static configSchema (Zod schema), the YAML will be re-validated and `new Class(parsed)` will be invoked.
 * - Else, we throw with guidance to implement one of the above for best parity with python ADK.
 */
async function constructCustomAgent(
	baseYaml: any,
	baseDir: string,
): Promise<BaseAgent> {
	const baseParsed = BaseAgentConfigSchema.parse(baseYaml);
	const codeRef = baseParsed.agent_class;
	if (!codeRef.includes("#")) {
		throw new Error(
			`Custom agent_class must be a 'module#Export' code reference (received '${codeRef}'). Example: "./my_agents#MyCustomAgent"`,
		);
	}

	const AgentClass = await resolveCodeReference<any>(codeRef, baseDir);
	if (!isFunction(AgentClass)) {
		throw new Error(
			`agent_class '${codeRef}' did not resolve to a class/function`,
		);
	}

	// Prefer static fromConfig
	if (
		"fromConfig" in AgentClass &&
		isFunction((AgentClass as any).fromConfig)
	) {
		const instance = await (AgentClass as any).fromConfig(baseYaml, baseDir);
		if (!isBaseAgentInstance(instance)) {
			throw new Error(
				`fromConfig on '${codeRef}' did not return a BaseAgent instance`,
			);
		}
		return instance;
	}

	// Fall back to static configSchema
	if ("configSchema" in AgentClass) {
		const schema = (AgentClass as any).configSchema;
		if (!schema || !isFunction(schema.parse)) {
			throw new Error(
				`configSchema on '${codeRef}' must be a Zod schema with parse()`,
			);
		}
		const parsed = schema.parse(baseYaml);
		// Use a permissive constructor type to support classes without losing runtime checks
		const Ctor: any = AgentClass;
		const instance: BaseAgent = new Ctor(parsed);
		if (!isBaseAgentInstance(instance)) {
			throw new Error(
				`Constructed instance of '${codeRef}' is not a BaseAgent`,
			);
		}
		return instance;
	}

	throw new Error(
		`Custom agent '${codeRef}' must implement static fromConfig(yaml, baseDir) or expose static configSchema for construction.`,
	);
}

/**
 * Entry point: Construct an agent from YAML file path
 */
export async function fromConfig(configPath: string): Promise<BaseAgent> {
	const { config, baseDir } = await loadAndValidateConfig(configPath);

	if (isBuiltInAgentClass((config as any).agent_class)) {
		return await constructBuiltInAgent(
			config as BuiltInAgentConfigYAML,
			baseDir,
		);
	}

	// Custom agent path
	return await constructCustomAgent(config, baseDir);
}
