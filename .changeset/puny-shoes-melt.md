---
"@iqai/adk-cli": patch
"@iqai/adk": patch
---

Add Context Caching support for ADK Apps using Gemini 2.0+ models.

This feature allows agents to reuse extended instructions or large contextual data across requests, reducing token usage and improving performance. Caching behavior is configurable at the App or Agent level via `contextCacheConfig`, with controls for minimum token threshold, cache TTL, and maximum usage intervals.

All agents within an App can benefit from shared cached context, minimizing redundant data sent to the model while preserving correctness.
