import { Type } from "@google/genai";
import axios from "axios";
import { z } from "zod";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class WebSearchTool extends BaseTool {
	constructor() {
		super({
			name: "web_search",
			description:
				"Search the web for current information using Tavily, fully configurable",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					query: { type: Type.STRING, description: "Search terms" },
					searchDepth: {
						type: Type.STRING,
						enum: ["basic", "advanced", "fast", "ultra-fast"],
						description: "Search depth controlling latency vs relevance",
					},
					chunksPerSource: {
						type: Type.NUMBER,
						description: "Maximum chunks per source for advanced search",
					},
					maxResults: {
						type: Type.NUMBER,
						description: "Maximum number of search results to return",
					},
					topic: {
						type: Type.STRING,
						enum: ["general", "news", "finance"],
						description: "Category of the search",
					},
					timeRange: {
						type: Type.STRING,
						description: "Time range for filtering results",
					},
					startDate: {
						type: Type.STRING,
						description: "Return results after this date (YYYY-MM-DD)",
					},
					endDate: {
						type: Type.STRING,
						description: "Return results before this date (YYYY-MM-DD)",
					},
					includeAnswer: {
						type: Type.STRING,
						description:
							"Include an LLM-generated answer (true/basic/advanced)",
					},
					includeRawContent: {
						type: Type.STRING,
						description: "Include raw content (true/markdown/text)",
					},
					includeImages: {
						type: Type.BOOLEAN,
						description: "Include image search results",
					},
					includeImageDescriptions: {
						type: Type.BOOLEAN,
						description: "Include descriptive text for images",
					},
					includeFavicon: {
						type: Type.BOOLEAN,
						description: "Include favicon URL for results",
					},
					includeDomains: {
						type: Type.ARRAY,
						items: { type: Type.STRING },
						description: "Domains to include",
					},
					excludeDomains: {
						type: Type.ARRAY,
						items: { type: Type.STRING },
						description: "Domains to exclude",
					},
					country: {
						type: Type.STRING,
						description: "Country to prioritize results from",
					},
					autoParameters: {
						type: Type.BOOLEAN,
						description: "Automatically configure parameters based on query",
					},
					includeUsage: {
						type: Type.BOOLEAN,
						description: "Include credit usage info",
					},
				},
				required: ["query"],
			},
		};
	}

	async runAsync(rawArgs: unknown, _context: ToolContext): Promise<any> {
		const apiKey = process.env.TAVILY_API_KEY;

		if (!apiKey) {
			return {
				success: false,
				error: "Missing TAVILY_API_KEY environment variable",
			};
		}

		const argsResult = webSearchArgsSchema.safeParse(rawArgs);
		if (!argsResult.success) {
			return { success: false, error: z.treeifyError(argsResult.error) };
		}

		const args = argsResult.data;

		try {
			const response = await axios.post(
				"https://api.tavily.com/search",
				{
					query: args.query,
					search_depth: args.searchDepth,
					chunks_per_source: args.chunksPerSource,
					max_results: args.maxResults,
					topic: args.topic,
					time_range: args.timeRange,
					start_date: args.startDate,
					end_date: args.endDate,
					include_answer: args.includeAnswer,
					include_raw_content: args.includeRawContent,
					include_images: args.includeImages,
					include_image_descriptions: args.includeImageDescriptions,
					include_favicon: args.includeFavicon,
					include_domains: args.includeDomains,
					exclude_domains: args.excludeDomains,
					country: args.country,
					auto_parameters: args.autoParameters,
					include_usage: args.includeUsage,
				},
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
				},
			);

			const parsed = tavilySearchResponseSchema.safeParse(response.data);
			if (!parsed.success) {
				return {
					success: false,
					error: "Invalid response from Tavily API",
					details: z.treeifyError(parsed.error),
				};
			}

			return { success: true, data: parsed.data };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}

const webSearchArgsSchema = z.object({
	query: z.string().min(1, "Query cannot be empty"),

	searchDepth: z
		.enum(["basic", "advanced", "fast", "ultra-fast"])
		.default("basic"),
	chunksPerSource: z.number().int().min(1).max(3).default(3),

	maxResults: z.number().int().min(1).max(20).default(5),

	topic: z.enum(["general", "news", "finance"]).default("general"),

	timeRange: z
		.enum(["day", "week", "month", "year", "d", "w", "m", "y"])
		.nullable()
		.default(null),
	startDate: z.string().nullable().default(null),
	endDate: z.string().nullable().default(null),

	includeAnswer: z
		.union([z.boolean(), z.enum(["basic", "advanced"])])
		.default(false),

	includeRawContent: z
		.union([z.boolean(), z.enum(["markdown", "text"])])
		.default(false),

	includeImages: z.boolean().default(false),
	includeImageDescriptions: z.boolean().default(false),
	includeFavicon: z.boolean().default(false),

	includeDomains: z.array(z.string()).default([]),
	excludeDomains: z.array(z.string()).default([]),
	country: z.string().nullable().default(null),

	autoParameters: z.boolean().default(false),
	includeUsage: z.boolean().default(false),
});

const tavilySearchResultSchema = z.object({
	title: z.string(),
	url: z.string().url(),
	content: z.string(),
	raw_content: z.string().nullable().optional(),
	favicon: z.string().nullable().optional(),
	score: z.number().optional(),
});

const tavilySearchResponseSchema = z.object({
	query: z.string(),
	results: z.array(tavilySearchResultSchema),
	answer: z.string().optional(),
	images: z
		.array(z.object({ url: z.string(), description: z.string().optional() }))
		.optional(),
	auto_parameters: z.record(z.any(), z.string()).optional(),
	response_time: z.number(),
	usage: z.record(z.any(), z.string()).optional(),
	request_id: z.string().optional(),
});
