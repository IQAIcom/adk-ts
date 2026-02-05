import { randomUUID } from "node:crypto";
import { Logger } from "../logger";
import type { Session } from "../sessions/session";
import type {
	EmbeddingProvider,
	MemoryContent,
	MemoryDeleteFilter,
	MemoryRecord,
	MemorySearchQuery,
	MemorySearchResult,
	MemoryServiceConfig,
	MemoryStorageProvider,
	MemorySummaryProvider,
} from "./types";

/**
 * Default search limit if not specified.
 */
const DEFAULT_SEARCH_LIMIT = 5;

/**
 * Main memory service - orchestrates storage, summarization, and search.
 *
 * This is the primary entry point for memory operations. It coordinates:
 * - Storage: Where and how memories are persisted
 * - Summarization: How sessions are transformed into memories
 * - Embeddings: How semantic search is enabled
 *
 * @example
 * ```typescript
 * // Simple setup
 * const memoryService = new MemoryService({
 *   storage: new InMemoryStorageProvider(),
 * });
 *
 * // Production setup with semantic search
 * const memoryService = new MemoryService({
 *   storage: new VectorStorageProvider({ vectorStore: pinecone }),
 *   summaryProvider: new LlmSummaryProvider({ model: 'gpt-4o-mini' }),
 *   embeddingProvider: new OpenAIEmbeddingProvider(),
 * });
 * ```
 */
export class MemoryService {
	private readonly storage: MemoryStorageProvider;
	private readonly summaryProvider?: MemorySummaryProvider;
	private readonly embeddingProvider?: EmbeddingProvider;
	private readonly searchLimit: number;
	private readonly logger = new Logger({ name: "MemoryService" });

	constructor(config: MemoryServiceConfig) {
		this.storage = config.storage;
		this.summaryProvider = config.summaryProvider;
		this.embeddingProvider = config.embeddingProvider;
		this.searchLimit = config.searchLimit ?? DEFAULT_SEARCH_LIMIT;

		this.logger.debug("Initialized", {
			hasEmbeddings: !!config.embeddingProvider,
			hasSummaryProvider: !!config.summaryProvider,
		});
	}

	/**
	 * Add a session to memory.
	 *
	 * Flow:
	 * 1. If summaryProvider configured: summarize session into MemoryContent
	 * 2. If embeddingProvider configured: generate embedding for the content
	 * 3. Store the memory record via storage provider
	 *
	 * @param session - The session to add to memory
	 * @param options - Additional options for the memory record
	 * @returns The created memory record
	 */
	async addSessionToMemory(
		session: Session,
		options?: {
			/** Override the app name (defaults to session.appName) */
			appName?: string;
			/** Override the user ID (defaults to session.userId) */
			userId?: string;
		},
	): Promise<MemoryRecord> {
		const userId = options?.userId ?? session.userId;
		const appName = options?.appName ?? session.appName;

		this.logger.debug("Adding session to memory", {
			sessionId: session.id,
			userId,
			eventCount: session.events.length,
		});

		// Step 1: Generate memory content
		const content = await this.generateContent(session);

		// Step 2: Generate embedding if provider configured
		const embedding = await this.generateEmbedding(content);

		// Step 3: Create and store memory record
		const record: MemoryRecord = {
			id: randomUUID(),
			sessionId: session.id,
			userId,
			appName,
			timestamp: new Date().toISOString(),
			content,
			embedding,
		};

		await this.storage.store(record);

		this.logger.debug("Memory stored", { memoryId: record.id });

		return record;
	}

	/**
	 * Search memories for a user.
	 *
	 * Flow:
	 * 1. If embeddingProvider configured: generate query embedding
	 * 2. Delegate search to storage provider
	 *
	 * @param query - Search query parameters
	 * @returns Array of matching memories with relevance scores
	 */
	async search(
		query: Omit<MemorySearchQuery, "queryEmbedding" | "limit"> & {
			limit?: number;
		},
	): Promise<MemorySearchResult[]> {
		this.logger.debug("Searching memories", {
			query: query.query,
			userId: query.userId,
			useEmbeddings: !!this.embeddingProvider,
		});

		// Generate query embedding if provider configured
		const queryEmbedding = this.embeddingProvider
			? await this.embeddingProvider.embed(query.query)
			: undefined;

		const searchQuery: MemorySearchQuery = {
			...query,
			queryEmbedding,
			limit: query.limit ?? this.searchLimit,
		};

		const results = await this.storage.search(searchQuery);

		this.logger.debug("Search complete", { resultCount: results.length });

		return results;
	}

	/**
	 * Delete memories matching the filter.
	 *
	 * @param filter - Filter criteria for deletion
	 * @returns Number of memories deleted
	 */
	async delete(filter: MemoryDeleteFilter): Promise<number> {
		this.logger.debug("Deleting memories", { filter });

		const deleted = await this.storage.delete(filter);

		this.logger.debug("Memories deleted", { count: deleted });

		return deleted;
	}

	/**
	 * Count memories matching the filter (if supported by storage).
	 *
	 * @param filter - Filter criteria for counting
	 * @returns Number of matching memories, or undefined if not supported
	 */
	async count(filter: MemoryDeleteFilter): Promise<number | undefined> {
		if (!this.storage.count) {
			return undefined;
		}
		return this.storage.count(filter);
	}

	/**
	 * Get the configured embedding provider.
	 * Useful for generating embeddings externally.
	 */
	getEmbeddingProvider(): EmbeddingProvider | undefined {
		return this.embeddingProvider;
	}

	/**
	 * Get the configured summary provider.
	 * Useful for generating summaries externally.
	 */
	getSummaryProvider(): MemorySummaryProvider | undefined {
		return this.summaryProvider;
	}

	/**
	 * Get the configured storage provider.
	 * Useful for direct storage operations.
	 */
	getStorageProvider(): MemoryStorageProvider {
		return this.storage;
	}

	/**
	 * Generate memory content from a session.
	 * Uses summaryProvider if configured, otherwise creates minimal content.
	 */
	private async generateContent(session: Session): Promise<MemoryContent> {
		if (this.summaryProvider) {
			return this.summaryProvider.summarize(session);
		}

		// No summary provider - store minimal reference
		// Agent developers can implement their own summarization
		return {
			rawText: this.extractRawText(session),
		};
	}

	/**
	 * Generate embedding for memory content.
	 * Returns undefined if no embedding provider configured.
	 */
	private async generateEmbedding(
		content: MemoryContent,
	): Promise<number[] | undefined> {
		if (!this.embeddingProvider) {
			return undefined;
		}

		// Create text representation for embedding
		const textToEmbed = this.contentToText(content);
		return this.embeddingProvider.embed(textToEmbed);
	}

	/**
	 * Extract raw text from session events.
	 * Used when no summary provider is configured.
	 */
	private extractRawText(session: Session): string {
		const parts: string[] = [];

		for (const event of session.events) {
			// Handle text property directly (from LlmResponse)
			if (event.text) {
				parts.push(`${event.author}: ${event.text}`);
				continue;
			}

			// Handle content with parts (Google GenAI format)
			if (event.content?.parts && Array.isArray(event.content.parts)) {
				const textParts = event.content.parts
					.filter(
						(part: { text?: string }) =>
							typeof part.text === "string" && part.text.length > 0,
					)
					.map((part: { text: string }) => part.text);

				if (textParts.length > 0) {
					parts.push(`${event.author}: ${textParts.join(" ")}`);
				}
			}
		}

		return parts.join("\n");
	}

	/**
	 * Convert memory content to text for embedding.
	 */
	private contentToText(content: MemoryContent): string {
		const parts: string[] = [];

		if (content.summary) {
			parts.push(content.summary);
		}

		if (content.segments) {
			for (const segment of content.segments) {
				parts.push(`${segment.topic}: ${segment.summary}`);
			}
		}

		if (content.keyFacts) {
			parts.push(content.keyFacts.join(". "));
		}

		if (content.entities) {
			const entityText = content.entities
				.map(
					(e) => `${e.name} (${e.type}${e.relation ? `, ${e.relation}` : ""})`,
				)
				.join(", ");
			parts.push(`Entities: ${entityText}`);
		}

		if (content.rawText && parts.length === 0) {
			parts.push(content.rawText);
		}

		return parts.join("\n\n");
	}
}
