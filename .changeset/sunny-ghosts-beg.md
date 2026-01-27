---
"@iqai/adk-cli": patch
"@iqai/adk": patch
---

Introduced backend support for **trace visualization** of agent execution sessions. The system now captures OpenTelemetry spans in-memory (in addition to OTLP export), groups them by `sessionId`, and exposes them via a new debug API. This enables the UI to reconstruct full execution trees and timelines for agents, tools, and LLM calls.

**Highlights**

- In-memory span storage with rolling buffer scoped per session
- Dual export: OTLP + in-memory trace store
- New API: `GET /debug/trace/session/:sessionId`
- Visualization-ready trace format (IDs, hierarchy, timing, attributes)
- Designed for local development and debugging workflows
