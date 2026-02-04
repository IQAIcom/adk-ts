---
"@iqai/adk": minor
---

feat: add streaming utilities and improve streaming across LLM providers

**Streaming Utilities**
- Add `textStreamFrom()` to extract text-only deltas from an event stream
- Add `collectTextFrom()` to accumulate streamed text into a single string
- Add `streamTextWithFinalEvent()` to stream text while capturing the final event with metadata

**Anthropic Streaming**
- Implement full streaming support via `handleStreaming()` async generator
- Yield partial text deltas, accumulate tool call JSON, and detect thought blocks
- Emit final response with complete text, tool calls, and usage metadata

**AI SDK Streaming Fix**
- Fix partial responses yielding accumulated text instead of deltas, which caused duplicated text when consumed via streaming utilities

**Code Quality**
- Extract thought tag detection into `THOUGHT_OPEN_TAGS`/`THOUGHT_CLOSE_TAGS` constants and `containsAny()` helper
- Replace `as any` casts with proper `Part` type from `@google/genai`
- Use guard clauses in streaming utilities for cleaner control flow
