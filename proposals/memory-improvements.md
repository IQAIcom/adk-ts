# Proposal: Enhanced Memory System

## Overview

This proposal outlines improvements to ADK-TS's memory system. As a **framework**, we provide primitives and interfaces that enable agent developers to build their own memory systems - whether that's OpenClaw-style file-based memory, Google ADK-style raw event storage, or fully custom solutions.

**Key Principle: We provide the ropes. Agent developers decide how to climb.**

## Problem Statement

### Current Limitations

1. **Naive Storage**: Stores raw events without summarization, leading to bloated memory
2. **Keyword Matching**: Search relies on exact word matches - "what bird did we discuss" won't find "parrot" memories
3. **No Semantic Understanding**: Can't find conceptually related memories
4. **Opinionated Design**: Current implementation makes decisions that should be left to agent developers

### Real-World Challenge

Consider a user who has been using an app for 5+ years with multiple sessions per day (~5,500 sessions). When they ask "What schools did we discuss for my kid?", the system needs to:

1. Search through thousands of memories efficiently
2. Find semantically related content (not just keyword "schools")
3. Return relevant context, potentially with ability to drill into raw conversation

Our framework must enable agent developers to build systems that handle this scale.

## Framework Philosophy

### We Are a Framework, Not an Agent

| Aspect           | Agent (e.g., OpenClaw)           | Framework (Us)                              |
| ---------------- | -------------------------------- | ------------------------------------------- |
| Storage format   | Decides: "Markdown files"        | Provides: `MemoryStorageProvider` interface |
| What to remember | Decides: "Agent writes manually" | Provides: `MemorySummaryProvider` interface |
| Search method    | Decides: "70/30 hybrid"          | Provides: `MemoryStorageProvider.search()`  |
| Retention        | Decides: "Manual cleanup"        | Provides: `delete()` method                 |

### Design Principles

1. **Pluggable Everything**: Storage, summarization, embeddings - all swappable
2. **Sensible Defaults**: Works out of the box with in-memory storage
3. **No Hidden Magic**: Agent developers control when memories are created/deleted
4. **Two-Tier Architecture**: Separate memory (summaries) from sessions (raw events)

## Architecture

### Two-Tier Storage Model

```
┌─────────────────────────────────────────────────────────────┐
│  MEMORY LAYER (Summaries)                                   │
│  ─────────────────────────────────────────────────────────  │
│  • Lightweight (~1KB per session)                           │
│  • Fast semantic/keyword search                             │
│  • Contains: summary, segments, entities, sessionId ref     │
│  • Retention: Often kept forever (small footprint)          │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ sessionId reference
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  SESSION LAYER (Raw Events)                                 │
│  ─────────────────────────────────────────────────────────  │
│  • Heavy (could be 100KB+ per session)                      │
│  • Full conversation history                                │
│  • Retention: Agent developer decides (30 days? forever?)   │
│  • Used for drill-down when user wants full context         │
└─────────────────────────────────────────────────────────────┘
```

### Flow: Session to Memory

```
┌─────────────────────────────────────────────────────────────┐
│  Session Ends → addSessionToMemory(session)                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  MemorySummaryProvider (optional)                           │
│  ─────────────────────────────────────────────────────────  │
│  If configured: LLM summarizes session                      │
│  If not: Pass through raw events or session reference       │
│                                                             │
│  Output: MemoryContent (flexible structure)                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  EmbeddingProvider (optional)                               │
│  ─────────────────────────────────────────────────────────  │
│  If configured: Generate vector embeddings                  │
│  If not: Skip (storage provider uses keyword search)        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  MemoryStorageProvider                                      │
│  ─────────────────────────────────────────────────────────  │
│  Stores memory record however it wants:                     │
│  • In-memory dict (default, for dev)                        │
│  • Vector database (Pinecone, Qdrant, Chroma)               │
│  • PostgreSQL with pgvector                                 │
│  • Markdown files (OpenClaw-style)                          │
│  • Custom enterprise system                                 │
└─────────────────────────────────────────────────────────────┘
```

### Flow: Memory Recall

```
┌─────────────────────────────────────────────────────────────┐
│  User: "What schools did we discuss for my kid?"            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Agent calls RecallMemoryTool                               │
│  → memoryService.search({ query, userId })                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  MemoryStorageProvider.search()                             │
│  ─────────────────────────────────────────────────────────  │
│  Implementation decides HOW to search:                      │
│  • Vector similarity                                        │
│  • Keyword/BM25                                             │
│  • Hybrid (recommended)                                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Returns: MemorySearchResult[]                              │
│  ─────────────────────────────────────────────────────────  │
│  { memory: { summary, sessionId, ... }, score }             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Optional: User wants full conversation                     │
│  → GetSessionDetailsTool(sessionId)                         │
│  → sessionService.getSession(sessionId)                     │
│  → Returns raw events (if still available)                  │
└─────────────────────────────────────────────────────────────┘
```

## Interface Design

### Core Interfaces (The Ropes)

```typescript
/**
 * Main memory service - orchestrates storage, summarization, and search.
 */
interface MemoryServiceConfig {
  /**
   * Where and how memories are stored.
   * Default: InMemoryStorageProvider
   */
  storage: MemoryStorageProvider;

  /**
   * How sessions become memories.
   * If not provided, stores session reference only (no summarization).
   */
  summaryProvider?: MemorySummaryProvider;

  /**
   * How to generate embeddings for semantic search.
   * If not provided, storage provider uses its own search (likely keyword).
   */
  embeddingProvider?: EmbeddingProvider;

  /**
   * Number of results to return from search.
   * Default: 5
   */
  searchLimit?: number;
}
```

### MemoryStorageProvider (Required)

```typescript
/**
 * Interface for memory storage backends.
 * Agent developers implement this or use provided defaults.
 *
 * Implementations decide:
 * - How data is persisted (files, database, vector store, etc.)
 * - How search works (keyword, vector, hybrid, full-text)
 * - What filters are supported
 */
interface MemoryStorageProvider {
  /**
   * Store a memory record.
   */
  store(record: MemoryRecord): Promise<void>;

  /**
   * Search memories. Implementation decides the search algorithm.
   */
  search(query: MemorySearchQuery): Promise<MemorySearchResult[]>;

  /**
   * Delete memories matching filter.
   */
  delete(filter: MemoryDeleteFilter): Promise<number>;

  /**
   * Count memories matching filter (for quota management).
   */
  count?(filter: MemoryDeleteFilter): Promise<number>;
}

interface MemoryRecord {
  /** Unique identifier for this memory */
  id: string;

  /** Session this memory was created from */
  sessionId: string;

  /** User who owns this memory */
  userId: string;

  /** Application name */
  appName: string;

  /** When this memory was created */
  timestamp: string;

  /**
   * The memory content - structure depends on SummaryProvider.
   * Could be: raw text, structured summary, custom schema.
   */
  content: MemoryContent;

  /**
   * Vector embedding (if EmbeddingProvider configured).
   * Storage provider can use this for similarity search.
   */
  embedding?: number[];
}

interface MemorySearchQuery {
  /** The search query text */
  query: string;

  /** User ID to scope search */
  userId: string;

  /** Optional: limit to specific app */
  appName?: string;

  /** Maximum results to return */
  limit?: number;

  /**
   * Optional: pre-computed query embedding.
   * If provided, storage can use for vector search.
   */
  queryEmbedding?: number[];

  /**
   * Additional filters - storage provider decides what to support.
   */
  filters?: {
    after?: string;
    before?: string;
    sessionId?: string;
    [key: string]: unknown;
  };
}

interface MemorySearchResult {
  /** The memory record */
  memory: MemoryRecord;

  /** Relevance score (0-1, higher is better) */
  score: number;
}

interface MemoryDeleteFilter {
  userId?: string;
  appName?: string;
  sessionId?: string;
  before?: string;
  after?: string;
  ids?: string[];
}
```

### MemorySummaryProvider (Optional)

```typescript
/**
 * Interface for transforming sessions into memory content.
 * If not provided, MemoryService stores session reference only.
 */
interface MemorySummaryProvider {
  /**
   * Transform a session into memory content.
   * Implementation decides the output structure.
   */
  summarize(session: Session): Promise<MemoryContent>;
}

/**
 * Flexible memory content - structure depends on use case.
 */
type MemoryContent = {
  /** Human-readable summary */
  summary?: string;

  /**
   * Topic segments for granular search.
   * Each segment can be embedded separately for precision.
   */
  segments?: TopicSegment[];

  /** Named entities mentioned */
  entities?: Entity[];

  /** Key facts to remember */
  keyFacts?: string[];

  /** Raw text (if no summarization) */
  rawText?: string;

  /** Custom fields - agent developer's schema */
  [key: string]: unknown;
};

interface TopicSegment {
  /** Short topic label */
  topic: string;

  /** Detailed summary of this topic */
  summary: string;

  /** How prominent was this topic */
  relevance?: "high" | "medium" | "low";
}

interface Entity {
  /** Entity name */
  name: string;

  /** Entity type */
  type: "person" | "place" | "organization" | "thing" | "other";

  /** Relationship to user */
  relation?: string;
}
```

### EmbeddingProvider (Optional)

```typescript
/**
 * Interface for embedding providers.
 * If not provided, storage provider uses its own search method.
 */
interface EmbeddingProvider {
  /**
   * Generate embedding for text.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Batch embedding for efficiency (optional).
   */
  embedBatch?(texts: string[]): Promise<number[][]>;

  /**
   * Embedding vector dimensions.
   */
  readonly dimensions: number;
}
```

## Built-in Implementations

### Storage Providers

```typescript
/**
 * In-memory storage for development and testing.
 * Uses simple keyword matching for search.
 */
class InMemoryStorageProvider implements MemoryStorageProvider {
  // Keyword matching, no persistence
}

/**
 * Vector store adapter for production semantic search.
 * Wraps external vector databases.
 */
class VectorStorageProvider implements MemoryStorageProvider {
  constructor(config: {
    vectorStore: VectorStore; // Pinecone, Qdrant, Chroma adapter
    searchMode?: "vector" | "keyword" | "hybrid";
    hybridWeights?: { vector: number; keyword: number }; // Default: 0.7/0.3
  });
}

/**
 * File-based storage (OpenClaw-style).
 * Stores memories as files on disk.
 */
class FileStorageProvider implements MemoryStorageProvider {
  constructor(config: { basePath: string; format: "json" | "markdown" });
}
```

### Summary Providers

```typescript
/**
 * LLM-based summarization with structured extraction.
 */
class LlmSummaryProvider implements MemorySummaryProvider {
  constructor(config: {
    /** Model to use for summarization */
    model: string | BaseLlm;

    /** Custom prompt (optional - has sensible default) */
    prompt?: string;

    /** What to extract */
    extract?: {
      summary?: boolean; // Default: true
      segments?: boolean; // Default: true
      entities?: boolean; // Default: true
      keyFacts?: boolean; // Default: true
    };
  });
}

/**
 * No summarization - stores raw session text.
 */
class RawTextSummaryProvider implements MemorySummaryProvider {
  // Just concatenates session events into text
}
```

### Embedding Providers

```typescript
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(config: { apiKey?: string; model?: string });
  readonly dimensions = 1536; // or 3072 for text-embedding-3-large
}

class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(config: { baseUrl?: string; model: string });
}

class CohereEmbeddingProvider implements EmbeddingProvider {
  constructor(config: { apiKey: string; model?: string });
}
```

## Agent Memory Tools

Tools that agent developers can add to their agents:

```typescript
/**
 * Agent explicitly searches memory.
 */
class RecallMemoryTool extends BaseTool {
  name = "recall_memory";
  description = "Search your memory for past conversations";

  schema = z.object({
    query: z.string().describe("What to search for"),
  });

  async execute({ query }, context: ToolContext) {
    return context.memoryService.search({
      query,
      userId: context.userId,
      appName: context.appName,
    });
  }
}

/**
 * Fetch full conversation from a past session.
 */
class GetSessionDetailsTool extends BaseTool {
  name = "get_session_details";
  description = "Get the full conversation from a past session";

  schema = z.object({
    sessionId: z.string().describe("Session ID from memory search"),
  });

  async execute({ sessionId }, context: ToolContext) {
    const session = await context.sessionService.getSession(sessionId);
    if (!session) {
      return { error: "Session no longer available" };
    }
    return { events: session.events };
  }
}

/**
 * Auto-inject relevant memories into system prompt.
 * Runs before each LLM call, not visible to agent as a tool.
 */
class PreloadMemoryTool extends BaseTool {
  // Similar to Google ADK's preload_memory_tool
  // Searches memory with user's query, injects into context
}

/**
 * Agent can write to memory (OpenClaw-style).
 */
class WriteMemoryTool extends BaseTool {
  name = "remember";
  description = "Save something important to long-term memory";

  schema = z.object({
    content: z.string().describe("What to remember"),
    category: z.string().optional().describe("Category for organization"),
  });
}

/**
 * Agent can delete memories.
 */
class ForgetMemoryTool extends BaseTool {
  name = "forget";
  description = "Remove something from memory";

  schema = z.object({
    query: z.string().describe("What to forget"),
  });
}
```

## Usage Examples

### Example 1: Simple Setup (Development)

```typescript
// Minimal config - in-memory, keyword search
const memoryService = new MemoryService({
  storage: new InMemoryStorageProvider(),
});

const agent = new AgentBuilder()
  .withName("assistant")
  .withModel("gpt-4o")
  .withTools([new RecallMemoryTool()])
  .build();
```

### Example 2: Production Setup (Semantic Search)

```typescript
const memoryService = new MemoryService({
  storage: new VectorStorageProvider({
    vectorStore: new PineconeAdapter({ index: "memories" }),
    searchMode: "hybrid",
    hybridWeights: { vector: 0.7, keyword: 0.3 },
  }),
  summaryProvider: new LlmSummaryProvider({
    model: "gpt-4o-mini",
    extract: { summary: true, segments: true, entities: true },
  }),
  embeddingProvider: new OpenAIEmbeddingProvider(),
});

const agent = new AgentBuilder()
  .withName("assistant")
  .withModel("gpt-4o")
  .withTools([
    new RecallMemoryTool(),
    new GetSessionDetailsTool(), // Drill into raw sessions
  ])
  .withInstruction(
    "You have long-term memory. Use recall_memory to find past conversations. " +
      "Use get_session_details if the user wants to see the full conversation.",
  )
  .build();
```

### Example 3: OpenClaw-Style (Agent-Driven Memory)

```typescript
const memoryService = new MemoryService({
  storage: new FileStorageProvider({
    basePath: "~/agent-workspace",
    format: "markdown",
  }),
  // No summaryProvider - agent writes manually
  embeddingProvider: new OpenAIEmbeddingProvider(),
});

const agent = new AgentBuilder()
  .withName("assistant")
  .withModel("gpt-4o")
  .withTools([
    new WriteMemoryTool(), // Agent decides what to remember
    new RecallMemoryTool(),
  ])
  .withInstruction(
    "You can remember important information using the remember tool. " +
      "Use recall_memory to search your notes.",
  )
  .build();
```

### Example 4: Enterprise Custom Storage

```typescript
// Agent developer implements their own storage
class EnterpriseMemoryStorage implements MemoryStorageProvider {
  constructor(private config: EnterpriseConfig) {}

  async store(record: MemoryRecord) {
    // Custom compliance filtering
    // Audit logging
    // Store in enterprise knowledge base
  }

  async search(query: MemorySearchQuery) {
    // Custom search with access controls
    // Integration with existing search infrastructure
  }

  async delete(filter: MemoryDeleteFilter) {
    // Compliance-aware deletion with audit trail
  }
}

const memoryService = new MemoryService({
  storage: new EnterpriseMemoryStorage(enterpriseConfig),
  summaryProvider: new ComplianceAwareSummaryProvider(),
});
```

## Behavior Matrix

| SummaryProvider    | EmbeddingProvider | Behavior                                         |
| ------------------ | ----------------- | ------------------------------------------------ |
| None               | None              | Stores session reference only, keyword search    |
| LlmSummaryProvider | None              | Summarizes sessions, keyword search on summaries |
| None               | OpenAIEmbedding   | Embeds raw session text (not recommended)        |
| LlmSummaryProvider | OpenAIEmbedding   | Full semantic search on structured summaries     |
| Custom             | Custom            | Whatever the agent developer implements          |

## Comparison with Other Systems

### vs Google ADK Python

| Aspect             | Google ADK Python           | ADK-TS (Ours)            |
| ------------------ | --------------------------- | ------------------------ |
| Storage            | Raw events in memory/Vertex | Pluggable provider       |
| Summarization      | None                        | Optional, pluggable      |
| Search             | Keyword or Vertex RAG       | Provider decides         |
| Session drill-down | Yes (stores all events)     | Yes (via SessionService) |
| Flexibility        | Limited (2 implementations) | Full (interfaces)        |

### vs OpenClaw

| Aspect            | OpenClaw (Agent)         | ADK-TS (Framework)       |
| ----------------- | ------------------------ | ------------------------ |
| Storage format    | Markdown files           | Provider interface       |
| Who writes memory | Agent during chat        | Configurable             |
| Search            | Hybrid (70/30 hardcoded) | Provider decides         |
| File structure    | `memory/YYYY-MM-DD.md`   | Provider decides         |
| Our role          | N/A                      | Enable building OpenClaw |

## Open Questions → Framework Answers

| Question                       | Framework Answer                                                       |
| ------------------------------ | ---------------------------------------------------------------------- |
| **Memory Expiration**          | Provide `delete(filter)`. Agent developer implements retention policy. |
| **Memory Consolidation**       | Not built-in. Agent developer calls their own consolidation logic.     |
| **User Feedback ("Forget X")** | Provide `ForgetMemoryTool` that calls `delete()`.                      |
| **Cross-App Memory**           | Filter by `appName` or not - agent developer's choice.                 |
| **Size Limits**                | Provide `count()`. Agent developer implements quota logic.             |

### Example: Agent Developer Implements Retention

```typescript
// Agent developer's cleanup job - not our code
async function cleanupOldMemories(userId: string, retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Delete old memories
  await memoryService.delete({
    userId,
    before: cutoff.toISOString(),
  });

  // Optionally: keep memories but delete raw sessions
  await sessionService.deleteSessions({
    userId,
    before: cutoff.toISOString(),
  });
}
```

### Example: Agent Developer Implements Consolidation

```typescript
// Agent developer's consolidation - not our code
async function consolidateOldMemories(userId: string) {
  const oldMemories = await memoryService.search({
    query: "*",
    userId,
    filters: { before: "2024-01-01" },
    limit: 100,
  });

  // Summarize old memories into one
  const consolidated = await llm.summarize(oldMemories);

  // Store consolidated memory
  await memoryService.storage.store({
    id: generateId(),
    userId,
    content: { summary: consolidated, type: "consolidated" },
    // ...
  });

  // Delete old individual memories
  await memoryService.delete({
    ids: oldMemories.map(m => m.memory.id),
  });
}
```

## Summary

**We provide the ropes:**

```
┌─────────────────────────────────────────────────────────────┐
│  MemoryService (Orchestrator)                               │
│  - addSessionToMemory(session)                              │
│  - search(query)                                            │
│  - delete(filter)                                           │
└─────────────────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Storage    │  │  Summary    │  │  Embedding  │
│  Provider   │  │  Provider   │  │  Provider   │
│  (required) │  │  (optional) │  │  (optional) │
└─────────────┘  └─────────────┘  └─────────────┘
         │              │                │
         ▼              ▼                ▼
   ┌──────────┐   ┌──────────┐    ┌──────────┐
   │InMemory  │   │LlmSummary│    │OpenAI    │
   │Vector    │   │RawText   │    │Ollama    │
   │File      │   │Custom    │    │Cohere    │
   │Postgres  │   │          │    │Custom    │
   │Custom    │   │          │    │          │
   └──────────┘   └──────────┘    └──────────┘
```

**Agent developers climb however they want.**
