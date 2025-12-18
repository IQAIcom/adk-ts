---
"@iqai/adk": patch
---

Added full plugin support across the agent lifecycle, enabling interception and extension of agent behavior during execution, model calls, and tool invocations.

- Integrated plugin manager into `BaseAgent`, giving plugins priority over canonical callbacks.
- Added `plugins` configuration to `AgentBuilder` and introduced `withPlugins()` API.
- Updated `LlmAgent` and `BaseAgent` flows to run plugin lifecycle hooks (`before/after agent`, `before/after model`, `before/after tool`, error hooks, etc.).
- Plugins can now override or modify behavior at multiple stages.

- Fully backward compatible (optional chaining, canonical callbacks still work).
- Enables custom logging, monitoring, request rewriting, caching, rate limiting, and more via plugins.
