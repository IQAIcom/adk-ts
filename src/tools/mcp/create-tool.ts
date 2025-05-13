import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import { BaseTool } from "../base/BaseTool";
import type { ToolContext } from "../../models/context/ToolContext";
import type { FunctionDeclaration } from "../../models/request/FunctionDeclaration";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { withRetry } from "./utils";
import type { McpClientService } from "./client";
import { mcpSchemaToParameters } from "./schema-conversion";
import { McpError, McpErrorType } from "./types";

/**
 * Interface for the expected MCP tool metadata
 */
interface McpToolMetadata {
	isLongRunning?: boolean;
	shouldRetryOnFailure?: boolean;
	maxRetryAttempts?: number;
	[key: string]: any;
}

/**
 * Converts an MCP tool definition into a BaseTool implementation
 */
export async function createTool(
	mcpTool: McpTool,
	client: Client,
): Promise<BaseTool> {
	try {
		return new McpToolAdapter(mcpTool, client);
	} catch (error) {
		if (!(error instanceof McpError)) {
			throw new McpError(
				`Failed to create tool from MCP tool: ${error instanceof Error ? error.message : String(error)}`,
				McpErrorType.INVALID_SCHEMA_ERROR,
				error instanceof Error ? error : undefined,
			);
		}
		throw error;
	}
}

/**
 * Adapter class that wraps an MCP tool definition as a BaseTool
 */
class McpToolAdapter extends BaseTool {
	private mcpTool: McpTool;
	private client: Client;
	private clientService: McpClientService | null = null;

	constructor(mcpTool: McpTool, client: Client) {
		const metadata = (mcpTool.metadata || {}) as McpToolMetadata;

		super({
			name: mcpTool.name || `mcp_${Date.now()}`,
			description: mcpTool.description || "MCP Tool",
			isLongRunning: metadata.isLongRunning ?? false,
			shouldRetryOnFailure: metadata.shouldRetryOnFailure ?? false,
			maxRetryAttempts: metadata.maxRetryAttempts ?? 3,
		});
		this.mcpTool = mcpTool;
		this.client = client;

		if (
			(client as any).reinitialize &&
			typeof (client as any).reinitialize === "function"
		) {
			this.clientService = client as any as McpClientService;
		}
	}

	getDeclaration(): FunctionDeclaration {
		try {
			const parameters = mcpSchemaToParameters(this.mcpTool);

			return {
				name: this.name,
				description: this.description,
				parameters,
			};
		} catch (error) {
			throw new McpError(
				`Failed to convert schema for tool ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
				McpErrorType.INVALID_SCHEMA_ERROR,
				error instanceof Error ? error : undefined,
			);
		}
	}

	async runAsync(
		args: Record<string, any>,
		_context: ToolContext,
	): Promise<any> {
		if (process.env.DEBUG === "true") {
			console.log(`Executing MCP tool ${this.name} with args:`, args);
		}

		try {
			if (typeof this.mcpTool.execute === "function") {
				return await this.mcpTool.execute(args);
			}

			if (this.clientService) {
				return await this.clientService.callTool(this.name, args);
			}

			if (this.client && typeof this.client.callTool === "function") {
				if (this.shouldRetryOnFailure) {
					const executeWithRetry = withRetry(
						async () => {
							return await this.client.callTool({
								name: this.name,
								arguments: args,
							});
						},
						this,
						async () => {
							console.warn(
								`MCP tool ${this.name} encountered a closed resource, but cannot reinitialize client.`,
							);
						},
						this.maxRetryAttempts,
					);
					return await executeWithRetry();
				}

				const result = await this.client.callTool({
					name: this.name,
					arguments: args,
				});
				return result;
			}

			throw new McpError(
				`Cannot execute MCP tool ${this.name}: No execution method found`,
				McpErrorType.TOOL_EXECUTION_ERROR,
			);
		} catch (error) {
			if (!(error instanceof McpError)) {
				console.error(`Error executing MCP tool ${this.name}:`, error);
				throw new McpError(
					`Error executing MCP tool ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
					McpErrorType.TOOL_EXECUTION_ERROR,
					error instanceof Error ? error : undefined,
				);
			}
			throw error;
		}
	}
}
