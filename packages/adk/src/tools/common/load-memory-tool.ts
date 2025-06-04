import { debugLog } from "@adk/helpers/debug";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";
import "../tool-context-extensions";

/**
 * Tool that allows an agent to load memories relevant to a query
 */
export class LoadMemoryTool extends BaseTool {
	/**
	 * Constructor for LoadMemoryTool
	 */
	constructor() {
		super({
			name: "load_memory",
			description: "Loads the memory for the current user based on a query.",
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
					query: {
						type: "string",
						description: "The query to load memories for",
					},
				},
				required: ["query"],
			},
		};
	}

	/**
	 * Execute the memory loading action
	 */
	async runAsync(
		args: {
			query: string;
		},
		context: ToolContext,
	): Promise<any> {
		debugLog(
			`[LoadMemoryTool] Executing load_memory with query: ${args.query}`,
		);

		// Check if memory service is available
		if (!context.memoryService) {
			return {
				error: "Memory service is not available",
				message: "The memory service has not been configured for this agent.",
			};
		}

		try {
			// Search memory using the provided query
			const searchResult = await context.searchMemory(args.query);

			// Return the memories
			return {
				memories: searchResult.memories || [],
				count: searchResult.memories?.length || 0,
			};
		} catch (error) {
			console.error("Error searching memory:", error);
			return {
				error: "Memory search failed",
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
