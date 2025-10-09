import { z } from "zod";

/**
 * Experimental: Agent Config (YAML-driven agent construction)
 *
 * This module defines zod schemas and TS types that represent the YAML-based
 * configuration for agents. A separate factory will load YAML, validate with
 * these schemas, and construct concrete agent instances.
 *
 * Parity goals with adk-python:
 * - Discriminator on `agent_class` for built-in agents.
 * - Fallback path for custom/user-defined agents.
 * - Composition via sub-agent references (config_path/code).
 * - Callback resolution via code references.
 *
 * Note on field naming:
 * - YAML commonly uses snake_case. We validate snake_case keys here and the
 *   construction pipeline will map them to ADK's camelCase constructor fields.
 */

/**
 * A reference to code (module and export), e.g.:
 *   - "my-package/agents#supportAgent"
 *   - "./relative/path/to/module#exportName"
 *   - "/abs/path/to/module#default"
 */
export const CodeConfigSchema = z.object({
	code: z.string().min(1, "code must be a non-empty module#export string"),
});
export type CodeConfig = z.infer<typeof CodeConfigSchema>;

/**
 * Reference to another agent, either from another YAML (config_path)
 * or a pre-instantiated agent object from code export (code).
 */
export const AgentRefConfigSchema = z
	.object({
		config_path: z
			.string()
			.min(1, "config_path must be a non-empty path")
			.optional(),
		code: z
			.string()
			.min(1, "code must be a non-empty module#export string")
			.optional(),
	})
	.refine(
		(v) => (v.config_path ? 1 : 0) + (v.code ? 1 : 0) === 1,
		"Provide either config_path or code, but not both",
	);
export type AgentRefConfig = z.infer<typeof AgentRefConfigSchema>;

/**
 * Common fields for all agents (base schema)
 * These are validated for both built-ins and custom agents.
 */
export const BaseAgentConfigSchema = z.object({
	agent_class: z.string().min(1, "agent_class is required"),
	name: z
		.string()
		.min(1, "name is required")
		.regex(
			/^[a-zA-Z_][a-zA-Z0-9_]*$/,
			"Agent name must be a valid identifier (letters, digits, underscores; cannot start with a digit)",
		),
	description: z.string().default(""),
	sub_agents: z.array(AgentRefConfigSchema).default([]),

	// Callbacks resolved from code references
	before_agent_callbacks: z.array(CodeConfigSchema).default([]),
	after_agent_callbacks: z.array(CodeConfigSchema).default([]),
});
export type BaseAgentConfig = z.infer<typeof BaseAgentConfigSchema>;

/**
 * Built-in: LlmAgent YAML schema (snake_case fields)
 */
export const LlmAgentConfigSchema = BaseAgentConfigSchema.extend({
	agent_class: z.literal("LlmAgent"),
	instruction: z.string().optional(),
	global_instruction: z.string().optional(),
	model: z.string().optional(),

	// Transfer controls
	disallow_transfer_to_parent: z.boolean().optional(),
	disallow_transfer_to_peers: z.boolean().optional(),

	// Request shaping
	include_contents: z.enum(["default", "none"]).optional(),

	// State output
	output_key: z.string().optional(),

	// Optional tool list via code exports (functions/BaseTool/etc.)
	tools: z.array(CodeConfigSchema).optional(),

	// Optional before/after model/tool callbacks via code
	before_model_callbacks: z.array(CodeConfigSchema).optional(),
	after_model_callbacks: z.array(CodeConfigSchema).optional(),
	before_tool_callbacks: z.array(CodeConfigSchema).optional(),
	after_tool_callbacks: z.array(CodeConfigSchema).optional(),
});
export type LlmAgentConfigYAML = z.infer<typeof LlmAgentConfigSchema>;

/**
 * Built-in: LoopAgent YAML schema
 */
export const LoopAgentConfigSchema = BaseAgentConfigSchema.extend({
	agent_class: z.literal("LoopAgent"),
	max_iterations: z.number().int().positive().optional(),
});
export type LoopAgentConfigYAML = z.infer<typeof LoopAgentConfigSchema>;

/**
 * Built-in: ParallelAgent YAML schema
 */
export const ParallelAgentConfigSchema = BaseAgentConfigSchema.extend({
	agent_class: z.literal("ParallelAgent"),
});
export type ParallelAgentConfigYAML = z.infer<typeof ParallelAgentConfigSchema>;

/**
 * Built-in: SequentialAgent YAML schema
 */
export const SequentialAgentConfigSchema = BaseAgentConfigSchema.extend({
	agent_class: z.literal("SequentialAgent"),
});
export type SequentialAgentConfigYAML = z.infer<
	typeof SequentialAgentConfigSchema
>;

/**
 * Union type for built-in agent config (validated by agent_class)
 */
export type BuiltInAgentConfigYAML =
	| LlmAgentConfigYAML
	| LoopAgentConfigYAML
	| ParallelAgentConfigYAML
	| SequentialAgentConfigYAML;

/**
 * Root union type for any agent config parsed from YAML.
 * For custom agents (non-built-in agent_class), we keep BaseAgentConfig
 * and the construction pipeline revalidates against the custom agent's
 * declared schema (if provided).
 */
export type AnyAgentConfigYAML = BuiltInAgentConfigYAML | BaseAgentConfig;

/**
 * Helper to detect if an agent_class corresponds to a built-in
 */
export function isBuiltInAgentClass(agentClass: string): boolean {
	return (
		agentClass === "LlmAgent" ||
		agentClass === "LoopAgent" ||
		agentClass === "ParallelAgent" ||
		agentClass === "SequentialAgent"
	);
}

/**
 * Validate a raw object loaded from YAML into a typed config.
 * - If built-in, validates against the specific built-in schema.
 * - Otherwise validates against base schema (custom path).
 */
export function validateAnyAgentConfig(raw: unknown): AnyAgentConfigYAML {
	const base = BaseAgentConfigSchema.parse(raw);
	if (isBuiltInAgentClass(base.agent_class)) {
		switch (base.agent_class) {
			case "LlmAgent":
				return LlmAgentConfigSchema.parse(raw);
			case "LoopAgent":
				return LoopAgentConfigSchema.parse(raw);
			case "ParallelAgent":
				return ParallelAgentConfigSchema.parse(raw);
			case "SequentialAgent":
				return SequentialAgentConfigSchema.parse(raw);
		}
	}
	// Custom agent path - validated only by base here
	return base;
}
