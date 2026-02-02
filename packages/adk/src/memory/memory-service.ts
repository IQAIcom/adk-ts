import { randomUUID } from "node:crypto";
import { Logger } from "@adk/logger";
import type { Event } from "../events/event";
import type { Session } from "../sessions/session";
import { formatTimestamp } from "./_utils";
import type {
	BaseMemoryService,
	SearchMemoryResponse,
} from "./base-memory-service";
import type { MemoryEntry } from "./memory-entry";
import type {
	EmbeddingProvider,
	MemoryServiceConfig,
	MemorySummary,
	SummaryProvider,
	VectorStore,
} from "./types";
import { InMemoryVectorStore } from "./vector-stores/in-memory-vector-store";

/**
 * Creates a user key from app name and user ID
 */
function userKey(appName: string, userId: string): string {
	return `${appName}/${userId}`;
}

/**
 * Extracts words from a string and converts them to lowercase
 */
function extractWordsLower(text: string): Set<string> {
	const words = text.match(/[A-Za-z]+/g) || [];
	return new Set(words.map((word) => word.toLowerCase()));
}

/**
 * Enhanced memory service with support for semantic search, configurable triggers,
 * and various summarization strategies.
 *
 * When no config is provided, falls back to keyword matching for backward compatibility.
 */
export class MemoryService implements BaseMemoryService {
	private logger = new Logger({ name: "MemoryService" });

	// Configuration
	private summaryProvider?: SummaryProvider;
	private embeddingProvider?: EmbeddingProvider;
	private vectorStore: VectorStore;
	private searchTopK: number;

	// Keyword-based storage for backward compatibility
	private sessionEvents: Map<string, Map<string, Event[]>> = new Map();

	// Track whether semantic search is enabled
	private useSemanticSearch: boolean;

	/**
	 * Creates a new MemoryService
	 *
	 * @param config Optional configuration. If not provided, uses keyword matching (backward compatible).
	 */
	constructor(config?: MemoryServiceConfig) {
		this.summaryProvider = config?.summarization?.provider;
		this.embeddingProvider = config?.embedding?.provider;
		this.vectorStore = config?.vectorStore ?? new InMemoryVectorStore();
		this.searchTopK = config?.searchTopK ?? 5;

		// Validate config
		if (this.embeddingProvider && !this.summaryProvider) {
			this.logger.warn(
				"Embedding provider configured without summarization provider. " +
					"Sessions will be stored as raw events without summarization.",
			);
		}

		// Enable semantic search only if we have both summarization and embedding
		this.useSemanticSearch = !!(this.summaryProvider && this.embeddingProvider);

		if (config) {
			this.logger.debug(
				`MemoryService initialized with semantic search: ${this.useSemanticSearch}`,
			);
		} else {
			this.logger.debug(
				"MemoryService initialized with keyword matching (no config)",
			);
		}
	}

	/**
	 * Adds a session to the memory service
	 *
	 * Depending on configuration, this will either:
	 * - Summarize and embed the session for semantic search
	 * - Store raw events for keyword matching (backward compatible)
	 */
	async addSessionToMemory(session: Session): Promise<void> {
		// Always store for keyword matching (backward compatibility)
		this.storeForKeywordSearch(session);

		// If semantic search is enabled, also store embeddings
		if (this.useSemanticSearch) {
			await this.storeForSemanticSearch(session);
		}
	}

	/**
	 * Searches memory for relevant information
	 *
	 * Uses semantic search if configured, otherwise falls back to keyword matching.
	 */
	async searchMemory(options: {
		appName: string;
		userId: string;
		query: string;
	}): Promise<SearchMemoryResponse> {
		if (this.useSemanticSearch && this.embeddingProvider) {
			return this.semanticSearch(options);
		}
		return this.keywordSearch(options);
	}

	/**
	 * Stores session events for keyword-based search
	 */
	private storeForKeywordSearch(session: Session): void {
		const key = userKey(session.appName, session.userId);

		if (!this.sessionEvents.has(key)) {
			this.sessionEvents.set(key, new Map());
		}

		const userSessions = this.sessionEvents.get(key)!;
		const filteredEvents = session.events.filter(
			(event) => event.content?.parts,
		);

		userSessions.set(session.id, filteredEvents);
	}

	/**
	 * Stores session summaries with embeddings for semantic search
	 */
	private async storeForSemanticSearch(session: Session): Promise<void> {
		if (!this.summaryProvider || !this.embeddingProvider) {
			return;
		}

		try {
			const summaries = await this.summaryProvider.getSummaries(session);

			if (!summaries || summaries.length === 0) {
				return;
			}

			for (const summary of summaries) {
				if (!summary.summary) {
					continue;
				}
				const memoryId = `${session.id}-${randomUUID()}`;

				const memorySummary: MemorySummary = {
					id: memoryId,
					sessionId: session.id,
					userId: session.userId,
					appName: session.appName,
					summary: summary.summary,
					topics: summary.topics,
					keyFacts: summary.keyFacts,
					timestamp: summary.endTimestamp ?? Date.now() / 1000,
					eventCount: summary.eventCount,
				};

				// Generate embedding for the summary
				const embedding = await this.embeddingProvider.embed(summary.summary);

				// Store in vector store
				await this.vectorStore.upsert(memoryId, embedding, memorySummary);

				this.logger.debug(
					`Stored memory summary for session ${session.id}: ${summary.summary.substring(0, 50)}...`,
				);
			}
		} catch (error) {
			this.logger.error(
				`Failed to store session for semantic search: ${error}`,
			);
			// Keyword search will still work as fallback
		}
	}

	/**
	 * Performs semantic search using embeddings
	 */
	private async semanticSearch(options: {
		appName: string;
		userId: string;
		query: string;
	}): Promise<SearchMemoryResponse> {
		const { appName, userId, query } = options;

		if (!this.embeddingProvider) {
			return { memories: [] };
		}

		try {
			// Generate embedding for the query
			const queryEmbedding = await this.embeddingProvider.embed(query);

			// Search vector store with user filter
			const results = await this.vectorStore.search(
				queryEmbedding,
				this.searchTopK,
				{ appName, userId },
			);

			// Convert to MemoryEntry format
			const memories: MemoryEntry[] = results.map((result) => ({
				content: {
					role: "model",
					parts: [
						{
							text: this.formatMemorySummary(result.memory),
						},
					],
				},
				author: "memory",
				timestamp: formatTimestamp(result.memory.timestamp),
			}));

			return { memories };
		} catch (error) {
			this.logger.error(`Semantic search failed: ${error}`);
			// Fall back to keyword search
			return this.keywordSearch(options);
		}
	}

	/**
	 * Performs keyword-based search (backward compatible)
	 */
	private keywordSearch(options: {
		appName: string;
		userId: string;
		query: string;
	}): SearchMemoryResponse {
		const { appName, userId, query } = options;
		const key = userKey(appName, userId);

		if (!this.sessionEvents.has(key)) {
			return { memories: [] };
		}

		const wordsInQuery = new Set(query.toLowerCase().split(" "));
		const memories: MemoryEntry[] = [];

		const userSessions = this.sessionEvents.get(key)!;

		for (const sessionEvents of userSessions.values()) {
			for (const event of sessionEvents) {
				if (!event.content || !event.content.parts) {
					continue;
				}

				const textParts = event.content.parts
					.filter((part) => part.text)
					.map((part) => part.text!)
					.join(" ");

				const wordsInEvent = extractWordsLower(textParts);

				if (wordsInEvent.size === 0) {
					continue;
				}

				const hasMatch = Array.from(wordsInQuery).some((queryWord) =>
					wordsInEvent.has(queryWord),
				);

				if (hasMatch) {
					memories.push({
						content: event.content,
						author: event.author,
						timestamp: formatTimestamp(event.timestamp),
					});
				}
			}
		}

		return { memories };
	}

	/**
	 * Formats a memory summary for display
	 */
	private formatMemorySummary(memory: MemorySummary): string {
		const parts: string[] = [memory.summary];

		if (memory.topics && memory.topics.length > 0) {
			parts.push(`Topics: ${memory.topics.join(", ")}`);
		}

		if (memory.keyFacts && memory.keyFacts.length > 0) {
			parts.push(`Key facts: ${memory.keyFacts.join("; ")}`);
		}

		return parts.join("\n");
	}

	/**
	 * Clears all stored memories
	 */
	clear(): void {
		this.sessionEvents.clear();
		if ("clear" in this.vectorStore) {
			(this.vectorStore as InMemoryVectorStore).clear();
		}
	}
}
