import type { ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpConfig } from "./types";
import { McpClientService } from "./client";
import type { BaseTool } from "../base/BaseTool";
import { createTool } from "./create-tool";

/**
 * Retrieves and converts tools from an MCP server.
 *
 * This function:
 * 1. Connects to the MCP server (local or sse).
 * 2. Retrieves all available tools.
 * 3. Converts them into BaseTool instances.
 * 4. Returns them as a BaseTool array.
 */
export async function getMcpTools(config: McpConfig): Promise<BaseTool[]> {
	try {
		// Initialize client service with timeout and debug options
		const mcpClientService = new McpClientService(config);

		// Connect to the MCP server
		const client = await mcpClientService.initialize();

		// Retrieve all tools from the server
		const toolsResponse = (await client.listTools()) as ListToolsResult;

		if (!toolsResponse.tools || !Array.isArray(toolsResponse.tools)) {
			console.warn("MCP server returned no tools or invalid tools array");
			return [];
		}

		// Convert MCP tools into BaseTool instances
		const tools: BaseTool[] = [];
		for (const mcpTool of toolsResponse.tools) {
			try {
				const tool: BaseTool = await createTool(mcpTool, client);
				tools.push(tool);
			} catch (toolError) {
				console.error(
					`Failed to create tool from MCP tool "${mcpTool.name}":`,
					toolError,
				);
			}
		}

		return tools;
	} catch (error) {
		console.error("Error retrieving MCP tools:", error);
		throw error;
	}
}
