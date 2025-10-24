import { AgentColor } from "./agent-colors";
import type { ToolCategory } from "./tool-categories";

// Tool categorization function to reduce duplication and improve maintainability
export const getToolCategory = (label?: string): ToolCategory | "default" => {
	const labelLower = label?.toLowerCase() || "";

	if (labelLower.includes("search") || labelLower.includes("query"))
		return "search";
	if (labelLower.includes("data") || labelLower.includes("database"))
		return "data";
	if (labelLower.includes("api") || labelLower.includes("http")) return "api";
	if (labelLower.includes("file") || labelLower.includes("document"))
		return "file";
	if (labelLower.includes("ai") || labelLower.includes("llm")) return "ai";

	return "default";
};

// Agent styling based on color
export const getAgentStyles = (color: AgentColor) => {
	switch (color) {
		case "blue":
			return {
				bgColor: "bg-blue-50 dark:bg-blue-950",
				borderColor: "border-blue-500 dark:border-blue-400",
				textColor: "text-blue-700 dark:text-blue-300",
				iconColor: "text-blue-600 dark:text-blue-400",
				handleColor: "!bg-blue-500",
			};
		case "green":
			return {
				bgColor: "bg-green-50 dark:bg-green-950",
				borderColor: "border-green-500 dark:border-green-400",
				textColor: "text-green-700 dark:text-green-300",
				iconColor: "text-green-600 dark:text-green-400",
				handleColor: "!bg-green-500",
			};
		case "purple":
			return {
				bgColor: "bg-purple-50 dark:bg-purple-950",
				borderColor: "border-purple-500 dark:border-purple-400",
				textColor: "text-purple-700 dark:text-purple-300",
				iconColor: "text-purple-600 dark:text-purple-400",
				handleColor: "!bg-purple-500",
			};
		case "orange":
			return {
				bgColor: "bg-orange-50 dark:bg-orange-950",
				borderColor: "border-orange-500 dark:border-orange-400",
				textColor: "text-orange-700 dark:text-orange-300",
				iconColor: "text-orange-600 dark:text-orange-400",
				handleColor: "!bg-orange-500",
			};
		case "pink":
			return {
				bgColor: "bg-pink-50 dark:bg-pink-950",
				borderColor: "border-pink-500 dark:border-pink-400",
				textColor: "text-pink-700 dark:text-pink-300",
				iconColor: "text-pink-600 dark:text-pink-400",
				handleColor: "!bg-pink-500",
			};
		case "cyan":
			return {
				bgColor: "bg-cyan-50 dark:bg-cyan-950",
				borderColor: "border-cyan-500 dark:border-cyan-400",
				textColor: "text-cyan-700 dark:text-cyan-300",
				iconColor: "text-cyan-600 dark:text-cyan-400",
				handleColor: "!bg-cyan-500",
			};
		case "lime":
			return {
				bgColor: "bg-lime-50 dark:bg-lime-950",
				borderColor: "border-lime-500 dark:border-lime-400",
				textColor: "text-lime-700 dark:text-lime-300",
				iconColor: "text-lime-600 dark:text-lime-400",
				handleColor: "!bg-lime-500",
			};
		case "indigo":
			return {
				bgColor: "bg-indigo-50 dark:bg-indigo-950",
				borderColor: "border-indigo-500 dark:border-indigo-400",
				textColor: "text-indigo-700 dark:text-indigo-300",
				iconColor: "text-indigo-600 dark:text-indigo-400",
				handleColor: "!bg-indigo-500",
			};
		default:
			return {
				bgColor: "bg-card",
				borderColor: "border-primary",
				textColor: "text-card-foreground",
				iconColor: "text-primary",
				handleColor: "!bg-primary",
			};
	}
};

// Edge styling based on agent color
export const getEdgeStyles = (agentColor: AgentColor, isTool: boolean) => {
	if (!isTool) {
		// Agent-to-agent connections
		return {
			stroke: "var(--color-primary)",
			strokeWidth: 2.0,
			strokeDasharray: undefined,
		};
	}

	// Agent-to-tool connections - color code by agent
	switch (agentColor) {
		case "blue":
			return {
				stroke: "var(--color-blue-500)",
				strokeWidth: 2.5,
				strokeDasharray: "8 4",
			};
		case "green":
			return {
				stroke: "var(--color-green-500)",
				strokeWidth: 2.5,
				strokeDasharray: "6 3",
			};
		case "purple":
			return {
				stroke: "var(--color-purple-500)",
				strokeWidth: 2.5,
				strokeDasharray: "10 5",
			};
		case "orange":
			return {
				stroke: "var(--color-orange-500)",
				strokeWidth: 2.5,
				strokeDasharray: "12 6",
			};
		case "pink":
			return {
				stroke: "var(--color-pink-500)",
				strokeWidth: 2.5,
				strokeDasharray: "4 2",
			};
		case "cyan":
			return {
				stroke: "var(--color-cyan-500)",
				strokeWidth: 2.5,
				strokeDasharray: "6 4",
			};
		case "lime":
			return {
				stroke: "var(--color-lime-500)",
				strokeWidth: 2.5,
				strokeDasharray: "8 2",
			};
		case "indigo":
			return {
				stroke: "var(--color-indigo-500)",
				strokeWidth: 2.5,
				strokeDasharray: "10 3",
			};
		default:
			return {
				stroke: "var(--color-secondary-foreground)",
				strokeWidth: 2.25,
				strokeDasharray: "8 4",
			};
	}
};
