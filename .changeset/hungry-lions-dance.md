---
"@iqai/adk": patch
---

Fix: Wire up all missing plugin lifecycle callbacks

The PluginManager had several callback methods defined but never invoked, causing plugins implementing guardrails, logging, or error recovery to be silently ignored.

This fix adds the missing calls for:
- `beforeModelCallback` / `afterModelCallback` - intercept LLM requests/responses
- `onModelErrorCallback` - handle/recover from LLM errors
- `beforeToolCallback` / `afterToolCallback` - intercept tool execution
- `onToolErrorCallback` - handle/recover from tool errors

All 12 plugin callbacks are now properly wired up and invoked at the appropriate lifecycle points.
