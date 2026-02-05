import { randomUUID } from "node:crypto";
import { Type } from "@google/genai";
import { Logger } from "../../logger";
import type { MemoryContent, MemoryRecord } from "../../memory/types";
import type { FunctionDeclaration } from "../../models/function-declaration";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Result of writing to memory
 */
export interface WriteMemoryResult {
	success: boolean;
	memoryId?: string;
	error?: string;
	message?: string;
}

/**
 * Tool that allows an agent to explicitly write to memory.
 *
 * This is the OpenClaw-style approach where the agent decides what to remember
 * rather than automatic session summarization.
 *
 * @example
 * ```typescript
 * const agent = new AgentBuilder()
 *   .withName('assistant')
 *   .withModel('gpt-4o')
 *   .withTools([new WriteMemoryTool()])
 *   .withInstruction(
 *     'You can remember important information using the remember tool.'
 *   )
 *   .build();
 * ```
 */
export class WriteMemoryTool extends BaseTool {
	protected logger = new Logger({ name: "WriteMemoryTool" });

	constructor() {
		super({
			name: "remember",
			description:
				"Save something important to long-term memory. Use this to remember " +
				"facts, preferences, or important details that should be recalled later.",
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
					content: {
						type: Type.STRING,
						description:
							"The information to remember. Be specific and include context.",
					},
					category: {
						type: Type.STRING,
						description:
							"Optional category for organization (e.g., 'preferences', 'facts', 'contacts')",
					},
					keyFacts: {
						type: Type.ARRAY,
						items: { type: Type.STRING },
						description: "Optional list of key facts to extract and remember",
					},
				},
				required: ["content"],
			},
		};
	}

	/**
	 * Execute the write memory action.
	 */
	async runAsync(
		args: {
			content: string;
			category?: string;
			keyFacts?: string[];
		},
		context: ToolContext,
	): Promise<WriteMemoryResult> {
		this.logger.debug(
			`Executing remember with content: ${args.content.substring(0, 100)}...`,
		);

		const memoryService = context.memoryService;
		if (!memoryService) {
			return {
				success: false,
				error: "Memory service not available",
				message: "Memory service is not configured for this agent.",
			};
		}

		try {
			// Create memory content
			const memoryContent: MemoryContent = {
				summary: args.content,
				rawText: args.content,
			};

			if (args.keyFacts && args.keyFacts.length > 0) {
				memoryContent.keyFacts = args.keyFacts;
			}

			if (args.category) {
				memoryContent.category = args.category;
			}

			// Create memory record
			const record: MemoryRecord = {
				id: randomUUID(),
				sessionId: context.session.id,
				userId: context.userId,
				appName: context.appName,
				timestamp: new Date().toISOString(),
				content: memoryContent,
			};

			// Generate embedding if provider available
			const embeddingProvider = memoryService.getEmbeddingProvider?.();
			if (embeddingProvider) {
				record.embedding = await embeddingProvider.embed(args.content);
			}

			// Store the memory
			const storageProvider = memoryService.getStorageProvider();
			await storageProvider.store(record);

			this.logger.debug(`Memory saved with ID: ${record.id}`);

			return {
				success: true,
				memoryId: record.id,
				message: "Successfully saved to memory.",
			};
		} catch (error) {
			this.logger.error("Error saving to memory:", error);
			return {
				success: false,
				error: "Failed to save memory",
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
