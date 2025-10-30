// Tool category definitions for consistent categorization across the application
export const TOOL_CATEGORIES = [
	{ value: "all", label: "All Categories" },
	{ value: "search", label: "Search Tools" },
	{ value: "data", label: "Data Tools" },
	{ value: "api", label: "API Tools" },
	{ value: "file", label: "File Tools" },
	{ value: "ai", label: "AI Tools" },
] as const;

// Type for tool category values (excluding "all")
export type ToolCategory = Exclude<
	(typeof TOOL_CATEGORIES)[number]["value"],
	"all"
>;

// Helper function to get category label by value
export const getCategoryLabel = (value: string): string => {
	const category = TOOL_CATEGORIES.find((cat) => cat.value === value);
	return category?.label || "Unknown Category";
};

// Helper function to get all category values (excluding "all")
export const getCategoryValues = (): ToolCategory[] => {
	return TOOL_CATEGORIES.filter((cat) => cat.value !== "all").map(
		(cat) => cat.value as ToolCategory,
	);
};
