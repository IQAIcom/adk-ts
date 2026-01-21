---
"@iqai/adk": patch
---

Improve tracing with sequential span indices for better observability.

- Add span counters to `InvocationContext` for tracking LLM, tool, and agent invocations
- Update trace span names to include indices (e.g., `agent_run [my-agent] #1`, `execute_tool [search] #1`, `llm_generate [gpt-4] #1`)
- Include app name in invocation span for better traceability
- Disable auto instrumentation by default to reduce trace noise
- Update telemetry documentation with new span naming conventions
