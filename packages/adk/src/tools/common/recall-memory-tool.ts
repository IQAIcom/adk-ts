import { Logger } from "@adk/logger";
import { Type } from "@google/genai";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

export interface RecallMemoryResult {
	memories?: Array<{
		content: string;
		author?: string;
		timestamp?: string;
	}>;
	count?: number;
	error?: string;
	message?: string;
}

/**
 * Tool that allows an agent to search memory for past conversations.
 *
 * This tool enables semantic search through stored memories when
 * the memory service is configured with embeddings.
 */
export class RecallMemoryTool extends BaseTool {
	protected logger = new Logger({ name: "RecallMemoryTool" });

	/**
	 * Creates a new RecallMemoryTool
	 */
	constructor() {
		super({
			name: "recall_memory",
			description:
				"Search memory for past conversations relevant to a query. " +
				"Use this to recall information from previous sessions.",
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
					query: {
						type: Type.STRING,
						description:
							"The search query to find relevant memories. Be specific about what you're looking for.",
					},
					limit: {
						type: Type.NUMBER,
						description: "Maximum number of memories to return (default: 5)",
					},
				},
				required: ["query"],
			},
		};
	}

	/**
	 * Execute the memory recall action
	 */
	async runAsync(
		args: {
			query: string;
			limit?: number;
		},
		context: ToolContext,
	): Promise<RecallMemoryResult> {
		this.logger.debug(`Executing recall_memory with query: ${args.query}`);

		try {
			const searchResults = await context.searchMemory(args.query);

			// Apply limit if specified
			let results = searchResults;
			if (args.limit && args.limit > 0) {
				results = results.slice(0, args.limit);
			}

			// Format memories for the response
			const formattedMemories = results.map((result) => {
				const memory = result.memory;
				// Use summary if available, otherwise fall back to rawText or keyFacts
				const content =
					memory.content.summary ||
					memory.content.keyFacts?.join("; ") ||
					memory.content.rawText ||
					"";

				return {
					content,
					timestamp: memory.timestamp,
				};
			});

			return {
				memories: formattedMemories,
				count: formattedMemories.length,
			};
		} catch (error) {
			this.logger.error("Error recalling memory:", error);
			return {
				error: "Memory recall failed",
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
