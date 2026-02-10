// Types

export type {
	CohereEmbeddingProviderConfig,
	OllamaEmbeddingProviderConfig,
	OpenAIEmbeddingProviderConfig,
	OpenRouterEmbeddingProviderConfig,
} from "./embeddings/index";
// Embedding Providers
export {
	CohereEmbeddingProvider,
	OllamaEmbeddingProvider,
	OpenAIEmbeddingProvider,
	OpenRouterEmbeddingProvider,
} from "./embeddings/index";
// Core Service
export { MemoryService } from "./memory-service";

// Legacy exports (deprecated - will be removed in next major version)
export {
	type BaseMemoryService,
	InMemoryMemoryService,
	type MemoryEntry,
	type SearchMemoryResponse,
} from "./in-memory-memory-service";
export type {
	FileStorageProviderConfig,
	FileVectorStoreConfig,
	QdrantVectorStoreConfig,
	SearchMode,
	VectorStore,
	VectorStorageProviderConfig,
} from "./storage/index";
// Storage Providers
export {
	FileStorageProvider,
	FileVectorStore,
	InMemoryStorageProvider,
	InMemoryVectorStore,
	QdrantVectorStore,
	VectorStorageProvider,
} from "./storage/index";
export type { LlmSummaryProviderConfig } from "./summary/index";
// Summary Providers
export {
	LlmSummaryProvider,
	PassthroughSummaryProvider,
} from "./summary/index";
export type {
	EmbeddingProvider,
	Entity,
	MemoryContent,
	MemoryDeleteFilter,
	MemoryRecord,
	MemorySearchQuery,
	MemorySearchResult,
	MemoryServiceConfig,
	MemoryStorageProvider,
	MemorySummaryProvider,
	TopicSegment,
} from "./types";
