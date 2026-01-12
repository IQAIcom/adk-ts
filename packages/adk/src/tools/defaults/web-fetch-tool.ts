import axios from "axios";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export class WebFetchTool extends BaseTool {
	constructor() {
		super({
			name: "web_fetch",
			description: "Fetch and parse web page content",
		});
	}

	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					url: {
						type: Type.STRING,
						description: "Web page URL",
					},
				},
				required: ["url"],
			},
		};
	}

	async runAsync(args: { url: string }, _context: ToolContext): Promise<any> {
		try {
			const response = await axios.get(args.url, {
				timeout: 30000,
				maxRedirects: 5,
				headers: {
					"User-Agent":
						"Mozilla/5.0 (compatible; ADK/1.0; +http://example.com)",
				},
			});

			const contentType = response.headers["content-type"] || "";

			if (contentType.includes("application/json")) {
				return {
					success: true,
					data: {
						title: "JSON Response",
						content: JSON.stringify(response.data),
						metadata: {
							contentType,
							url: response.request.res.responseUrl || args.url,
						},
					},
				};
			}

			if (contentType.includes("text/html")) {
				let html = response.data;
				// Simple stripping
				// Remove scripts
				html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "");
				// Remove styles
				html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "");
				// Remove comments
				html = html.replace(/<!--[\s\S]*?-->/g, "");

				// Extract title
				const titleMatch = html.match(/<title>(.*?)<\/title>/i);
				const title = titleMatch ? titleMatch[1] : "";

				// Strip tags
				let text = html.replace(/<[^>]+>/g, " ");
				// Collapse whitespace
				text = text.replace(/\s+/g, " ").trim();

				return {
					success: true,
					data: {
						title,
						content: text.substring(0, 20000), // Limit length
						metadata: {
							contentType,
							url: response.request.res.responseUrl || args.url,
						},
					},
				};
			}

			if (contentType.includes("application/pdf")) {
				return {
					success: false,
					error: "PDF content not supported without additional libraries.",
				};
			}

			return {
				success: true,
				data: {
					title: "Unknown Content",
					content:
						typeof response.data === "string"
							? response.data.substring(0, 5000)
							: String(response.data),
					metadata: {
						contentType,
						url: response.request.res.responseUrl || args.url,
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
