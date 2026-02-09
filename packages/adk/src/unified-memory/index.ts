export { Memory, createMemory } from "./memory";
export type { MemoryOptions } from "./memory";

export { InMemoryStore } from "./memory-store";
export type { MemoryStore } from "./memory-store";

export type {
	Thread,
	Message,
	MessageRole,
	MessageType,
	MessageContent,
	MemoryConfig,
	WorkingMemoryConfig,
	SemanticRecallConfig,
	ThreadListOptions,
	ThreadListResult,
	RecallOptions,
	RecallResult,
	MemoryEmbeddingProvider,
	VectorSearchResult,
} from "./types";

export { defaultMemoryConfig } from "./types";
