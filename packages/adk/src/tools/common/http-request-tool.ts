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
				type: "object",
				properties: {
					url: {
						type: "string",
						description: "The URL to send the request to",
					},
					method: {
						type: "string",
						description:
							"The HTTP method to use (GET, POST, PUT, DELETE, etc.)",
						enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
						default: "GET",
					},
					headers: {
						type: "object",
						description: "Request headers to include",
						additionalProperties: {
							type: "string",
						},
					},
					body: {
						type: "string",
						description: "Request body content (as string, typically JSON)",
					},
					params: {
						type: "object",
						description: "URL query parameters to include",
						additionalProperties: {
							type: "string",
						},
					},
					timeout: {
						type: "integer",
						description: "Request timeout in milliseconds",
						default: 10_000,
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
		_context: ToolContext
	): Promise<HttpRequestResult> {
		try {
			const {
				url,
				method = "GET",
				headers = {},
				body,
				params,
				timeout = 10_000,
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
				body,
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
