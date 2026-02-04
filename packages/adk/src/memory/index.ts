// Types
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

// Core Service
export {
	MemoryService,
	MemoryService as BaseMemoryService,
} from "./memory-service";

// Storage Providers
export {
	FileStorageProvider,
	InMemoryStorageProvider,
	InMemoryVectorStore,
	VectorStorageProvider,
} from "./storage/index";
export type {
	FileStorageProviderConfig,
	SearchMode,
	VectorStore,
	VectorStorageProviderConfig,
} from "./storage/index";

// Summary Providers
export {
	LlmSummaryProvider,
	PassthroughSummaryProvider,
} from "./summary/index";
export type { LlmSummaryProviderConfig } from "./summary/index";

// Embedding Providers
export {
	CohereEmbeddingProvider,
	OllamaEmbeddingProvider,
	OpenAIEmbeddingProvider,
} from "./embeddings/index";
export type {
	CohereEmbeddingProviderConfig,
	OllamaEmbeddingProviderConfig,
	OpenAIEmbeddingProviderConfig,
} from "./embeddings/index";
