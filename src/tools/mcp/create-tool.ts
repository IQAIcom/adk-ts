import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import { BaseTool } from "../base/BaseTool";
import type { ToolContext } from "../../models/context/ToolContext";
import type {
	FunctionDeclaration,
	JSONSchema,
} from "../../models/request/FunctionDeclaration";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

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
	return new McpToolAdapter(mcpTool, client);
}

/**
 * Adapter class that wraps an MCP tool definition as a BaseTool
 */
class McpToolAdapter extends BaseTool {
	private mcpTool: McpTool;
	private client: Client;

	constructor(mcpTool: McpTool, client: Client) {
		// Cast metadata to our expected type to handle type checking
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
	}

	getDeclaration(): FunctionDeclaration {
		let parameters: JSONSchema;

		// Always create a valid JSONSchema
		if (this.mcpTool.parameters) {
			// First handle the case where we already have a JSONSchema with a type
			if (
				typeof this.mcpTool.parameters === "object" &&
				"type" in this.mcpTool.parameters &&
				typeof this.mcpTool.parameters.type === "string"
			) {
				parameters = this.mcpTool.parameters as JSONSchema;
			} else {
				// Otherwise wrap in a proper schema
				parameters = {
					type: "object",
					properties: this.mcpTool.parameters as Record<string, any>,
				};
			}
		} else {
			// Default empty schema
			parameters = {
				type: "object",
				properties: {},
			};
		}

		return {
			name: this.name,
			description: this.description,
			parameters,
		};
	}

	async runAsync(
		args: Record<string, any>,
		_context: ToolContext,
	): Promise<any> {
		if (process.env.DEBUG === "true") {
			console.log(`Executing MCP tool ${this.name} with args:`, args);
		}

		try {
			// If the MCP tool has a direct execute function
			if (typeof this.mcpTool.execute === "function") {
				return await this.mcpTool.execute(args);
			}

			// Use the stored client reference to execute the tool
			if (this.client && typeof this.client.callTool === "function") {
				const result = await this.client.callTool({
					name: this.name,
					arguments: args,
				});
				return result;
			}

			throw new Error(
				`Cannot execute MCP tool ${this.name}: No execution method found`,
			);
		} catch (error) {
			console.error(`Error executing MCP tool ${this.name}:`, error);
			throw error;
		}
	}
}
