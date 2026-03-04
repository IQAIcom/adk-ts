---
"@iqai/adk": patch
---

fix: handle null `answer` from Tavily API in WebSearchTool

Tavily returns `"answer": null` by default when `include_answer` is not set, but the Zod schema typed `answer` as `z.string().optional()` which rejects `null`. Changed to `z.string().nullish()` to accept both `null` and `undefined`.
