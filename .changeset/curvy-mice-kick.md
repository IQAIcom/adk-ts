---
"@iqai/adk": patch
---

- Added aggregated token usage tracking (input, output, total) across agents, nested agents, and LLM generations.
- Introduced model usage tracking per agent and invocation for improved model attribution.
- Embedded aggregated token and model usage data into Langfuse agent spans and root trace metadata.
- Ensured compatibility with nested agents without modifying the existing span hierarchy.
- Implemented cleanup of internal token and model tracking maps after each invocation to prevent memory leaks.
- Improved event naming with descriptive suffixes (`.function_call`, `.final_response`, `.event`).
- Included `finishReason` in event metadata for enhanced execution context and observability.
