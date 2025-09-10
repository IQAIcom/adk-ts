import type { ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import type { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";
import { McpClientService } from "./client";
import { convertMcpToolToBaseTool } from "./create-tool";
import {
	adkToMcpToolType,
	jsonSchemaToDeclaration,
	mcpSchemaToParameters,
	normalizeJsonSchema,
} from "./schema-conversion";
import type { McpConfig, SamplingHandler } from "./types";
import { McpError, McpErrorType } from "./types";

// Export schema conversion utilities and error types
export {
	adkToMcpToolType,
	jsonSchemaToDeclaration,
	normalizeJsonSchema,
	mcpSchemaToParameters,
	McpError,
	McpErrorType,
	convertMcpToolToBaseTool,
};
export * from "./types";
export * from "./sampling-handler";
export * from "./servers";

/**
 * A class for managing MCP tools similar to Python's MCPToolset.
 * Provides functionality to retrieve and use tools from an MCP server.
 */
export class McpToolset {
	private config: McpConfig;
	private clientService: McpClientService | null = null;
	private toolFilter:
		| string[]
		| ((tool: any, context?: ToolContext) => boolean)
		| null = null;
	private tools: BaseTool[] = [];
	private isClosing = false;

	constructor(
		config: McpConfig,
		toolFilter:
			| string[]
			| ((tool: any, context?: ToolContext) => boolean)
			| null = null,
	) {
		this.config = config;
		this.toolFilter = toolFilter;
		this.clientService = new McpClientService(config);
	}

	/**
	 * Checks if a tool should be included based on the tool filter.
	 * Similar to Python's _is_selected method.
	 */
	private isSelected(tool: any, context?: ToolContext): boolean {
		if (!this.toolFilter) {
			return true;
		}

		if (typeof this.toolFilter === "function") {
			return this.toolFilter(tool, context);
		}

		if (Array.isArray(this.toolFilter)) {
			return this.toolFilter.includes(tool.name);
		}

		return true;
	}

	/**
	 * Initializes the client service and establishes a connection.
	 */
	async initialize(): Promise<McpClientService> {
		if (this.isClosing) {
			throw new McpError(
				"Cannot initialize a toolset that is being closed",
				McpErrorType.RESOURCE_CLOSED_ERROR,
			);
		}

		if (!this.clientService) {
			this.clientService = new McpClientService(this.config);
		}
		await this.clientService.initialize();
		return this.clientService;
	}

	/**
	 * Set a sampling handler for this MCP toolset.
	 * This allows MCP servers to request LLM completions through your ADK agent.
	 *
	 * @param handler - ADK sampling handler that receives ADK-formatted messages
	 */
	setSamplingHandler(handler: SamplingHandler): void {
		if (!this.clientService) {
			this.clientService = new McpClientService(this.config);
		}

		this.clientService.setSamplingHandler(handler);

		if (this.config.debug) {
			console.log("🎯 Sampling handler set for MCP toolset");
		}
	}

	/**
	 * Remove the sampling handler
	 */
	removeSamplingHandler(): void {
		if (this.clientService) {
			this.clientService.removeSamplingHandler();

			if (this.config.debug) {
				console.log("🚫 Sampling handler removed from MCP toolset");
			}
		}
	}

	/**
	 * Retrieves tools from the MCP server and converts them to BaseTool instances.
	 * Similar to Python's get_tools method.
	 */
	async getTools(context?: ToolContext): Promise<BaseTool[]> {
		try {
			if (this.isClosing) {
				throw new McpError(
					"Cannot get tools from a toolset that is being closed",
					McpErrorType.RESOURCE_CLOSED_ERROR,
				);
			}

			if (
				this.tools.length > 0 &&
				!this.config.cacheConfig?.enabled === false
			) {
				return this.tools;
			}

			if (!this.clientService) {
				await this.initialize();
			}

			const client = await this.clientService!.initialize();

			const toolsResponse = (await client.listTools()) as ListToolsResult;

			if (!toolsResponse.tools || !Array.isArray(toolsResponse.tools)) {
				console.warn("MCP server returned no tools or invalid tools array");
				return [];
			}

			const tools: BaseTool[] = [];
			for (const mcpTool of toolsResponse.tools) {
				if (this.isSelected(mcpTool, context)) {
					try {
						const tool: BaseTool = await convertMcpToolToBaseTool({
							mcpTool,
							client,
						});
						tools.push(tool);
					} catch (toolError) {
						console.error(
							`Failed to create tool from MCP tool "${mcpTool.name}":`,
							toolError,
						);
					}
				}
			}

			if (this.config.cacheConfig?.enabled !== false) {
				this.tools = tools;
			}

			return tools;
		} catch (error) {
			if (!(error instanceof McpError)) {
				console.error("Error retrieving MCP tools:", error);
				throw new McpError(
					`Error retrieving MCP tools: ${error instanceof Error ? error.message : String(error)}`,
					McpErrorType.CONNECTION_ERROR,
					error instanceof Error ? error : undefined,
				);
			}
			throw error;
		}
	}

	/**
	 * Converts ADK tools to MCP tool format for bidirectional support
	 */
	convertADKToolsToMCP(tools: BaseTool[]): any[] {
		return tools.map((tool) => adkToMcpToolType(tool));
	}

	/**
	 * Refreshes the tool cache by clearing it and fetching tools again
	 */
	async refreshTools(context?: ToolContext): Promise<BaseTool[]> {
		this.tools = [];
		return this.getTools(context);
	}

	/**
	 * Closes the connection to the MCP server.
	 * Similar to Python's close method.
	 */
	async close(): Promise<void> {
		if (this.isClosing) {
			return;
		}

		try {
			this.isClosing = true;

			if (this.clientService) {
				await this.clientService.close();
				this.clientService = null;
			}

			this.tools = [];

			if (this.config.debug) {
				console.log("✅ MCP toolset closed successfully");
			}
		} catch (error) {
			console.error("Error closing MCP toolset:", error);
		} finally {
			this.isClosing = false;
		}
	}

	/**
	 * Disposes of all resources. This method should be called when the toolset is no longer needed.
	 * Provides alignment with disposal patterns common in TypeScript.
	 */
	async dispose(): Promise<void> {
		await this.close();
	}
}

/**
 * Retrieves and converts tools from an MCP server.
 *
 * This function:
 * 1. Connects to the MCP server (local or sse).
 * 2. Retrieves all available tools.
 * 3. Converts them into BaseTool instances.
 * 4. Returns them as a BaseTool array.
 */
export async function getMcpTools(
	config: McpConfig,
	toolFilter?: string[] | ((tool: any, context?: ToolContext) => boolean),
): Promise<BaseTool[]> {
	const toolset = new McpToolset(config, toolFilter);
	try {
		return await toolset.getTools();
	} finally {
		// Close the toolset to clean up resources
		await toolset
			.close()
			.catch((err) => console.error("Error closing toolset:", err));
	}
}
