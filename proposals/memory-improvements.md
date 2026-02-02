# Proposal: Enhanced Memory System

> **For Implementation**: This document contains all specifications needed. Start with the "Quick Implementation Checklist" below.

## Quick Implementation Checklist

### Immediate Tasks (Branch: `memory-improvements`)

- [ ] **1. Remove duplicate code** - Already done: cleaned `memory-entry.ts`
- [ ] **2. Delete `SharedMemoryRequestProcessor`**
  - Remove from `packages/adk/src/flows/llm-flows/single-flow.ts` (line 17, 36)
  - Delete `packages/adk/src/flows/llm-flows/shared-memory.ts`
- [ ] **3. Create new types** in `packages/adk/src/memory/types.ts`:
  - `MemoryServiceConfig`
  - `MemoryTriggerConfig`
  - `SummarizationConfig`
  - `EmbeddingConfig`
  - `EmbeddingProvider` interface
  - `VectorStore` interface
  - `MemorySummary`
- [ ] **4. Create `InMemoryVectorStore`** - cosine similarity search
- [ ] **5. Create `MemoryService`** class with config support
- [ ] **6. Create `UnifiedSummarizer`** - implements `EventsSummarizer`, works for both compaction & memory
- [ ] **7. Create `RecallMemoryTool`** - agent-initiated memory search
- [ ] **8. Create `PreloadMemoryTool`** - optional auto-preload (injects into instructions)
- [ ] **9. Create `OpenAIEmbedding`** provider
- [ ] **10. Add `endSession()` to `BaseSessionService`** for trigger support
- [ ] **11. Add `reuseCompactionSummaries`** option to reuse compaction work for memory

### Key Files to Modify/Create

```
packages/adk/src/memory/
├── types.ts              (NEW - all interfaces)
├── memory-service.ts     (NEW - main configurable service)
├── base-memory-service.ts (keep, update interface)
├── memory-entry.ts       (cleaned up)
├── in-memory-memory-service.ts (deprecate)
├── vertex-ai-rag-memory-service.ts (deprecate)
├── vector-stores/
│   └── in-memory-vector-store.ts (NEW)
└── embeddings/
    └── openai-embedding.ts (NEW)

packages/adk/src/tools/common/
├── recall-memory-tool.ts  (NEW or update load-memory-tool.ts)
└── preload-memory-tool.ts (NEW)

packages/adk/src/flows/llm-flows/
├── single-flow.ts        (MODIFY - remove sharedMemoryRequestProcessor)
└── shared-memory.ts      (DELETE)
```

---

## Overview

This proposal outlines improvements to ADK-TS's memory system, inspired by OpenClaw's approach. The goal is to provide intelligent, configurable memory that summarizes sessions, embeds them for semantic search, and gives agents tools to recall relevant context across their lifetime.

## Problem Statement

### Current Limitations

1. **Naive Storage**: Stores raw events without summarization, leading to bloated memory
2. **Keyword Matching**: Search relies on exact word matches - "what bird did we discuss" won't find "parrot" memories
3. **No Semantic Understanding**: Can't find conceptually related memories
4. **Wasteful Triggers**: `addSessionToMemory` is called after every single event
5. **ADK-TS Deviation**: `SharedMemoryRequestProcessor` auto-injects memory on every request - this doesn't exist in Python ADK and should be removed

### Example Failure

```
Session 1: User discusses parrots, migration patterns, African Grey species
Session 2: User asks "remind me about that flying animal we talked about"

Current system: ❌ No match (no word overlap)
Proposed system: ✅ Finds parrot discussion via semantic similarity
```

## Proposed Solution

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Session Ends                             │
│              (or trigger condition met)                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Summarizer (optional, configurable)                        │
│  ─────────────────────────────────────────────────────────  │
│  Input: Session events                                      │
│  Output: MemorySummary {                                    │
│    summary: "User discussed parrot care and migration...",  │
│    topics: ["birds", "parrots", "pet care"],                │
│    keyFacts: ["User owns an African Grey parrot"],          │
│    timestamp, sessionId, userId, appName                    │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Embedding Provider (optional, pluggable)                   │
│  ─────────────────────────────────────────────────────────  │
│  - OpenAI, Cohere, Voyage, Ollama, custom                   │
│  - Converts summary text → vector embedding                 │
│  - Skipped if not configured (falls back to keyword search) │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Vector Store (pluggable)                                   │
│  ─────────────────────────────────────────────────────────  │
│  - InMemoryVectorStore (default, for dev/testing)           │
│  - PineconeStore, QdrantStore, ChromaStore (production)     │
│  - Stores: { id, embedding, metadata: MemorySummary }       │
└─────────────────────────────────────────────────────────────┘

                ... new session starts ...

┌─────────────────────────────────────────────────────────────┐
│  RecallMemoryTool (agent-initiated)                         │
│  ─────────────────────────────────────────────────────────  │
│  Agent calls: recall_memory({ query: "birds we discussed" })│
│  1. Embed query                                             │
│  2. Similarity search in vector store                       │
│  3. Return top-K relevant memory summaries                  │
└─────────────────────────────────────────────────────────────┘
```

## Interface Design

### Configuration

```typescript
interface MemoryServiceConfig {
  /**
   * When to process sessions into memory.
   * Default: 'session_end'
   */
  trigger?: MemoryTriggerConfig;

  /**
   * Summarization settings.
   * If not provided, stores raw event text (current behavior).
   */
  summarization?: SummarizationConfig;

  /**
   * Embedding settings.
   * If not provided, falls back to keyword-based search.
   */
  embedding?: EmbeddingConfig;

  /**
   * Vector store for persisting embeddings.
   * Default: InMemoryVectorStore
   */
  vectorStore?: VectorStore;

  /**
   * Number of results to return from search.
   * Default: 5
   */
  searchTopK?: number;
}

interface MemoryTriggerConfig {
  /**
   * When to trigger memory processing:
   * - 'session_end': When session explicitly ends
   * - 'inactivity': After period of no messages
   * - 'message_count': After N messages in session
   */
  type: "session_end" | "inactivity" | "message_count";

  /** Milliseconds of inactivity before triggering (for 'inactivity' type) */
  inactivityMs?: number;

  /** Number of messages before triggering (for 'message_count' type) */
  messageCount?: number;
}

interface SummarizationConfig {
  /**
   * Model to use for summarization.
   * Can be a model string or LLM instance.
   */
  model: string | BaseLlm;

  /**
   * Custom prompt for summarization.
   * Has a sensible default if not provided.
   */
  prompt?: string;

  /** Max tokens for summary output */
  maxTokens?: number;
}

interface EmbeddingConfig {
  /** Embedding provider instance */
  provider: EmbeddingProvider;

  /** Model name (provider-specific) */
  model?: string;
}
```

### Pluggable Providers

```typescript
/**
 * Interface for embedding providers.
 * Implementations: OpenAIEmbedding, CohereEmbedding, OllamaEmbedding, etc.
 */
interface EmbeddingProvider {
  /**
   * Generate embedding for a single text.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts (optional optimization).
   */
  embedBatch?(texts: string[]): Promise<number[][]>;

  /**
   * Dimension of the embedding vectors.
   */
  readonly dimensions: number;
}

/**
 * Interface for vector storage.
 * Implementations: InMemoryVectorStore, PineconeStore, QdrantStore, etc.
 */
interface VectorStore {
  /**
   * Insert or update a memory embedding.
   */
  upsert(
    id: string,
    embedding: number[],
    metadata: MemorySummary,
  ): Promise<void>;

  /**
   * Search for similar embeddings.
   */
  search(
    embedding: number[],
    topK: number,
    filter?: VectorStoreFilter,
  ): Promise<VectorSearchResult[]>;

  /**
   * Delete a memory by ID.
   */
  delete?(id: string): Promise<void>;

  /**
   * Delete all memories matching a filter.
   */
  deleteMany?(filter: VectorStoreFilter): Promise<number>;
}

interface VectorStoreFilter {
  userId?: string;
  appName?: string;
  sessionId?: string;
  /** Filter by timestamp range */
  after?: string;
  before?: string;
}

interface VectorSearchResult {
  id: string;
  score: number;
  metadata: MemorySummary;
}
```

### Memory Data Types

```typescript
/**
 * Structured summary of a session stored in memory.
 */
interface MemorySummary {
  /** Unique identifier for this memory */
  id: string;

  /** Session this memory was created from */
  sessionId: string;

  /** User who owns this memory */
  userId: string;

  /** Application name */
  appName: string;

  /** Human-readable summary of what happened */
  summary: string;

  /** Key topics discussed (for filtering/display) */
  topics?: string[];

  /** Important facts to remember about the user */
  keyFacts?: string[];

  /** When this memory was created */
  timestamp: string;

  /** Optional: raw event count in original session */
  eventCount?: number;
}

/**
 * Result from memory search.
 */
interface MemorySearchResult {
  memory: MemorySummary;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
}
```

## Usage Examples

### Basic Usage (Keyword Search Only)

```typescript
// No config = current behavior (keyword matching)
const runner = new Runner({
  appName: "my-app",
  agent: myAgent,
  sessionService: new InMemorySessionService(),
  memoryService: new MemoryService(),
});
```

### With Summarization (No Embeddings)

```typescript
const runner = new Runner({
  appName: "my-app",
  agent: myAgent,
  sessionService: new InMemorySessionService(),
  memoryService: new MemoryService({
    trigger: { type: "session_end" },
    summarization: {
      model: "gpt-4o-mini",
    },
  }),
});
```

### Full Semantic Search

```typescript
const runner = new Runner({
  appName: "my-app",
  agent: myAgent,
  sessionService: new InMemorySessionService(),
  memoryService: new MemoryService({
    trigger: { type: "session_end" },
    summarization: {
      model: "gpt-4o-mini",
      prompt: `Summarize this conversation. Focus on:
        - What the user was trying to accomplish
        - Key decisions or preferences expressed
        - Any facts about the user worth remembering`,
    },
    embedding: {
      provider: new OpenAIEmbedding({
        apiKey: process.env.OPENAI_API_KEY,
      }),
      model: "text-embedding-3-small",
    },
    searchTopK: 5,
  }),
});
```

### Production Setup with Pinecone

```typescript
const runner = new Runner({
  appName: "my-app",
  agent: myAgent,
  sessionService: new DatabaseSessionService(),
  memoryService: new MemoryService({
    trigger: { type: "session_end" },
    summarization: {
      model: "gemini-2.0-flash",
    },
    embedding: {
      provider: new OpenAIEmbedding(),
      model: "text-embedding-3-small",
    },
    vectorStore: new PineconeStore({
      apiKey: process.env.PINECONE_API_KEY,
      index: "agent-memories",
      namespace: "production",
    }),
  }),
});
```

## Agent Memory Tools

Following Python ADK's approach, we provide **two explicit tools** for memory access. Both must be explicitly added to the agent - no auto-injection.

### Tool Options

| Tool                | When to use                  | Behavior                                       |
| ------------------- | ---------------------------- | ---------------------------------------------- |
| `RecallMemoryTool`  | Agent decides when to recall | Agent calls `recall_memory(query)` explicitly  |
| `PreloadMemoryTool` | Auto-load on every request   | Searches memory, injects into **instructions** |

### Option 1: `RecallMemoryTool` (Recommended)

Agent explicitly decides when to search memory. **This is the recommended approach.**

```typescript
const agent = new AgentBuilder()
  .withName("assistant")
  .withModel("gpt-4o")
  .withTools([
    new RecallMemoryTool(), // Explicit - you see exactly what tools the agent has
  ])
  .withInstruction(
    `
    You are a helpful assistant with long-term memory.
    Use the recall_memory tool when you need to remember past conversations
    or user preferences.
  `,
  )
  .build();
```

### Why Explicit?

1. **Clarity** - Reading the code shows exactly what tools the agent has
2. **No magic** - What you configure is what you get
3. **Multi-agent control** - Easy to see which agents can access memory
4. **Debuggable** - "Why is this agent recalling memories?" → check the tools list

### Tool Definition

```typescript
class RecallMemoryTool extends BaseTool {
  name = "recall_memory";
  description =
    "Search your memory for relevant past conversations and user information.";

  parameters = {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "What to search for in memory (e.g., 'user preferences', 'previous project discussions')",
      },
      limit: {
        type: "number",
        description: "Maximum number of memories to return (default: 5)",
      },
    },
    required: ["query"],
  };

  async runAsync(
    args: { query: string; limit?: number },
    context: ToolContext,
  ) {
    const results = await context.searchMemory(args.query, args.limit);
    return {
      memories: results.map(r => ({
        summary: r.memory.summary,
        topics: r.memory.topics,
        keyFacts: r.memory.keyFacts,
        timestamp: r.memory.timestamp,
        relevance: r.score,
      })),
    };
  }
}
```

### Option 2: `PreloadMemoryTool` (Auto-preload)

For users who want automatic memory injection on every request. Unlike the removed `SharedMemoryRequestProcessor`, this is:

- **Explicit** - You must add it to the agent's tools
- **Clean injection** - Injects into instructions, not fake user messages

```typescript
const agent = new AgentBuilder()
  .withName("assistant")
  .withModel("gpt-4o")
  .withTools([
    new PreloadMemoryTool(), // Auto-preloads memory on every request
  ])
  .build();
```

**How it works:**

```typescript
class PreloadMemoryTool extends BaseTool {
  name = "preload_memory";
  description = "preload_memory"; // Not shown to model

  // This runs automatically before each LLM request
  async processLlmRequest(toolContext: ToolContext, llmRequest: LlmRequest) {
    const userQuery = toolContext.userContent?.parts?.[0]?.text;
    if (!userQuery) return;

    const response = await toolContext.searchMemory(userQuery);
    if (!response.memories.length) return;

    // Inject into INSTRUCTIONS (clean, not fake user messages)
    const memoryText = response.memories
      .map(m => `${m.author}: ${m.summary}`)
      .join("\n");

    llmRequest.appendInstructions([
      `
The following content is from your previous conversations with the user.
They may be useful for answering the user's current query.
<PAST_CONVERSATIONS>
${memoryText}
</PAST_CONVERSATIONS>
`,
    ]);
  }
}
```

### Which Tool to Choose?

| Scenario                               | Recommended Tool        |
| -------------------------------------- | ----------------------- |
| Agent should decide when to recall     | `RecallMemoryTool`      |
| Always want context from past sessions | `PreloadMemoryTool`     |
| Both behaviors                         | Add both tools          |
| Maximum control                        | `RecallMemoryTool` only |

## Behavior Matrix

| Summarization | Embedding | Behavior                                            |
| ------------- | --------- | --------------------------------------------------- |
| No            | No        | Current behavior: stores raw events, keyword search |
| Yes           | No        | Summarizes sessions, keyword search on summaries    |
| No            | Yes       | Embeds raw event text (not recommended)             |
| Yes           | Yes       | Full semantic search on summaries                   |

## Default Summarization Prompt

```
Analyze this conversation and create a memory summary.

## Conversation
{events}

## Instructions
Create a JSON summary with:
1. "summary": A 2-3 sentence summary of what happened
2. "topics": Array of 3-5 key topics discussed
3. "keyFacts": Array of important facts about the user (preferences, decisions, personal info they shared)

Focus on information that would be useful to recall in future conversations.

## Output
Return only valid JSON:
```

## Implementation Plan

### Phase 1: Core Interfaces & Types

- [ ] Define all TypeScript interfaces in `packages/adk/src/memory/types.ts`
- [ ] Update `MemoryEntry` to support new `MemorySummary` structure
- [ ] Create `EmbeddingProvider` interface
- [ ] Create `VectorStore` interface

### Phase 2: Default Implementations

- [ ] `InMemoryVectorStore` - cosine similarity search for dev/testing
- [ ] `UnifiedSummarizer` - LLM-based summarization (implements `EventsSummarizer`)
- [ ] Update `MemoryService` class with new config options
- [ ] Add `reuseCompactionSummaries` option for efficiency

### Phase 3: Embedding Providers

- [ ] `OpenAIEmbedding` - text-embedding-3-small/large
- [ ] `CohereEmbedding` - embed-english-v3.0
- [ ] Document how to create custom providers

### Phase 4: Production Vector Stores

- [ ] `PineconeStore`
- [ ] `QdrantStore`
- [ ] `ChromaStore`

### Phase 5: Tools & Integration

- [ ] Update `RecallMemoryTool` for new memory format
- [ ] **Remove `SharedMemoryRequestProcessor`** from `SingleFlow` (ADK-TS deviation)
- [ ] **Delete `shared-memory.ts`** file
- [ ] Add `PreloadMemoryTool` (optional, aligns with Python ADK)
- [ ] Add memory lifecycle hooks (onMemoryCreated, onMemoryRecalled)
- [ ] Update documentation with explicit tool usage examples

## Migration Path

### Backward Compatibility

The new `MemoryService` with no config should behave identically to current `InMemoryMemoryService`:

```typescript
// These should be equivalent:
new InMemoryMemoryService();
new MemoryService(); // No config = keyword search on raw events
```

### Deprecation

- `InMemoryMemoryService` → Deprecated, use `new MemoryService()`
- `VertexAiRagMemoryService` → Deprecated, use `new MemoryService({ vectorStore: new VertexAIStore() })`
- **`SharedMemoryRequestProcessor` → REMOVE (see below)**

### Removing `SharedMemoryRequestProcessor`

**This is an ADK-TS deviation that doesn't exist in Python ADK and should be removed.**

#### What it currently does:

```typescript
// In flows/llm-flows/shared-memory.ts
// Runs automatically in SingleFlow pipeline on EVERY LLM request
class SharedMemoryRequestProcessor extends BaseLlmRequestProcessor {
  async *runAsync(invocationContext, llmRequest) {
    // 1. Takes user's last message as query
    // 2. Searches memory
    // 3. Auto-injects ALL matches into llmRequest.contents as fake user messages
    llmRequest.contents.push({
      role: "user",
      parts: [{ text: `[${memory.author}] said: ${memoryText}` }],
    });
  }
}
```

#### Why it's problematic:

1. **Doesn't exist in Python ADK** - We added this, upstream doesn't have it
2. **Always runs** - No opt-out, memory search happens on every request
3. **Injects as fake user messages** - Pollutes conversation context
4. **No control** - Agent can't decide when/what to recall
5. **Redundant** - We also have `LoadMemoryTool` for explicit recall

#### Python ADK's approach (what we should align with):

Python ADK has **two explicit tools** (both opt-in):

| Tool                | Purpose                  | How it works                                                                 |
| ------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `LoadMemoryTool`    | Agent-initiated recall   | Agent calls `load_memory(query)`                                             |
| `PreloadMemoryTool` | Auto-preload per request | You add it to agent's tools, it injects into **instructions** (not contents) |

```python
# Python's PreloadMemoryTool - injects cleanly into instructions
llm_request.append_instructions([f"""
The following content is from your previous conversations with the user.
<PAST_CONVERSATIONS>
{memory_text}
</PAST_CONVERSATIONS>
"""])
```

#### Migration:

1. **Remove** `SharedMemoryRequestProcessor` from `SingleFlow`
2. **Remove** `shared-memory.ts` file
3. **Add** `PreloadMemoryTool` (optional, explicit) that injects into instructions
4. **Keep** `LoadMemoryTool` / `RecallMemoryTool` for agent-initiated recall

Users who want auto-preload behavior can explicitly add `PreloadMemoryTool` to their agent.

## Integration with Event Compaction

Event compaction and memory summarization serve related purposes and can share infrastructure.

### Relationship

| Feature                  | Purpose                 | When                                 | Output                      |
| ------------------------ | ----------------------- | ------------------------------------ | --------------------------- |
| **Event Compaction**     | Shrink session context  | During session (every N invocations) | Compaction event in session |
| **Memory Summarization** | Store for future recall | End of session                       | Memory in vector store      |

### Unified Summarizer

Both features can share the same LLM summarizer:

```typescript
interface UnifiedSummarizerConfig {
  model: string | BaseLlm;

  /** Prompt for compacting events within a session */
  compactionPrompt?: string;

  /** Prompt for summarizing session into long-term memory */
  memoryPrompt?: string;
}

class UnifiedSummarizer implements EventsSummarizer {
  constructor(private config: UnifiedSummarizerConfig) {}

  // For event compaction (within session)
  async maybeSummarizeEvents(events: Event[]): Promise<Event | undefined> {
    // Uses compactionPrompt
  }

  // For memory creation (end of session)
  async summarizeForMemory(events: Event[]): Promise<MemorySummary> {
    // Uses memoryPrompt
  }
}
```

### Option: Reuse Compaction Summaries for Memory

Instead of re-summarizing at session end, **reuse compaction summaries**:

```typescript
const memoryService = new MemoryService({
  trigger: { type: "session_end" },
  summarization: {
    model: "gpt-4o-mini",
    // Use existing compaction summaries instead of re-summarizing
    reuseCompactionSummaries: true,
    // Only summarize events after last compaction
    summarizeRemainder: true,
  },
});
```

**Flow:**

```
Session with compaction enabled:
├── Events 1-50    → Compaction Summary A (already created)
├── Events 51-100  → Compaction Summary B (already created)
├── Events 101-120 → (not yet compacted)
└── Session ends:
    Memory = Summary A + Summary B + summarize(Events 101-120)

    No need to re-summarize events 1-100!
```

### Shared Configuration

```typescript
// Create a shared summarizer
const summarizer = new UnifiedSummarizer({
  model: "gpt-4o-mini",
});

const memoryService = new MemoryService({
  summarization: { summarizer },
  embedding: { provider: embeddingProvider },
});

const runner = new Runner({
  appName: "my-app",
  agent: myAgent,
  sessionService,
  memoryService,
  // Compaction uses the same summarizer
  eventsCompactionConfig: {
    compactionInterval: 10,
    overlapSize: 2,
    summarizer: summarizer, // Same instance!
  },
});
```

### Benefits

1. **Single LLM config** - One model for both features
2. **Efficiency** - Don't re-summarize already compacted events
3. **Consistent summaries** - Same style/format
4. **Cost savings** - Fewer LLM calls

### Implementation Tasks

- [ ] Create `UnifiedSummarizer` that implements `EventsSummarizer`
- [ ] Add `reuseCompactionSummaries` option to `SummarizationConfig`
- [ ] Extract compaction summaries from session events at session end
- [ ] Combine compaction summaries + remainder for memory creation

## Open Questions

1. **Memory Expiration**: Should memories expire after a certain time? Should this be configurable?

2. **Memory Consolidation**: Should we periodically consolidate old memories into higher-level summaries?

3. **User Feedback**: Should users be able to correct/delete memories? ("Forget that I said X")

4. **Cross-App Memory**: Should memories be shareable across different apps for the same user?

5. **Memory Size Limits**: Should we limit total memories per user? If so, which to evict?

## Practical Example: Full Working Code

This example demonstrates the complete flow - from setup, through a session about birds, to recalling that memory in a new session.

### Step 1: Setup the Agent with Memory

```typescript
import {
  AgentBuilder,
  Runner,
  MemoryService,
  InMemorySessionService,
  RecallMemoryTool,
  OpenAIEmbedding,
} from "@iqai/adk";

// Create the embedding provider
const embeddingProvider = new OpenAIEmbedding({
  apiKey: process.env.OPENAI_API_KEY,
  model: "text-embedding-3-small",
});

// Create the memory service with full config
const memoryService = new MemoryService({
  trigger: { type: "session_end" },
  summarization: {
    model: "gpt-4o-mini",
    prompt: `Summarize this conversation for long-term memory.

Focus on:
- What topics were discussed
- User preferences or opinions expressed
- Any facts the user shared about themselves
- Decisions or conclusions reached

Return JSON: { "summary": "...", "topics": [...], "keyFacts": [...] }`,
  },
  embedding: {
    provider: embeddingProvider,
  },
  searchTopK: 3,
});

// Create an agent with explicit memory tool
const agent = new AgentBuilder()
  .withName("assistant")
  .withModel("gpt-4o")
  .withTools([new RecallMemoryTool()]) // Explicit - clear what tools the agent has
  .withInstruction(
    `
    You are a helpful assistant with long-term memory.

    When the user references past conversations or you need context from
    previous sessions, use the recall_memory tool to search your memories.

    Always acknowledge when you're recalling information from past conversations.
  `,
  )
  .build();

// Create the runner
const sessionService = new InMemorySessionService();
const runner = new Runner({
  appName: "bird-chat",
  agent,
  sessionService,
  memoryService,
});
```

### Step 2: First Session - Discussing Birds

```typescript
async function firstSession() {
  // Create a new session
  const session = await sessionService.createSession({
    appName: "bird-chat",
    userId: "user-123",
  });

  console.log("=== SESSION 1: Discussing Birds ===\n");

  // User asks about parrots
  const response1 = runner.runAsync({
    userId: "user-123",
    sessionId: session.id,
    newMessage: {
      role: "user",
      parts: [
        {
          text: "I'm thinking about getting a pet parrot. What should I know?",
        },
      ],
    },
  });

  for await (const event of response1) {
    if (event.content?.parts?.[0]?.text) {
      console.log("Assistant:", event.content.parts[0].text, "\n");
    }
  }

  // User shares a preference
  const response2 = runner.runAsync({
    userId: "user-123",
    sessionId: session.id,
    newMessage: {
      role: "user",
      parts: [
        {
          text: "I really like African Grey parrots because they can talk. My apartment is small though.",
        },
      ],
    },
  });

  for await (const event of response2) {
    if (event.content?.parts?.[0]?.text) {
      console.log("Assistant:", event.content.parts[0].text, "\n");
    }
  }

  // End the session - this triggers memory summarization & embedding
  await sessionService.endSession(session.id);

  console.log("Session 1 ended. Memory has been created.\n");
}
```

### Step 3: What Happens Behind the Scenes

When the session ends, the memory service:

```typescript
// 1. Collects all events from the session
const events = session.events;

// 2. Sends to LLM for summarization
const summaryResponse = await llm.generate({
  prompt: summarizationPrompt + formatEvents(events),
});

// Result:
const memorySummary = {
  id: "mem_abc123",
  sessionId: "session_xyz",
  userId: "user-123",
  appName: "bird-chat",
  summary:
    "User is considering getting a pet parrot. They expressed interest in African Grey parrots specifically because of their talking ability. User mentioned they live in a small apartment, which may be a constraint for larger birds.",
  topics: ["parrots", "pets", "African Grey", "apartment living"],
  keyFacts: [
    "User wants a pet parrot",
    "User prefers African Grey parrots for their talking ability",
    "User lives in a small apartment",
  ],
  timestamp: "2024-01-15T10:30:00Z",
  eventCount: 4,
};

// 3. Generates embedding for the summary
const embedding = await embeddingProvider.embed(
  memorySummary.summary + " " + memorySummary.topics.join(" "),
);
// Result: [0.023, -0.041, 0.089, ...] (1536 dimensions)

// 4. Stores in vector store
await vectorStore.upsert(memorySummary.id, embedding, memorySummary);
```

### Step 4: New Session - Recalling the Memory

```typescript
async function secondSession() {
  // Create a completely new session (days/weeks later)
  const session = await sessionService.createSession({
    appName: "bird-chat",
    userId: "user-123",
  });

  console.log("=== SESSION 2: New Conversation ===\n");

  // User asks about something related but doesn't mention "parrot"
  const response = runner.runAsync({
    userId: "user-123",
    sessionId: session.id,
    newMessage: {
      role: "user",
      parts: [
        {
          text: "Hey, remember that pet we talked about? Did you have any other suggestions for my small space?",
        },
      ],
    },
  });

  for await (const event of response) {
    if (event.content?.parts?.[0]?.text) {
      console.log("Assistant:", event.content.parts[0].text, "\n");
    }
  }
}
```

### Step 5: What the Agent Does

The agent recognizes it needs past context and uses the recall tool:

```typescript
// Agent's internal reasoning:
// "User is asking about a pet we discussed before. I should check my memory."

// Agent calls the tool:
const toolCall = {
  name: "recall_memory",
  args: {
    query: "pet suggestions small space apartment",
  },
};

// Memory service processes the search:
// 1. Embed the query
const queryEmbedding = await embeddingProvider.embed("pet suggestions small space apartment");

// 2. Search vector store for similar memories
const results = await vectorStore.search(queryEmbedding, topK: 3, {
  userId: "user-123",
  appName: "bird-chat",
});

// 3. Return to agent:
const memories = [
  {
    summary: "User is considering getting a pet parrot. They expressed interest in African Grey parrots...",
    topics: ["parrots", "pets", "African Grey", "apartment living"],
    keyFacts: [
      "User wants a pet parrot",
      "User prefers African Grey parrots for their talking ability",
      "User lives in a small apartment"
    ],
    timestamp: "2024-01-15T10:30:00Z",
    relevance: 0.89,
  }
];
```

### Step 6: Agent's Response

With the memory context, the agent can now respond intelligently:

```
Assistant: Yes, I remember! You were interested in getting an African Grey parrot
because you love that they can talk. You mentioned your apartment is small, which
is definitely something to consider.

For a smaller space, you might want to look at:
- Budgies (parakeets) - Much smaller, still can learn to talk
- Cockatiels - Medium-sized, great personalities, apartment-friendly
- Parrotlets - Tiny but feisty, nicknamed "pocket parrots"

African Greys are wonderful but they do need significant space and can be quite
loud. Would you like more details on any of these smaller alternatives?
```

### Complete Runnable Example

```typescript
import {
  AgentBuilder,
  Runner,
  MemoryService,
  InMemorySessionService,
  RecallMemoryTool,
  OpenAIEmbedding,
} from "@iqai/adk";

async function main() {
  // === SETUP ===
  const memoryService = new MemoryService({
    trigger: { type: "session_end" },
    summarization: { model: "gpt-4o-mini" },
    embedding: {
      provider: new OpenAIEmbedding({
        apiKey: process.env.OPENAI_API_KEY,
      }),
    },
  });

  const agent = new AgentBuilder()
    .withName("assistant")
    .withModel("gpt-4o")
    .withTools([new RecallMemoryTool()]) // Explicit tool addition
    .withInstruction(
      "You are a helpful assistant with long-term memory. Use recall_memory when you need context from past conversations.",
    )
    .build();

  const sessionService = new InMemorySessionService();
  const runner = new Runner({
    appName: "my-app",
    agent,
    sessionService,
    memoryService,
  });

  // === SESSION 1 ===
  const session1 = await sessionService.createSession({
    appName: "my-app",
    userId: "user-123",
  });

  // Have a conversation about birds...
  for await (const event of runner.runAsync({
    userId: "user-123",
    sessionId: session1.id,
    newMessage: {
      role: "user",
      parts: [{ text: "I love African Grey parrots!" }],
    },
  })) {
    console.log(event.content?.parts?.[0]?.text);
  }

  // End session - triggers memory creation
  await sessionService.endSession(session1.id);

  // === SESSION 2 (later) ===
  const session2 = await sessionService.createSession({
    appName: "my-app",
    userId: "user-123",
  });

  // Ask about past conversation - agent will use recall_memory tool
  for await (const event of runner.runAsync({
    userId: "user-123",
    sessionId: session2.id,
    newMessage: {
      role: "user",
      parts: [{ text: "What bird did I say I liked?" }],
    },
  })) {
    console.log(event.content?.parts?.[0]?.text);
  }
  // Output: "You mentioned that you love African Grey parrots!"
}

main();
```

## References

- [OpenClaw Memory System](https://github.com/openclaw)
- [LangChain Memory](https://python.langchain.com/docs/modules/memory/)
- [MemGPT](https://memgpt.ai/) - Inspiration for hierarchical memory
