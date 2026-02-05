import { Logger } from "@adk/logger";
import type { LlmRequest } from "../../models/llm-request";
import { BaseTool } from "../base/base-tool";
import type { ToolContext } from "../tool-context";

/**
 * Tool that automatically preloads relevant memories into the LLM request.
 *
 * Unlike RecallMemoryTool which requires explicit agent invocation,
 * this tool injects memories during request preprocessing based on
 * the user's query.
 *
 * This tool does not expose a function declaration to the LLM -
 * it only processes the LLM request to inject context.
 */
export class PreloadMemoryTool extends BaseTool {
	protected logger = new Logger({ name: "PreloadMemoryTool" });

	private maxMemories: number;

	/**
	 * Creates a new PreloadMemoryTool
	 * @param maxMemories Maximum number of memories to inject (default: 3)
	 */
	constructor(maxMemories = 3) {
		super({
			name: "preload_memory",
			description:
				"Automatically preloads relevant memories into the conversation context.",
		});
		this.maxMemories = maxMemories;
	}

	/**
	 * Processes the LLM request to inject relevant memories.
	 *
	 * This method is called before the LLM request is sent, allowing
	 * memories to be added to the system instructions or conversation context.
	 */
	async processLlmRequest(
		toolContext: ToolContext,
		llmRequest: LlmRequest,
	): Promise<void> {
		// Extract user query from the current user content
		const userQuery = this.extractUserQuery(toolContext);
		if (!userQuery) {
			this.logger.debug("No user query found, skipping memory preload");
			return;
		}

		try {
			// Search for relevant memories
			const searchResults = await toolContext.searchMemory(userQuery);

			if (!searchResults || searchResults.length === 0) {
				this.logger.debug("No relevant memories found");
				return;
			}

			// Limit the number of memories and extract MemoryRecords
			const memories = searchResults
				.slice(0, this.maxMemories)
				.map((result) => result.memory);

			// Format memories as context
			const memoryContext = this.formatMemoriesAsContext(memories);

			// Inject into system instructions
			llmRequest.appendInstructions([
				"## Relevant Context from Past Conversations",
				"The following information from previous conversations may be relevant:",
				"",
				memoryContext,
				"",
				"Use this context when it helps answer the user's question, but don't mention that you're using memories unless asked.",
			]);

			this.logger.debug(
				`Preloaded ${memories.length} memories into request context`,
			);
		} catch (error) {
			this.logger.error("Failed to preload memories:", error);
			// Silently fail - the conversation can continue without memories
		}
	}

	/**
	 * Extracts the user query from the tool context
	 */
	private extractUserQuery(toolContext: ToolContext): string | undefined {
		const userContent = toolContext.userContent;
		if (!userContent?.parts) {
			return undefined;
		}

		const textParts = userContent.parts
			.filter((part) => part.text)
			.map((part) => part.text!);

		return textParts.length > 0 ? textParts.join(" ") : undefined;
	}

	/**
	 * Formats memories as context text for injection
	 */
	private formatMemoriesAsContext(
		memories: Array<{
			content: {
				summary?: string;
				rawText?: string;
				keyFacts?: string[];
			};
			timestamp?: string;
			sessionId?: string;
		}>,
	): string {
		const lines: string[] = [];

		for (const memory of memories) {
			// Use summary if available, otherwise fall back to rawText
			const textContent =
				memory.content.summary ||
				memory.content.keyFacts?.join("; ") ||
				memory.content.rawText;

			if (textContent) {
				const timestamp = memory.timestamp ? ` (${memory.timestamp})` : "";
				lines.push(`- [Memory${timestamp}]: ${textContent}`);
			}
		}

		return lines.join("\n");
	}

	/**
	 * This tool does not need to be called by the LLM
	 */
	getDeclaration(): null {
		return null;
	}

	/**
	 * This tool does not run as a function call
	 */
	async runAsync(): Promise<{ message: string }> {
		return {
			message:
				"PreloadMemoryTool works via processLlmRequest, not direct invocation",
		};
	}
}
