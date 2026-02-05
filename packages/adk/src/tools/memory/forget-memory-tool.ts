import { Type } from "@google/genai";
import { Logger } from "../../logger";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Result of forgetting memories
 */
export interface ForgetMemoryResult {
	success: boolean;
	deletedCount?: number;
	error?: string;
	message?: string;
}

/**
 * Tool that allows an agent to delete memories.
 *
 * Enables users to request that specific information be forgotten,
 * supporting privacy and data management.
 *
 * @example
 * ```typescript
 * const agent = new AgentBuilder()
 *   .withName('assistant')
 *   .withModel('gpt-4o')
 *   .withTools([new ForgetMemoryTool()])
 *   .withInstruction(
 *     'You can forget information when the user asks using the forget tool.'
 *   )
 *   .build();
 * ```
 */
export class ForgetMemoryTool extends BaseTool {
	protected logger = new Logger({ name: "ForgetMemoryTool" });

	constructor() {
		super({
			name: "forget",
			description:
				"Remove information from memory. Use this when the user asks you to " +
				"forget something or when information is no longer relevant.",
		});
	}

	/**
	 * Get the function declaration for the tool.
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
							"Search query to find memories to forget. Be specific about what to forget.",
					},
					memoryIds: {
						type: Type.ARRAY,
						items: { type: Type.STRING },
						description:
							"Optional: Specific memory IDs to delete (from previous recall results)",
					},
					confirmDelete: {
						type: Type.BOOLEAN,
						description:
							"Confirm deletion. Must be true to actually delete memories.",
					},
				},
				required: ["confirmDelete"],
			},
		};
	}

	/**
	 * Execute the forget memory action.
	 */
	async runAsync(
		args: {
			query?: string;
			memoryIds?: string[];
			confirmDelete: boolean;
		},
		context: ToolContext,
	): Promise<ForgetMemoryResult> {
		this.logger.debug(`Executing forget with query: ${args.query || "by IDs"}`);

		if (!args.confirmDelete) {
			return {
				success: false,
				error: "Deletion not confirmed",
				message:
					"Please confirm deletion by setting confirmDelete to true. " +
					"This action cannot be undone.",
			};
		}

		const memoryService = context.memoryService;
		if (!memoryService) {
			return {
				success: false,
				error: "Memory service not available",
				message: "Memory service is not configured for this agent.",
			};
		}

		try {
			let deletedCount = 0;

			if (args.memoryIds && args.memoryIds.length > 0) {
				// Delete by specific IDs
				deletedCount = await memoryService.delete({
					ids: args.memoryIds,
					userId: context.userId,
				});
			} else if (args.query) {
				// Search for memories matching the query, then delete them
				const searchResults = await memoryService.search({
					query: args.query,
					userId: context.userId,
					appName: context.appName,
					limit: 10, // Limit to prevent accidental mass deletion
				});

				if (searchResults.length === 0) {
					return {
						success: true,
						deletedCount: 0,
						message: "No matching memories found to forget.",
					};
				}

				const idsToDelete = searchResults.map((r) => r.memory.id);
				deletedCount = await memoryService.delete({
					ids: idsToDelete,
					userId: context.userId,
				});
			} else {
				return {
					success: false,
					error: "No query or memory IDs provided",
					message:
						"Please provide either a query or specific memory IDs to forget.",
				};
			}

			this.logger.debug(`Deleted ${deletedCount} memories`);

			return {
				success: true,
				deletedCount,
				message:
					deletedCount > 0
						? `Successfully forgot ${deletedCount} memory${deletedCount > 1 ? "s" : ""}.`
						: "No memories were deleted.",
			};
		} catch (error) {
			this.logger.error("Error forgetting memories:", error);
			return {
				success: false,
				error: "Failed to forget memories",
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
