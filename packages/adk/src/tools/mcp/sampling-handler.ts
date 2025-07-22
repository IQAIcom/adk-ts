import { Logger } from "@adk/logger";
import { LlmRequest, type LlmResponse } from "@adk/models";
import type { Content, Part } from "@google/genai";
import {
	CreateMessageRequestSchema,
	CreateMessageResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
	McpError,
	McpErrorType,
	type McpSamplingRequest,
	type McpSamplingResponse,
	type SamplingHandler,
} from "./types";

/**
 * MCP Sampling Handler class that handles message format conversion
 * between MCP format and ADK format
 */
export class McpSamplingHandler {
	protected logger = new Logger({ name: "McpSamplingHandler" });
	private samplingHandler: SamplingHandler;

	constructor(samplingHandler: SamplingHandler) {
		this.samplingHandler = samplingHandler;
	}

	/**
	 * Handle MCP sampling request and convert between formats
	 */
	async handleSamplingRequest(
		request: McpSamplingRequest,
	): Promise<McpSamplingResponse> {
		try {
			// Ensure we're only processing sampling/createMessage requests
			if (request.method !== "sampling/createMessage") {
				this.logger.error(
					`Invalid method for sampling handler: ${request.method}. Expected: sampling/createMessage`,
				);
				throw new McpError(
					`Invalid method: ${request.method}. This handler only processes sampling/createMessage requests.`,
					McpErrorType.INVALID_REQUEST_ERROR,
				);
			}

			// Validate the request using MCP schema
			const validationResult = CreateMessageRequestSchema.safeParse(request);

			if (!validationResult.success) {
				this.logger.error(
					"Invalid MCP sampling request:",
					validationResult.error,
				);
				throw new McpError(
					`Invalid sampling request: ${validationResult.error.message}`,
					McpErrorType.INVALID_REQUEST_ERROR,
				);
			}

			const mcpParams = request.params;

			// Validate required fields
			if (!mcpParams.messages || !Array.isArray(mcpParams.messages)) {
				throw new McpError(
					"Invalid sampling request: messages array is required",
					McpErrorType.INVALID_REQUEST_ERROR,
				);
			}

			if (!mcpParams.maxTokens || mcpParams.maxTokens <= 0) {
				throw new McpError(
					"Invalid sampling request: maxTokens must be a positive number",
					McpErrorType.INVALID_REQUEST_ERROR,
				);
			}

			this.logger.debug("Converting MCP request to ADK format");

			// Convert MCP messages to ADK format
			const adkContents = this.convertMcpMessagesToADK(
				mcpParams.messages,
				mcpParams.systemPrompt,
			);

			// Extract model from request if available, otherwise use default
			const requestModel = (mcpParams.model as string) || "gemini-2.0-flash";

			// Prepare ADK request - create a proper LlmRequest instance
			const adkRequest = new LlmRequest({
				model: requestModel,
				contents: adkContents,
				config: {
					temperature: mcpParams.temperature,
					maxOutputTokens: mcpParams.maxTokens,
				},
			});

			this.logger.debug("Calling ADK sampling handler");

			// Call the ADK handler
			const adkResponse = await this.samplingHandler(adkRequest);

			this.logger.debug("Converting ADK response to MCP format");

			// Convert ADK response to MCP format - pass model information
			const mcpResponse = this.convertADKResponseToMcp(
				adkResponse,
				requestModel,
			);

			// Validate the response using MCP schema
			const responseValidation =
				CreateMessageResultSchema.safeParse(mcpResponse);

			if (!responseValidation.success) {
				this.logger.error(
					"Invalid MCP response generated:",
					responseValidation.error,
				);
				throw new McpError(
					`Invalid response generated: ${responseValidation.error.message}`,
					McpErrorType.SAMPLING_ERROR,
				);
			}

			return mcpResponse;
		} catch (error) {
			this.logger.error("Error handling sampling request:", error);

			if (error instanceof McpError) {
				throw error;
			}

			throw new McpError(
				`Sampling request failed: ${error instanceof Error ? error.message : String(error)}`,
				McpErrorType.SAMPLING_ERROR,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Convert MCP messages to ADK Content format
	 */
	private convertMcpMessagesToADK(
		mcpMessages: McpSamplingRequest["params"]["messages"],
		systemPrompt?: string,
	): Content[] {
		const contents: Content[] = [];

		// Add system prompt at the beginning if provided
		if (systemPrompt) {
			contents.push({
				role: "user", // System messages are typically sent as user role in content
				parts: [{ text: systemPrompt }],
			});
		}

		// Convert each MCP message to ADK Content format
		const transformedMessages = mcpMessages.map((mcpMessage) =>
			this.convertSingleMcpMessageToADK(mcpMessage),
		);

		contents.push(...transformedMessages);

		return contents;
	}

	/**
	 * Convert a single MCP message to ADK Content format
	 */
	private convertSingleMcpMessageToADK(
		mcpMessage: McpSamplingRequest["params"]["messages"][0],
	): Content {
		// Map MCP role to ADK role - MCP only supports "user" and "assistant"
		const adkRole = mcpMessage.role === "assistant" ? "model" : "user";

		// Convert content based on type
		const adkParts = this.convertMcpContentToADKParts(mcpMessage.content);

		const adkContent: Content = {
			role: adkRole,
			parts: adkParts,
		};

		this.logger.debug(
			`Converted MCP message - role: ${mcpMessage.role} -> ${adkRole}, content type: ${mcpMessage.content.type}`,
		);

		return adkContent;
	}

	/**
	 * Convert MCP message content to ADK parts format
	 */
	private convertMcpContentToADKParts(
		mcpContent: McpSamplingRequest["params"]["messages"][0]["content"],
	): Part[] {
		if (mcpContent.type === "text") {
			// Simple text content - ensure text is a string
			const textContent = mcpContent.text || "";
			return [{ text: textContent }];
		}

		if (mcpContent.type === "image") {
			// Multimodal content with image
			const parts: Part[] = [];

			// Add text part if present - ensure text is a string
			if (mcpContent.text && typeof mcpContent.text === "string") {
				parts.push({ text: mcpContent.text });
			}

			// Add image part
			if (mcpContent.data && typeof mcpContent.data === "string") {
				// Convert base64 data to inline data format expected by ADK
				const mimeType = mcpContent.mimeType || "image/jpeg";

				parts.push({
					inlineData: {
						data: mcpContent.data,
						mimeType,
					},
				});
			}

			return parts.length > 0 ? parts : [{ text: "" }];
		}

		// Fallback for unknown content types
		this.logger.warn(`Unknown MCP content type: ${mcpContent.type}`);
		const fallbackText =
			typeof mcpContent.data === "string" ? mcpContent.data : "";
		return [{ text: fallbackText }];
	}

	/**
	 * Convert ADK response to MCP response format
	 */
	private convertADKResponseToMcp(
		adkResponse: string | LlmResponse,
		model: string,
	): McpSamplingResponse {
		// Extract text content from the response
		let responseText = "";

		if (typeof adkResponse === "string") {
			// Direct string response
			responseText = adkResponse;
		} else {
			// LlmResponse type
			if (adkResponse.content) {
				if (typeof adkResponse.content === "string") {
					responseText = adkResponse.content;
				} else if (adkResponse.content.parts) {
					responseText = adkResponse.content.parts
						.map((part) => {
							return typeof part.text === "string" ? part.text : "";
						})
						.join("");
				}
			}
		}

		// Create MCP response - include required model field
		const mcpResponse: McpSamplingResponse = {
			model: model, // Use the model from the request
			role: "assistant", // ADK responses are always from assistant
			content: {
				type: "text",
				text: responseText,
			},
		};

		this.logger.debug(`Received content: ${responseText}`);

		return mcpResponse;
	}

	/**
	 * Update the ADK handler
	 */
	updateHandler(handler: SamplingHandler): void {
		this.samplingHandler = handler;
		this.logger.debug("ADK sampling handler updated");
	}
}

/**
 * Helper function to create a sampling handler with proper TypeScript types.
 *
 * @param handler - Function that handles sampling requests
 * @returns Properly typed ADK sampling handler
 *
 * @example
 * ```typescript
 * import { createSamplingHandler, Gemini } from "@iqai/adk";
 *
 * const llm = new Gemini("gemini-2.0-flash-exp");
 *
 * // Example 1: Return full LlmResponse
 * const samplingHandler1 = createSamplingHandler(async (request) => {
 *   const responses = [];
 *   for await (const response of llm.generateContentAsync(request)) {
 *     responses.push(response);
 *   }
 *   return responses[responses.length - 1];
 * });
 *
 * // Example 2: Return simple string
 * const samplingHandler2 = createSamplingHandler(async (request) => {
 *   const lastMessage = request.contents[request.contents.length - 1].parts[0].text;
 *   return await runner.ask(lastMessage);
 * });
 *
 * // Example 3: Direct function reference
 * const samplingHandler3 = createSamplingHandler(runner.ask);
 * ```
 */
export function createSamplingHandler(handler: SamplingHandler) {
	return handler;
}
