import axios from "axios";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class WebSearchTool extends BaseTool {
	constructor() {
		super({
			name: "web_search",
			description: "Search the web for current information",
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
						description: "Search terms",
					},
				},
				required: ["query"],
			},
		};
	}

	async runAsync(args: { query: string }, _context: ToolContext): Promise<any> {
		const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
		const cx = process.env.GOOGLE_SEARCH_CX;

		if (!apiKey || !cx) {
			return {
				success: false,
				error:
					"Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX environment variables",
			};
		}

		try {
			const response = await axios.get(
				"https://www.googleapis.com/customsearch/v1",
				{
					params: {
						key: apiKey,
						cx: cx,
						q: args.query,
						num: 10,
					},
				},
			);

			const items = response.data.items || [];
			const results = items.map((item: any) => ({
				title: item.title,
				url: item.link,
				snippet: item.snippet,
				publishedAt: item.pagemap?.metatags?.[0]?.["article:published_time"],
			}));

			return {
				success: true,
				data: results,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
