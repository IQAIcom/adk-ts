---
"@iqai/adk": patch
---

Fix optional peer dependency issue with Langfuse.

Previously, importing `@iqai/adk` would fail if `langfuse` was missing, even when the Langfuse plugin was not used.

This change:

- Uses `import type` for Langfuse to preserve type safety without a runtime import.
- Dynamically requires `langfuse` inside `LangfusePlugin` constructor.
- Throws a clear error if the plugin is used without `langfuse` installed.

Now, users can import `@iqai/adk` without installing `langfuse` unless they use the Langfuse plugin.
