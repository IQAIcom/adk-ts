import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

interface HttpRequestResult {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
	error?: string;
}

/**
 * Tool for making HTTP requests to external APIs and web services
 */
export class HttpRequestTool extends BaseTool {
	constructor() {
		super({
			name: "http_request",
			description: "Make HTTP requests to external APIs and web services",
		});
	}

	/**
	 * Get the function declaration for the tool
	 */
	getDeclaration(): FunctionDeclaration {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: Type.OBJECT,
				properties: {
					url: {
						type: Type.STRING,
						description: "The URL to send the request to",
					},
					method: {
						type: Type.STRING,
						description:
							"The HTTP method to use (GET, POST, PUT, DELETE, etc.)",
						enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
						default: "GET",
					},
					headers: {
						type: Type.OBJECT,
						description: "Request headers to include",
					},
					body: {
						type: Type.STRING,
						description: "Request body content (as string, typically JSON)",
					},
					params: {
						type: Type.OBJECT,
						description: "URL query parameters to include",
					},
					timeout: {
						type: Type.INTEGER,
						description: "Request timeout in milliseconds",
						default: 10000,
					},
				},
				required: ["url"],
			},
		};
	}

	/**
	 * Execute the HTTP request
	 */
	async runAsync(
		args: {
			url: string;
			method?: string;
			headers?: Record<string, string>;
			body?: string;
			params?: Record<string, string>;
			timeout?: number;
		},
		_context: ToolContext,
	): Promise<HttpRequestResult> {
		try {
			const {
				url,
				method = "GET",
				headers = {},
				body,
				params,
				timeout = 10000,
			} = args;

			// Prepare URL with query parameters
			const urlObj = new URL(url);
			if (params) {
				Object.entries(params).forEach(([key, value]) => {
					urlObj.searchParams.append(key, value);
				});
			}

			// Set default headers for JSON if Content-Type is not specified
			const requestHeaders = { ...headers };
			if (body && !requestHeaders["Content-Type"] && this.isValidJson(body)) {
				requestHeaders["Content-Type"] = "application/json";
			}

			// Configure request options
			const options: RequestInit = {
				method,
				headers: requestHeaders,
				body: body,
				signal: AbortSignal.timeout(timeout),
			};

			// Execute request
			const response = await fetch(urlObj.toString(), options);

			// Get response headers
			const responseHeaders: Record<string, string> = {};
			response.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});

			// Get response body as text
			const responseBody = await response.text();

			return {
				statusCode: response.status,
				headers: responseHeaders,
				body: responseBody,
			};
		} catch (error) {
			return {
				statusCode: 0,
				headers: {},
				body: "",
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Check if a string is valid JSON
	 */
	private isValidJson(str: string): boolean {
		try {
			JSON.parse(str);
			return true;
		} catch (e) {
			return false;
		}
	}
}
