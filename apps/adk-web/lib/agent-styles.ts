import { AgentColor } from "./agent-colors";
import { getCategoryValues, type ToolCategory } from "./tool-categories";

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

// Tool category styling
export const getCategoryStyles = (category: string) => {
	switch (category) {
		case "search":
			return {
				bgColor: "bg-blue-50 dark:bg-blue-950",
				borderColor: "border-blue-300 dark:border-blue-700",
				textColor: "text-blue-700 dark:text-blue-300",
				iconColor: "text-blue-600 dark:text-blue-400",
			};
		case "data":
			return {
				bgColor: "bg-green-50 dark:bg-green-950",
				borderColor: "border-green-300 dark:border-green-700",
				textColor: "text-green-700 dark:text-green-300",
				iconColor: "text-green-600 dark:text-green-400",
			};
		case "communication":
			return {
				bgColor: "bg-purple-50 dark:bg-purple-950",
				borderColor: "border-purple-300 dark:border-purple-700",
				textColor: "text-purple-700 dark:text-purple-300",
				iconColor: "text-purple-600 dark:text-purple-400",
			};
		case "utility":
			return {
				bgColor: "bg-orange-50 dark:bg-orange-950",
				borderColor: "border-orange-300 dark:border-orange-700",
				textColor: "text-orange-700 dark:text-orange-300",
				iconColor: "text-orange-600 dark:text-orange-400",
			};
		case "ai":
			return {
				bgColor: "bg-pink-50 dark:bg-pink-950",
				borderColor: "border-pink-300 dark:border-pink-700",
				textColor: "text-pink-700 dark:text-pink-300",
				iconColor: "text-pink-600 dark:text-pink-400",
			};
		case "development":
			return {
				bgColor: "bg-cyan-50 dark:bg-cyan-950",
				borderColor: "border-cyan-300 dark:border-cyan-700",
				textColor: "text-cyan-700 dark:text-cyan-300",
				iconColor: "text-cyan-600 dark:text-cyan-400",
			};
		case "security":
			return {
				bgColor: "bg-red-50 dark:bg-red-950",
				borderColor: "border-red-300 dark:border-red-700",
				textColor: "text-red-700 dark:text-red-300",
				iconColor: "text-red-600 dark:text-red-400",
			};
		default:
			return {
				bgColor: "bg-secondary",
				borderColor: "border-secondary",
				textColor: "text-secondary-foreground",
				iconColor: "text-secondary-foreground",
			};
	}
};
