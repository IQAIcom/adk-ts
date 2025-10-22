# Event Compaction Tests

This directory contains comprehensive tests for the event compaction feature in ADK-TS.

## Test Files

### 1. `compaction.test.ts`

Tests the core compaction logic in `runCompactionForSlidingWindow()`.

**Coverage:**
- ✅ No compaction when there are no events
- ✅ No compaction when events are fewer than `compactionInterval`
- ✅ Compaction triggers when enough invocations accumulate
- ✅ Overlap events are included based on `overlapSize`
- ✅ Already compacted events are not compacted again
- ✅ Compaction events are appended to session
- ✅ Empty event arrays handled gracefully
- ✅ `compactionInterval` setting is respected
- ✅ Handles case when summarizer returns undefined
- ✅ Multiple invocations with same timestamp

**Key Test Scenarios:**
- Sliding window compaction logic
- Invocation tracking and timestamp management
- Overlap calculation
- Session integration

### 2. `llm-event-summarizer.test.ts`

Tests the LLM-based event summarization implementation.

**Coverage:**
- ✅ Returns undefined for empty/null events
- ✅ Generates summary for valid events
- ✅ Custom prompt templates work correctly
- ✅ Function call events are formatted properly
- ✅ Function response events are formatted properly
- ✅ Multiple response chunks are concatenated
- ✅ Empty summaries return undefined
- ✅ Whitespace-only summaries return undefined
- ✅ Events with multiple parts are handled
- ✅ Timestamps are formatted correctly
- ✅ Compaction event metadata is created correctly

**Key Test Scenarios:**
- LLM integration and streaming responses
- Event formatting for different content types
- Summary validation and edge cases
- Compaction event creation

### 3. `agent-builder-compaction.test.ts`

Tests the AgentBuilder integration with event compaction.

**Coverage:**
- ✅ Configure compaction with custom config
- ✅ Configure compaction with custom summarizer
- ✅ Chain with other configuration methods
- ✅ Config can be set before/after other settings
- ✅ Compaction config is passed to runner
- ✅ Works without explicit session service
- ✅ Valid compactionInterval values accepted
- ✅ Valid overlapSize values accepted
- ✅ Large compactionInterval values accepted
- ✅ Compaction config can be updated
- ✅ Works with all configuration options
- ✅ Works with LLM agents
- ✅ Minimal config works
- ✅ Zero overlapSize works

**Key Test Scenarios:**
- Builder pattern integration
- Configuration flexibility
- Runner and session integration
- Validation and edge cases

## Running Tests

Run all compaction tests:
```bash
pnpm test -- events
```

Run specific test file:
```bash
pnpm test -- compaction.test.ts
pnpm test -- llm-event-summarizer.test.ts
pnpm test -- agent-builder-compaction.test.ts
```

Run with watch mode:
```bash
pnpm test:watch -- events
```

## Test Architecture

### Mocking Strategy

**LLM Mocking:**
- Uses Vitest's `vi.fn()` to mock `generateContentAsync`
- Returns async generators to simulate streaming responses
- Allows testing different response scenarios

**Session Service:**
- Uses `InMemorySessionService` for isolated testing
- Each test creates its own session
- No external dependencies or persistent state

**Summarizer Mocking:**
- Implements `EventsSummarizer` interface
- Returns predefined compaction events
- Allows testing compaction logic independently

### Test Data Creation

**Helper Functions:**
```typescript
// Create events with specific properties
new Event({
  invocationId: "inv-1",
  author: "user",
  content: { parts: [{ text: "Hello" }] },
  timestamp: 1000,
})

// Create compaction events
new Event({
  author: "user",
  actions: new EventActions({
    compaction: {
      startTimestamp: 1000,
      endTimestamp: 2000,
      compactedContent: { ... }
    }
  })
})
```

## Coverage Summary

**Total Tests:** 49 tests across 3 files

**Areas Covered:**
- Core compaction algorithm (sliding window)
- LLM-based summarization
- AgentBuilder integration
- Session management
- Error handling
- Edge cases

**Not Covered (Future Work):**
- Integration tests with real LLM calls
- Performance testing with large event sets
- Concurrent compaction scenarios
- Database-backed session services

## Contributing

When adding new compaction features:

1. Add unit tests to appropriate test file
2. Test both success and error cases
3. Include edge cases (empty, null, large values)
4. Mock external dependencies (LLM, session service)
5. Update this README with new test coverage

## Related Files

- `src/events/compaction.ts` - Core compaction logic
- `src/events/llm-event-summarizer.ts` - LLM summarizer implementation
- `src/agents/agent-builder.ts` - AgentBuilder with compaction support
- `apps/examples/src/12-event-compaction/` - Example usage
