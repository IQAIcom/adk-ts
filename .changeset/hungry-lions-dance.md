---
"@iqai/adk": patch
---

Fix: Wire up plugin beforeModelCallback and beforeToolCallback hooks

The PluginManager had these callback methods defined but they were never invoked, causing plugins implementing guardrails or pre-execution logic to be silently ignored. This fix adds the missing calls in base-llm-flow.ts and functions.ts, following the same pattern used by other plugin callbacks.
