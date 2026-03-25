---
"@iqai/adk": minor
---

Add `GoogleLlmConfig` and `AiSdkLlmOptions` for explicit, request-scoped Google client configuration. This eliminates process.env race conditions when multiple GoogleLlm or AiSdkLlm instances with different backends run concurrently in a multi-tenant server. Env-based fallback is preserved when no config is provided.
