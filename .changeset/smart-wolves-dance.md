---
"@iqai/adk": minor
---

Overhaul memory system with pluggable provider architecture

This release introduces a completely redesigned memory system with a flexible, pluggable architecture that separates storage, summarization, and embedding concerns.

### New Architecture

**Storage Providers** - Pluggable backends for persisting memories:
- `InMemoryStorageProvider` - Simple in-memory storage for development
- `FileStorageProvider` - File-based persistence
- `VectorStorageProvider` - Base class for vector-enabled storage
- `InMemoryVectorStore` - In-memory vector storage with similarity search
- `FileVectorStore` - File-based vector storage with persistence
- `QdrantVectorStore` - Production-ready vector storage using Qdrant

**Summary Providers** - Transform sessions into memories:
- `LlmSummaryProvider` - LLM-powered summarization with topic segmentation and entity extraction
- `PassthroughSummaryProvider` - Store raw session content without transformation

**Embedding Providers** - Generate vector embeddings for semantic search:
- `OpenAIEmbeddingProvider` - OpenAI embeddings API
- `CohereEmbeddingProvider` - Cohere embeddings API
- `OllamaEmbeddingProvider` - Local embeddings via Ollama
- `OpenRouterEmbeddingProvider` - Embeddings via OpenRouter

### New Types

- `MemoryServiceConfig` - Unified configuration for the memory service
- `MemoryStorageProvider` - Interface for storage backends
- `MemorySummaryProvider` - Interface for summarization
- `EmbeddingProvider` - Interface for embedding generation
- `MemoryRecord`, `MemoryContent`, `TopicSegment`, `Entity` - Structured memory types
- `MemorySearchQuery`, `MemorySearchResult` - Search types with vector support

### Features

- Semantic search with configurable similarity thresholds
- Hybrid search combining keyword and vector approaches
- Topic-based memory segmentation for granular retrieval
- Entity extraction and relationship tracking
- Session-to-memory transformation pipeline
- Debug logging throughout the memory pipeline

### Backwards Compatibility

The following legacy exports are deprecated and will be removed in the next major version:

- `InMemoryMemoryService` - Use `MemoryService` with `InMemoryStorageProvider` instead
- `BaseMemoryService` - Use `MemoryStorageProvider` interface instead
- `MemoryEntry` - Use `MemoryRecord` instead
- `SearchMemoryResponse` - Use `MemorySearchResult[]` instead

Migration example:
```typescript
// Old (deprecated)
import { InMemoryMemoryService } from '@iqai/adk';
const memory = new InMemoryMemoryService();

// New
import { MemoryService, InMemoryStorageProvider } from '@iqai/adk';
const memory = new MemoryService({
  storage: new InMemoryStorageProvider(),
});
```
