/**
 * Memory Services for the Agent Development Kit
 */

// Types
export type {
	EmbeddingProvider,
	MemoryServiceConfig,
	MemorySummary,
	MemoryTriggerConfig,
	MemoryTriggerType,
	SessionSummary,
	SummaryProvider,
	VectorSearchResult,
	VectorStore,
	VectorStoreFilter,
} from "./types";

// Memory service implementations
export { MemoryService } from "./memory-service";

/**
 * @deprecated Use MemoryService instead. InMemoryMemoryService will be removed in a future version.
 */
export { InMemoryMemoryService } from "./in-memory-memory-service";
export { VertexAiRagMemoryService } from "./vertex-ai-rag-memory-service";

// Summary providers
export { CompactionAwareSummaryProvider } from "./summary-providers/compaction-aware-summary-provider";
export { LlmSummaryProvider } from "./summary-providers/llm-summary-provider";

// Embedding providers
export { OpenAIEmbedding } from "./embeddings/openai-embedding";

// Vector stores
export { InMemoryVectorStore } from "./vector-stores/in-memory-vector-store";
