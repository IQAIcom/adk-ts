# Enhanced Memory System

## Problem

1. **Keyword-only search**: "what bird did we discuss" won't find "parrot" memories
2. **No summarization**: Stores raw events, wastes context

## Design

**User controls WHEN. SummaryProvider controls HOW.**

```
addSessionToMemory() → SummaryProvider → EmbeddingProvider → VectorStore
                            ↓                  ↓                  ↓
                      MemorySummary        number[]         similarity search
```

## API

```typescript
interface MemoryServiceConfig {
  summarization?: { provider: SummaryProvider };
  embedding?: { provider: EmbeddingProvider };
  vectorStore?: VectorStore;
  searchTopK?: number;
}
```

## Usage

```typescript
const memoryService = new MemoryService({
  summarization: {
    provider: new CompactionAwareSummaryProvider({ model: "gpt-4o-mini" }),
  },
  embedding: { provider: new OpenAIEmbedding() },
});

// Store when YOU want
await memoryService.addSessionToMemory(session);
```

## SummaryProviders

| Provider                         | Behavior                                            |
| -------------------------------- | --------------------------------------------------- |
| `LlmSummaryProvider`             | Summarizes all events via LLM                       |
| `CompactionAwareSummaryProvider` | Reuses compaction summaries, LLM only for remainder |

## Memory Tools

| Tool                | Behavior                                         |
| ------------------- | ------------------------------------------------ |
| `RecallMemoryTool`  | Agent explicitly calls `recall_memory(query)`    |
| `PreloadMemoryTool` | Auto-injects relevant memories into instructions |

## Open Questions

1. Memory expiration / TTL?
2. Consolidate old memories into higher-level summaries?
3. "Forget X" - allow deletion?
4. Cross-app memory sharing?
