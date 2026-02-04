// Types

// Core Service
// Backward compatibility aliases
export {
	MemoryService,
	MemoryService as BaseMemoryService,
} from "./memory-service";

// Storage Providers
export { InMemoryStorageProvider } from "./storage/index";
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
