---
"@iqai/adk": minor
---

feat(adk): align before/after model callback signatures with runtime (single object arg) and wire before/after tool callbacks into tool execution.

- beforeModelCallback/afterModelCallback now receive `{ callbackContext, llmRequest|llmResponse }` to match runtime invocation; removes need for casts in examples.
- beforeToolCallback/afterToolCallback are now invoked around tool execution; allow argument mutation and result override.
- tracing updated to include final args and the produced event.
- minor lint/style cleanups in flows.