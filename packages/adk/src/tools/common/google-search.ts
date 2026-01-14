import { Logger } from "@adk/logger";
import { Type } from "@google/genai";
import axios, { AxiosResponse } from "axios";
import { z } from "zod";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class GoogleSearch extends BaseTool {
	protected logger = new Logger({ name: "GoogleSearch" });

	constructor() {
		super({
			name: "google_search",
			description:
				"Search the web using Google Custom Search API with full customization",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					query: {
						type: Type.STRING,
						description: "The search query to execute",
					},
					numResults: {
						type: Type.INTEGER,
						description: "Number of results (max 10)",
						default: 5,
					},
					start: {
						type: Type.INTEGER,
						description: "Start index for pagination",
						default: 1,
					},
					safe: {
						type: Type.STRING,
						enum: ["active", "off"],
						description: "Safe search filter",
						default: "off",
					},
					siteSearch: {
						type: Type.STRING,
						description: "Restrict results to a specific site",
					},
					siteSearchFilter: {
						type: Type.STRING,
						enum: ["i", "e"],
						description: "Include or exclude site",
					},
					lr: {
						type: Type.STRING,
						description: "Language restriction, e.g., 'lang_en'",
					},
					cr: {
						type: Type.STRING,
						description: "Country restriction, e.g., 'countryUS'",
					},
					fields: {
						type: Type.STRING,
						description: "Partial response fields to reduce payload",
					},
				},
				required: ["query"],
			},
		};
	}

	async runAsync(
		rawArgs: unknown,
		_context: ToolContext,
	): Promise<{
		results?: GoogleSearchResult[];
		success: boolean;
		error?: string;
	}> {
		const argsResult = googleSearchArgsSchema.safeParse(rawArgs);
		if (!argsResult.success) {
			return { success: false, error: argsResult.error.message };
		}

		const {
			query,
			numResults,
			start,
			safe,
			siteSearch,
			siteSearchFilter,
			lr,
			cr,
			fields,
		} = argsResult.data;

		const apiKey = process.env.GOOGLE_API_KEY;
		const cseId = process.env.GOOGLE_CSE_ID;

		if (!apiKey || !cseId) {
			return {
				success: false,
				error: "Missing GOOGLE_API_KEY or GOOGLE_CSE_ID environment variable",
			};
		}

		this.logger.debug(`[GoogleSearch] Executing search for query: ${query}`);

		try {
			const response: AxiosResponse<GoogleSearchAPIResponse> = await axios.get(
				"https://www.googleapis.com/customsearch/v1",
				{
					params: {
						key: apiKey,
						cx: cseId,
						q: query,
						num: numResults,
						start,
						safe,
						siteSearch,
						siteSearchFilter,
						lr,
						cr,
						fields,
					},
				},
			);

			const items = response.data.items ?? [];

			const results: GoogleSearchResult[] = items.map((item) => ({
				title: item.title,
				link: item.link,
				snippet: item.snippet,
			}));

			return { success: true, results };
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			this.logger.error(
				`[GoogleSearch] Error executing search: ${errorMessage}`,
			);
			return { success: false, error: errorMessage };
		}
	}
}

export type GoogleSearchArgs = z.infer<typeof googleSearchArgsSchema>;

export const googleSearchArgsSchema = z.object({
	query: z.string().min(1, "Query cannot be empty"),
	numResults: z.number().int().min(1).max(10).default(5),
	start: z.number().int().min(1).default(1),
	safe: z.enum(["active", "off"]).default("off"),
	siteSearch: z.string().optional(),
	siteSearchFilter: z.enum(["i", "e"]).optional(),
	lr: z.string().optional(),
	cr: z.string().optional(),
	fields: z.string().optional(),
});

export type GoogleSearchResult = {
	title: string;
	link: string;
	snippet: string;
};

interface GoogleSearchItem {
	title: string;
	link: string;
	snippet: string;
}

interface GoogleSearchAPIResponse {
	items?: GoogleSearchItem[];
}
