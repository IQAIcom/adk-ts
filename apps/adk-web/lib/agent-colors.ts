// Agent color enum for type safety and consistency
export enum AgentColor {
	BLUE = "blue",
	GREEN = "green",
	PURPLE = "purple",
	ORANGE = "orange",
	PINK = "pink",
	CYAN = "cyan",
	LIME = "lime",
	INDIGO = "indigo",
	DEFAULT = "default",
}

// Array of available agent colors (excluding DEFAULT)
export const AGENT_COLORS = [
	AgentColor.BLUE,
	AgentColor.GREEN,
	AgentColor.PURPLE,
	AgentColor.ORANGE,
	AgentColor.PINK,
	AgentColor.CYAN,
	AgentColor.LIME,
	AgentColor.INDIGO,
] as const;
