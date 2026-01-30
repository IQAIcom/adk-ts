---
"@iqai/mcp-docs": patch
"@iqai/adk-cli": patch
"@iqai/adk": patch
---

Add `ToolOutputFilterPlugin` to intelligently reduce large tool outputs before downstream processing.

The plugin dynamically generates safe `jq` filters using an LLM to extract only relevant data, applying adaptive and iterative filtering until configurable size or key-count targets are met. This improves performance, prevents context window overflows, and supports per-tool enablement, schema-aware filtering, and strict security checks against unsafe filters.
