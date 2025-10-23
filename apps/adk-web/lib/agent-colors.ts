// Agent color type for type safety and consistency
export type AgentColor =
	| "blue"
	| "green"
	| "purple"
	| "orange"
	| "pink"
	| "cyan"
	| "lime"
	| "indigo"
	| "default";

// Array of available agent colors (excluding "default")
export const AGENT_COLORS = [
	"blue",
	"green",
	"purple",
	"orange",
	"pink",
	"cyan",
	"lime",
	"indigo",
] as const satisfies readonly AgentColor[];
