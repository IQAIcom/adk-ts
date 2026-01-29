import { z } from "zod";

// Document categories for ADK-TS documentation
export const DocCategorySchema = z.enum([
	"framework", // Core framework docs
	"agents", // Agent building guides
	"tools", // Tool integration
	"sessions", // Session management
	"memory", // Memory systems
	"mcp-servers", // MCP server integrations
	"cli", // CLI documentation
	"examples", // Code examples
	"api", // API reference
	"concepts", // Conceptual guides
	"reference", // Reference documentation
]);

export type DocCategory = z.infer<typeof DocCategorySchema>;

// Document section with full metadata
export const DocSectionSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	content: z.string(),
	path: z.string(),
	category: DocCategorySchema,
	frontmatter: z.record(z.unknown()).optional(),
});

export type DocSection = z.infer<typeof DocSectionSchema>;

// Code example with metadata
export const CodeExampleSchema = z.object({
	name: z.string(),
	path: z.string(),
	description: z.string().optional(),
	content: z.string(),
	language: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

export type CodeExample = z.infer<typeof CodeExampleSchema>;

// Changelog entry
export const ChangelogEntrySchema = z.object({
	package: z.string(),
	version: z.string().optional(),
	date: z.string().optional(),
	content: z.string(),
});

export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>;

// MCP Server configuration
export const McpServerInfoSchema = z.object({
	name: z.string(),
	description: z.string(),
	package: z.string(),
	category: z.string(),
	configExample: z.string().optional(),
	documentation: z.string().optional(),
});

export type McpServerInfo = z.infer<typeof McpServerInfoSchema>;

// Search result with scoring
export const SearchResultSchema = z.object({
	title: z.string(),
	path: z.string(),
	category: DocCategorySchema,
	snippet: z.string(),
	score: z.number(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// Tool input schemas
export const DocsInputSchema = z.object({
	path: z
		.string()
		.describe(
			"Path to the documentation file (e.g., 'framework/agents/llm-agents')",
		),
});

export type DocsInput = z.infer<typeof DocsInputSchema>;

export const SearchInputSchema = z.object({
	query: z.string().min(1).describe("Search query"),
	category: DocCategorySchema.optional().describe(
		"Filter by documentation category",
	),
	limit: z
		.number()
		.min(1)
		.max(20)
		.optional()
		.default(5)
		.describe("Maximum results"),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

export const McpServersInputSchema = z.object({
	server: z
		.string()
		.optional()
		.describe("Specific MCP server to get details for (e.g., 'near-agent')"),
	list: z
		.boolean()
		.optional()
		.default(false)
		.describe("Whether to list all available servers"),
});

export type McpServersInput = z.infer<typeof McpServersInputSchema>;

export const NavigateInputSchema = z.object({
	path: z
		.string()
		.optional()
		.default("")
		.describe("Directory path to explore (e.g., 'framework')"),
});

export type NavigateInput = z.infer<typeof NavigateInputSchema>;

export const InfoInputSchema = z.object({});

export type InfoInput = z.infer<typeof InfoInputSchema>;
