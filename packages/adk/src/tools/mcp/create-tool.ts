import { Logger } from "@adk/logger";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {
	CallToolResult,
	Tool as McpTool,
} from "@modelcontextprotocol/sdk/types.js";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";
import type { McpClientService } from "./client";
import { mcpSchemaToParameters } from "./schema-conversion";
import { McpError, McpErrorType } from "./types";
import { withRetry } from "./utils";

/**
 * Interface for the expected MCP tool metadata
 */
interface McpToolMetadata {
	isLongRunning?: boolean;
	shouldRetryOnFailure?: boolean;
	maxRetryAttempts?: number;
	[key: string]: any;
}

type ConvertMcpToolTooBaseToolParams = {
	mcpTool: McpTool;
	client?: Client;
	toolHandler?: (name: string, args: unknown) => Promise<CallToolResult>;
};

export async function convertMcpToolToBaseTool(
	params: ConvertMcpToolTooBaseToolParams,
): Promise<BaseTool> {
	try {
		return new McpToolAdapter(
			params.mcpTool,
			params.client,
			params.toolHandler,
		);
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
 * Sanitizes an MCP tool name so it passes BaseTool validation.
 * MCP tool names may contain hyphens (e.g. "notion-search"), which are not
 * valid in ADK tool names. Hyphens are replaced with underscores.
 */
function sanitizeMcpToolName(name: string): string {
	return name.replace(/-/g, "_");
}

/**
 * Adapter class that wraps an MCP tool definition as a BaseTool
 */
class McpToolAdapter extends BaseTool {
	private mcpTool: McpTool;
	private client: Client | undefined;
	private clientService: McpClientService | null = null;
	private toolHandler?: (
		name: string,
		args: unknown,
	) => Promise<CallToolResult>;
	/** The original MCP tool name, preserved for calls back to the MCP server. */
	private originalMcpName: string;

	protected logger = new Logger({ name: "McpToolAdapter" });

	constructor(
		mcpTool: McpTool,
		client?: Client,
		handler?: (name: string, args: unknown) => Promise<CallToolResult>,
	) {
		let metadata: McpToolMetadata = {};

		if ("metadata" in mcpTool && typeof mcpTool.metadata === "object") {
			metadata = mcpTool.metadata as McpToolMetadata;
		} else if (mcpTool._meta && typeof mcpTool._meta === "object") {
			metadata = mcpTool._meta as McpToolMetadata;
		}

		const rawName = mcpTool.name || `mcp_${Date.now()}`;

		super({
			name: sanitizeMcpToolName(rawName),
			description: mcpTool.description || "MCP Tool",
			isLongRunning: metadata.isLongRunning ?? false,
			shouldRetryOnFailure: metadata.shouldRetryOnFailure ?? false,
			maxRetryAttempts: metadata.maxRetryAttempts ?? 3,
		});
		this.originalMcpName = rawName;
		this.mcpTool = mcpTool;
		this.client = client;
		this.toolHandler = handler;

		if (
			client &&
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
		this.logger.debug(
			`Executing MCP tool ${this.originalMcpName} with args:`,
			args,
		);

		try {
			if (
				"execute" in this.mcpTool &&
				typeof this.mcpTool.execute === "function"
			) {
				return await this.mcpTool.execute(args);
			}

			if (this.clientService) {
				return await this.clientService.callTool(this.originalMcpName, args);
			}

			if (this.client && typeof (this.client as any).callTool === "function") {
				if (this.shouldRetryOnFailure) {
					const executeWithRetry = withRetry(
						async () => {
							return await (this.client as any).callTool({
								name: this.originalMcpName,
								arguments: args,
							});
						},
						this,
						async () => {
							console.warn(
								`MCP tool ${this.originalMcpName} encountered a closed resource, but cannot reinitialize client.`,
							);
						},
						this.maxRetryAttempts,
					);
					return await executeWithRetry();
				}

				const result = await (this.client as any).callTool({
					name: this.originalMcpName,
					arguments: args,
				});
				return result;
			}

			if (this.toolHandler) {
				return await this.toolHandler(this.originalMcpName, args);
			}

			throw new McpError(
				`Cannot execute MCP tool ${this.originalMcpName}: No execution method found`,
				McpErrorType.TOOL_EXECUTION_ERROR,
			);
		} catch (error) {
			if (!(error instanceof McpError)) {
				console.error(
					`Error executing MCP tool ${this.originalMcpName}:`,
					error,
				);
				throw new McpError(
					`Error executing MCP tool ${this.originalMcpName}: ${error instanceof Error ? error.message : String(error)}`,
					McpErrorType.TOOL_EXECUTION_ERROR,
					error instanceof Error ? error : undefined,
				);
			}
			throw error;
		}
	}
}
