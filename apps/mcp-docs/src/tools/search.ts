import type { FastMCP } from "fastmcp";
import { z } from "zod";
import { getDocs } from "../docs/store.js";
import { logger } from "../logger.js";
import type { SearchResult } from "../types.js";

const searchInputSchema = z.object({
	query: z.string().min(1).describe("Search query"),
	category: z
		.enum([
			"framework",
			"agents",
			"tools",
			"sessions",
			"memory",
			"mcp-servers",
			"cli",
			"examples",
			"api",
			"concepts",
			"reference",
		])
		.optional()
		.describe("Filter by documentation category"),
	limit: z
		.number()
		.min(1)
		.max(20)
		.optional()
		.default(5)
		.describe("Maximum results to return"),
});

type SearchInput = z.infer<typeof searchInputSchema>;

// TF-IDF-like scoring
function calculateScore(
	doc: { title: string; content: string },
	query: string,
): number {
	const queryLower = query.toLowerCase();
	const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);
	const titleLower = doc.title.toLowerCase();
	const contentLower = doc.content.toLowerCase();

	let score = 0;

	// Exact phrase match in title (Highest boost)
	if (titleLower.includes(queryLower)) {
		score += 50;
	}

	// Exact phrase match in content
	if (contentLower.includes(queryLower)) {
		score += 30;
	}

	for (const term of queryTerms) {
		// Title matches
		if (titleLower.includes(term)) {
			score += 15;
			if (titleLower.startsWith(term)) score += 5;
		}

		// Count content occurrences
		const regex = new RegExp(term, "gi");
		const contentMatches = (contentLower.match(regex) || []).length;

		if (contentMatches > 0) {
			// TF component (log-scaled to prevent long docs from dominating too much)
			const tf = Math.log10(contentMatches + 1) * 10;
			score += tf;
		}
	}

	return score;
}

// Extract relevant snippet around query match
function extractSnippet(
	content: string,
	query: string,
	maxLength = 300,
): string {
	const queryLower = query.toLowerCase();
	const contentLower = content.toLowerCase();

	// Find best match (prefer exact phrase if possible)
	let bestIndex = contentLower.indexOf(queryLower);

	if (bestIndex === -1) {
		const terms = queryLower.split(/\s+/).filter((t) => t.length > 2);
		for (const term of terms) {
			const index = contentLower.indexOf(term);
			if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
				bestIndex = index;
			}
		}
	}

	if (bestIndex === -1) {
		return `${content.slice(0, maxLength).trim()}...`;
	}

	// Extract context around match, trying to break at sentence boundaries if possible
	const start =
		Math.max(0, content.lastIndexOf(". ", bestIndex) + 2) ||
		Math.max(0, bestIndex - 60);
	const end = Math.min(content.length, bestIndex + maxLength);

	let snippet = content.slice(start, end).trim().replace(/\s+/g, " "); // Normalize whitespace

	if (start > 0) snippet = `...${snippet}`;
	if (end < content.length) snippet = `${snippet}...`;

	return snippet;
}

export function registerSearchTool(server: FastMCP) {
	server.addTool({
		name: "adkSearch",
		description: `Search ADK-TS documentation by keyword or concept.
    Returns ranked results with relevance scoring.
    Use the category filter to narrow results to specific areas:
    - framework: Core framework docs
    - agents: Agent building guides
    - tools: Tool integration
    - mcp-servers: MCP server integrations
    - cli: CLI documentation
    - examples: Code examples
    - api: API reference`,
		parameters: searchInputSchema,
		execute: async (args: SearchInput) => {
			const { query, category, limit = 5 } = args;
			logger.debug("Executing adkSearch tool", { query, category, limit });

			try {
				const docs = getDocs();

				const results: SearchResult[] = docs
					.filter((doc) => !category || doc.category === category)
					.map((doc) => {
						const score = calculateScore(doc, query);
						if (score === 0) return null;

						return {
							title: doc.title,
							path: doc.path,
							category: doc.category,
							snippet: extractSnippet(doc.content, query),
							score,
						};
					})
					.filter((r): r is SearchResult => r !== null)
					.sort((a, b) => b.score - a.score)
					.slice(0, limit);

				if (results.length === 0) {
					return JSON.stringify(
						{
							message: `No results found for "${query}"${category ? ` in category "${category}"` : ""}.`,
							suggestions: [
								"Try broader search terms",
								"Remove category filter to search all docs",
								"Use adkDocs to browse documentation structure",
							],
						},
						null,
						2,
					);
				}

				return JSON.stringify(
					{
						query,
						totalResults: results.length,
						results: results.map((r) => ({
							title: r.title,
							path: r.path,
							category: r.category,
							snippet: r.snippet,
							relevance: Math.round(r.score * 10) / 10,
						})),
					},
					null,
					2,
				);
			} catch (error) {
				logger.error("Failed to execute adkSearch tool", error);
				throw error;
			}
		},
	});
}
