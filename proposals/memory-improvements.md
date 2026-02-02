# Proposal: Enhanced Memory System

> **For Implementation**: Start with the "Quick Implementation Checklist" below.

## Quick Implementation Checklist

### Immediate Tasks (Branch: `memory-improvements`)

- [ ] **1. Delete `SharedMemoryRequestProcessor`**
  - Remove from `packages/adk/src/flows/llm-flows/single-flow.ts` (line 17, 36)
  - Delete `packages/adk/src/flows/llm-flows/shared-memory.ts`
- [ ] **2. Create new types** in `packages/adk/src/memory/types.ts`
- [ ] **3. Create `InMemoryVectorStore`** - cosine similarity search
- [ ] **4. Create `MemoryService`** class with config support
- [ ] **5. Create SummaryProvider implementations**:
  - `LlmSummaryProvider` - summarizes via LLM
  - `CompactionAwareSummaryProvider` - reuses compaction events, LLM for remainder
- [ ] **6. Create `RecallMemoryTool`** - agent-initiated memory search
- [ ] **7. Create `PreloadMemoryTool`** - optional auto-preload
- [ ] **8. Create `OpenAIEmbedding`** provider
- [ ] **9. Add `endSession()` to `BaseSessionService`**

### Key Files

```
packages/adk/src/memory/
├── types.ts                    (NEW - all interfaces)
├── memory-service.ts           (NEW - main service)
├── summary-providers/
│   ├── llm-summary-provider.ts
│   └── compaction-aware-summary-provider.ts
├── vector-stores/
│   └── in-memory-vector-store.ts
└── embeddings/
    └── openai-embedding.ts

packages/adk/src/tools/common/
├── recall-memory-tool.ts
└── preload-memory-tool.ts

packages/adk/src/flows/llm-flows/
├── single-flow.ts              (MODIFY - remove sharedMemoryRequestProcessor)
└── shared-memory.ts            (DELETE)
```

---

## Problem Statement

1. **Naive Storage**: Stores raw events without summarization
2. **Keyword Matching**: "what bird did we discuss" won't find "parrot" memories
3. **Wasteful Triggers**: `addSessionToMemory` called after every event
4. **ADK-TS Deviation**: `SharedMemoryRequestProcessor` auto-injects memory on every request (doesn't exist in Python ADK)

```
Session 1: User discusses parrots, African Grey species
Session 2: User asks "remind me about that flying animal"

Current:  ❌ No match (no word overlap)
Proposed: ✅ Finds via semantic similarity
```

## Architecture

```
Session Ends → Summarizer → Embedding Provider → Vector Store
                   ↓               ↓                  ↓
            MemorySummary    number[]         {id, embedding, metadata}

New Session → RecallMemoryTool → Embed query → Similarity search → Return top-K
```

## Interface Design

```typescript
interface MemoryServiceConfig {
  trigger?: MemoryTriggerConfig;
  summarization?: { provider: SummaryProvider };
  embedding?: { provider: EmbeddingProvider; model?: string };
  vectorStore?: VectorStore;
  searchTopK?: number; // Default: 5
}

interface MemoryTriggerConfig {
  type: "session_end" | "inactivity" | "message_count" | "compaction";
  inactivityMs?: number; // For 'inactivity' type
  messageCount?: number; // For 'message_count' type
  // 'compaction' type: triggers when eventsCompactionConfig fires
  // Creates memory from each compaction event as it happens
}

interface SummaryProvider {
  getSummaries(session: Session): Promise<SessionSummary[]>;
}

interface SessionSummary {
  summary: string;
  topics?: string[];
  keyFacts?: string[];
  startTimestamp?: string;
  endTimestamp?: string;
  eventCount?: number;
}

interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch?(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
}

interface VectorStore {
  upsert(
    id: string,
    embedding: number[],
    metadata: MemorySummary,
  ): Promise<void>;
  search(
    embedding: number[],
    topK: number,
    filter?: VectorStoreFilter,
  ): Promise<VectorSearchResult[]>;
  delete?(id: string): Promise<void>;
  deleteMany?(filter: VectorStoreFilter): Promise<number>;
}

interface VectorStoreFilter {
  userId?: string;
  appName?: string;
  sessionId?: string;
  after?: string;
  before?: string;
}

interface MemorySummary {
  id: string;
  sessionId: string;
  userId: string;
  appName: string;
  summary: string;
  topics?: string[];
  keyFacts?: string[];
  timestamp: string;
  eventCount?: number;
}
```

## Usage Examples

### Basic (Keyword Search)

```typescript
new MemoryService(); // No config = current behavior
```

### Full Semantic Search

```typescript
new MemoryService({
  trigger: { type: "session_end" },
  summarization: {
    provider: new LlmSummaryProvider({ model: "gpt-4o-mini" }),
  },
  embedding: {
    provider: new OpenAIEmbedding({ apiKey: process.env.OPENAI_API_KEY }),
  },
});
```

### With Compaction Trigger (Recommended)

```typescript
// Memory created each time compaction fires - zero extra LLM cost
// Uses compaction summary directly as memory
new MemoryService({
  trigger: { type: "compaction" },
  embedding: { provider: new OpenAIEmbedding() },
  // No summarization needed - uses compaction summary directly
});
```

### With Compaction at Session End

```typescript
// Simple: config object with model
new MemoryService({
  trigger: { type: "session_end" },
  summarization: {
    provider: new CompactionAwareSummaryProvider({ model: "gpt-4o-mini" }),
  },
  embedding: { provider: new OpenAIEmbedding() },
});

// Advanced: pass custom provider directly
new MemoryService({
  trigger: { type: "session_end" },
  summarization: {
    provider: new CompactionAwareSummaryProvider(
      new LlmSummaryProvider({
        model: "gemini-2.0-flash",
        prompt: "Custom summarization prompt...",
      }),
    ),
  },
  embedding: { provider: new OpenAIEmbedding() },
});
```

## Agent Memory Tools

Two explicit tools (both opt-in, must be added to agent):

| Tool                | Behavior                                      |
| ------------------- | --------------------------------------------- |
| `RecallMemoryTool`  | Agent calls `recall_memory(query)` explicitly |
| `PreloadMemoryTool` | Auto-searches, injects into **instructions**  |

### RecallMemoryTool (Recommended)

```typescript
const agent = new AgentBuilder()
  .withTools([new RecallMemoryTool()])
  .withInstruction("Use recall_memory when you need past context.")
  .build();
```

```typescript
class RecallMemoryTool extends BaseTool {
  name = "recall_memory";
  description = "Search memory for past conversations.";
  parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "What to search for" },
      limit: { type: "number", description: "Max results (default: 5)" },
    },
    required: ["query"],
  };

  async runAsync(
    args: { query: string; limit?: number },
    context: ToolContext,
  ) {
    const results = await context.searchMemory(args.query, args.limit);
    return {
      memories: results.map(r => ({ ...r.memory, relevance: r.score })),
    };
  }
}
```

### PreloadMemoryTool

```typescript
class PreloadMemoryTool extends BaseTool {
  async processLlmRequest(toolContext: ToolContext, llmRequest: LlmRequest) {
    const userQuery = toolContext.userContent?.parts?.[0]?.text;
    if (!userQuery) return;

    const response = await toolContext.searchMemory(userQuery);
    if (!response.memories.length) return;

    llmRequest.appendInstructions([
      `
      <PAST_CONVERSATIONS>
      ${response.memories.map(m => m.summary).join("\n")}
      </PAST_CONVERSATIONS>
    `,
    ]);
  }
}
```

## Behavior Matrix

| Summarization | Embedding | Behavior                                      |
| ------------- | --------- | --------------------------------------------- |
| No            | No        | Current: raw events, keyword search           |
| Yes           | No        | Summarized, keyword search                    |
| No            | Yes       | Raw event embeddings (warns, not recommended) |
| Yes           | Yes       | Full semantic search (recommended)            |

### Configuration Validation

The `MemoryService` validates config at initialization and warns about suboptimal configurations:

```typescript
class MemoryService {
  constructor(config?: MemoryServiceConfig) {
    if (config?.embedding && !config?.summarization) {
      console.warn(
        "[MemoryService] Embedding without summarization is not recommended. " +
          "Raw events produce noisy embeddings with poor search quality. " +
          "Consider adding a SummaryProvider for better results.",
      );
    }
  }
}
```

**Why warn instead of error?**

- Doesn't break experimentation or testing
- Educates users about best practices
- Advanced users can intentionally ignore if needed
- Graceful degradation - still works, just suboptimally

## SummaryProvider Implementations

```typescript
// LLM-based: Fresh summaries via LLM (summarizes all events)
class LlmSummaryProvider implements SummaryProvider {
  constructor(private config: { model: string; prompt?: string }) {}

  async getSummaries(session: Session): Promise<SessionSummary[]> {
    const events = session.events.filter(e => e.content?.parts);
    const response = await this.llm.generate({ prompt: formatEvents(events) });
    return [parseSummaryResponse(response)];
  }
}

// Compaction-aware: Reuses compaction events, LLM only for remainder
// Use this when eventsCompactionConfig is enabled on the Runner
class CompactionAwareSummaryProvider implements SummaryProvider {
  private provider: SummaryProvider;

  // Simple: pass config with model
  // Advanced: pass provider directly
  constructor(
    configOrProvider: SummaryProvider | { model: string; prompt?: string },
  ) {
    if ("getSummaries" in configOrProvider) {
      this.provider = configOrProvider;
    } else {
      this.provider = new LlmSummaryProvider(configOrProvider);
    }
  }

  async getSummaries(session: Session): Promise<SessionSummary[]> {
    // 1. Extract summaries from compaction events (free - no LLM cost)
    const compactionEvents = session.events.filter(e => e.actions?.compaction);
    const compacted = compactionEvents.map(e => ({
      summary: e.actions.compaction.compactedContent.parts[0].text,
      startTimestamp: e.actions.compaction.startTimestamp,
      endTimestamp: e.actions.compaction.endTimestamp,
    }));

    // 2. Find events not yet compacted
    const lastCompactedTime = compacted.at(-1)?.endTimestamp;
    const remaining = lastCompactedTime
      ? session.events.filter(e => e.timestamp > lastCompactedTime)
      : session.events;

    // 3. Summarize remainder via provider (only if needed)
    if (remaining.length > 0) {
      const remainder = await this.provider.getSummaries({
        ...session,
        events: remaining,
      });
      return [...compacted, ...remainder];
    }

    return compacted;
  }
}
```

## Migration

### Backward Compatibility

```typescript
new InMemoryMemoryService(); // Old
new MemoryService(); // New - equivalent behavior
```

### Deprecations

- `InMemoryMemoryService` → `new MemoryService()`
- `VertexAiRagMemoryService` → `new MemoryService({ vectorStore: new VertexAIStore() })`
- `SharedMemoryRequestProcessor` → **REMOVE** (use `PreloadMemoryTool` instead)

### Why Remove `SharedMemoryRequestProcessor`

**Current behavior** (problematic):

- Runs on EVERY LLM request with no opt-out
- Injects as fake user messages (pollutes context)
- Doesn't exist in Python ADK

**Replacement** (`PreloadMemoryTool`):

- Explicit opt-in (add to agent's tools)
- Injects into instructions, not contents
- Aligns with Python ADK

## Default Summarization Prompt

```
Analyze this conversation and create a memory summary.

## Conversation
{events}

## Instructions
Return JSON with:
1. "summary": 2-3 sentence summary
2. "topics": 3-5 key topics
3. "keyFacts": Important user preferences/decisions
```

## Open Questions

1. **Memory Expiration**: Should memories expire? Configurable TTL?
2. **Consolidation**: Periodically merge old memories into higher-level summaries?
3. **User Feedback**: "Forget that I said X" - allow correction/deletion?
4. **Cross-App**: Share memories across apps for same user?
5. **Size Limits**: Max memories per user? Eviction policy?

## Quick Example

```typescript
// Setup
const memoryService = new MemoryService({
  trigger: { type: "session_end" },
  summarization: { provider: new LlmSummaryProvider({ model: "gpt-4o-mini" }) },
  embedding: { provider: new OpenAIEmbedding() },
});

const agent = new AgentBuilder()
  .withTools([new RecallMemoryTool()])
  .withInstruction("Use recall_memory for past context.")
  .build();

const runner = new Runner({
  appName: "my-app",
  agent,
  sessionService,
  memoryService,
});

// Session 1: User discusses parrots
await runner.runAsync({
  userId: "user-123",
  sessionId: s1.id,
  newMessage: {
    role: "user",
    parts: [{ text: "I love African Grey parrots!" }],
  },
});
await sessionService.endSession(s1.id); // Triggers memory creation

// Session 2: Agent recalls via semantic search
await runner.runAsync({
  userId: "user-123",
  sessionId: s2.id,
  newMessage: { role: "user", parts: [{ text: "What bird did I like?" }] },
});
// Agent uses recall_memory → finds "African Grey parrots" via embedding similarity
```
