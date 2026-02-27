# ADK-TS Telemetry: GenAI Semantic Conventions Alignment

This document captures how our tracing currently maps to OpenTelemetry GenAI semantic conventions (v1.38.0, development status) and what to change to stay aligned. It is intentionally concise and actionable.

---

## Current instrumentation (tracing)

| What we do         | Details                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| System identifier  | spans set `gen_ai.system = iqai-adk` (**deprecated attr**; spec now uses `gen_ai.provider.name`)                                                    |
| Operation name     | `gen_ai.operation.name` set per operation (`invoke_agent`, `execute_tool`, `chat`, etc.)                                                            |
| LLM spans          | model, max_tokens, temperature, top_p, finish_reasons, token usage (input/output/total)                                                             |
| Tool spans         | tool name/description/type/call_id; args/response opt-in via content gate                                                                           |
| Agent spans        | agent name/description, conversation id                                                                                                             |
| Content capture    | opt-in via `ADK_CAPTURE_MESSAGE_CONTENT`; emitted as attributes (`adk.llm.request/response`) and legacy events (`gen_ai.content.prompt/completion`) |
| ADK-specific attrs | session, user, invocation, event IDs; environment; transfer/callback/memory/plugin metadata under `adk.*`                                           |

Reference files:

- [tracing.ts](packages/adk/src/telemetry/tracing.ts)
- [constants.ts](packages/adk/src/telemetry/constants.ts)

---

## Issues in current constants

| Constant                            | Current value               | Problem                                                                                      |
| ----------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `SEMCONV.GEN_AI_SYSTEM`             | `gen_ai.system`             | **Deprecated**. Spec v1.38 uses `gen_ai.provider.name` (required).                           |
| `SEMCONV.GEN_AI_USAGE_TOTAL_TOKENS` | `gen_ai.usage.total_tokens` | **Not in spec**. Spec only defines input/output tokens; total is computed.                   |
| `SEMCONV.GEN_AI_CONTENT_PROMPT`     | `gen_ai.content.prompt`     | **Non-standard**. Spec uses `gen_ai.input.messages` (structured attr) or event body.         |
| `SEMCONV.GEN_AI_CONTENT_COMPLETION` | `gen_ai.content.completion` | **Non-standard**. Spec uses `gen_ai.output.messages`.                                        |
| `OPERATIONS.CALL_LLM`               | `call_llm`                  | **Unused**. Tracing uses `chat`; spec uses `chat`, `text_completion`, or `generate_content`. |

Custom ADK-TS operations (`transfer_agent`, `execute_callback`, `search_memory`, `insert_memory`, `execute_plugin`) are fine as framework-specific extensions, but should be documented as non-standard.

---

## Missing spec attributes

### Required (must set)

| Attribute               | Notes                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gen_ai.provider.name`  | e.g., `openai`, `anthropic`, `aws.bedrock`, `azure.ai.inference`, `gcp.gemini`, `mistral_ai`, `groq`, `cohere`, `deepseek`, `x_ai`, `perplexity`, `ibm.watsonx.ai` |
| `gen_ai.operation.name` | Must be well-known value when applicable                                                                                                                           |

### Conditionally required / Recommended

| Attribute                          | Status     | Notes                                                   |
| ---------------------------------- | ---------- | ------------------------------------------------------- |
| `gen_ai.request.model`             | Cond. Req. | Already have                                            |
| `gen_ai.response.model`            | Rec.       | **Missing** – actual model name returned                |
| `gen_ai.response.id`               | Rec.       | **Missing** – completion ID                             |
| `gen_ai.conversation.id`           | Cond. Req. | Already have                                            |
| `gen_ai.output.type`               | Cond. Req. | **Missing** – `text`, `json`, `image`, `speech`         |
| `gen_ai.request.choice.count`      | Cond. Req. | **Missing** – number of choices requested (if !=1)      |
| `gen_ai.request.seed`              | Cond. Req. | **Missing**                                             |
| `gen_ai.request.frequency_penalty` | Rec.       | **Missing**                                             |
| `gen_ai.request.presence_penalty`  | Rec.       | **Missing**                                             |
| `gen_ai.request.stop_sequences`    | Rec.       | **Missing**                                             |
| `gen_ai.request.top_k`             | Rec.       | **Missing**                                             |
| `server.address`                   | Rec.       | **Missing** – GenAI server host                         |
| `server.port`                      | Cond. Req. | **Missing** – if server.address is set                  |
| `error.type`                       | Cond. Req. | **Missing on error** – low-cardinality error identifier |

### Agent-specific (invoke_agent / create_agent)

| Attribute               | Notes                                 |
| ----------------------- | ------------------------------------- |
| `gen_ai.agent.id`       | **Missing** – unique agent identifier |
| `gen_ai.data_source.id` | **Missing** – for RAG/knowledge base  |

### Tool-specific (execute_tool)

| Attribute                    | Notes                                         |
| ---------------------------- | --------------------------------------------- |
| `gen_ai.tool.call.arguments` | **Missing** – structured tool input (opt-in)  |
| `gen_ai.tool.call.result`    | **Missing** – structured tool output (opt-in) |

### Embeddings (if/when we support)

| Attribute                           | Notes                      |
| ----------------------------------- | -------------------------- |
| `gen_ai.embeddings.dimension.count` | embedding vector size      |
| `gen_ai.request.encoding_formats`   | `["float", "base64"]` etc. |

### Content (opt-in, large/PII)

| Attribute                    | Notes                          |
| ---------------------------- | ------------------------------ |
| `gen_ai.system_instructions` | system prompt / instructions   |
| `gen_ai.input.messages`      | full chat history input        |
| `gen_ai.output.messages`     | model output messages          |
| `gen_ai.tool.definitions`    | tool schemas provided to model |

---

## Missing spec metrics

Our `METRICS` constants use `adk.*` namespace. Spec defines:

| Metric                                | Type      | Unit      | Notes                                                   |
| ------------------------------------- | --------- | --------- | ------------------------------------------------------- |
| `gen_ai.client.operation.duration`    | Histogram | `s`       | **Required**                                            |
| `gen_ai.client.token.usage`           | Histogram | `{token}` | Rec.; attrs include `gen_ai.token.type = input\|output` |
| `gen_ai.server.request.duration`      | Histogram | `s`       | Server-side (if hosting)                                |
| `gen_ai.server.time_to_first_token`   | Histogram | `s`       | Streaming latency                                       |
| `gen_ai.server.time_per_output_token` | Histogram | `s`       | Decode phase                                            |

We can keep `adk.*` metrics for internal use but should add the spec metrics for interop.

---

## Span naming convention

Spec recommends: `{gen_ai.operation.name} {gen_ai.request.model}`

Examples: `chat gpt-4`, `invoke_agent MathTutor`, `execute_tool get_weather`

---

## Implementation plan

### Phase 1: Fix critical issues (breaking changes to constants)

1. **Replace `gen_ai.system`** with `gen_ai.provider.name` in `SEMCONV`:
   - Add `GEN_AI_PROVIDER_NAME: "gen_ai.provider.name"`
   - Deprecate/remove `GEN_AI_SYSTEM`
   - Update all span setters to use `gen_ai.provider.name`
2. **Rename `CALL_LLM`** to spec value:
   - Add `CHAT: "chat"`, `TEXT_COMPLETION: "text_completion"`, `GENERATE_CONTENT: "generate_content"` to `OPERATIONS`
   - Decide per call site which operation name applies (usually `chat`)
3. **Remove non-spec attrs** from `SEMCONV`:
   - Remove `GEN_AI_USAGE_TOTAL_TOKENS` (compute client-side if needed)
   - Deprecate `GEN_AI_CONTENT_PROMPT` / `GEN_AI_CONTENT_COMPLETION` (keep temporarily for backward compat)
4. **Add missing required/rec attrs** to `SEMCONV`:
   - `GEN_AI_RESPONSE_ID`, `GEN_AI_RESPONSE_MODEL`
   - `GEN_AI_REQUEST_CHOICE_COUNT`, `GEN_AI_REQUEST_SEED`
   - `GEN_AI_REQUEST_FREQUENCY_PENALTY`, `GEN_AI_REQUEST_PRESENCE_PENALTY`
   - `GEN_AI_REQUEST_STOP_SEQUENCES`, `GEN_AI_REQUEST_TOP_K`
   - `GEN_AI_OUTPUT_TYPE`
   - `GEN_AI_AGENT_ID`
   - `GEN_AI_TOOL_CALL_ARGUMENTS`, `GEN_AI_TOOL_CALL_RESULT`
   - `SERVER_ADDRESS`, `SERVER_PORT`
   - `ERROR_TYPE`
5. **Wire provider detection**: Infer `gen_ai.provider.name` from model string or explicit config (e.g., `gpt-*` → `openai`, `claude-*` → `anthropic`).

### Phase 2: Content attributes

1. Add opt-in structured attrs:
   - `GEN_AI_SYSTEM_INSTRUCTIONS`, `GEN_AI_INPUT_MESSAGES`, `GEN_AI_OUTPUT_MESSAGES`, `GEN_AI_TOOL_DEFINITIONS`
2. Migrate `adk.llm.request/response` to spec names when content capture is enabled.
3. Keep legacy event names for one release cycle, then remove.

### Phase 3: Metrics

1. Add spec metrics alongside existing `adk.*` metrics:
   - `gen_ai.client.operation.duration` (Histogram, seconds)
   - `gen_ai.client.token.usage` (Histogram, tokens, with `gen_ai.token.type` attr)
2. Wire histogram recording in `traceLlmCall` and agent/tool wrappers.

### Phase 4: Provider-specific & advanced

1. Detect provider and conditionally emit provider-specific attrs.
2. Add embeddings support (`gen_ai.embeddings.dimension.count`, etc.) when needed.
3. Add evaluation event support (`gen_ai.evaluation.result`) for evals/guardrails.

---

## Safety & best practices

| Concern         | Guidance                                                                              |
| --------------- | ------------------------------------------------------------------------------------- |
| PII / content   | Keep `ADK_CAPTURE_MESSAGE_CONTENT` off by default. Document opt-in.                   |
| Payload size    | Truncate/redact large messages; prefer events over span attrs for big payloads.       |
| Cardinality     | Avoid high-cardinality attrs on metrics (e.g., don't include full prompt).            |
| Backward compat | Deprecate old attrs for one release; emit both old + new during transition if needed. |

---

## Quick reference (spec links)

- [GenAI spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/)
- [GenAI agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/)
- [GenAI events](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/)
- [GenAI metrics](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/)
- [OpenAI](https://opentelemetry.io/docs/specs/semconv/gen-ai/openai/)
- [Azure AI Inference](https://opentelemetry.io/docs/specs/semconv/gen-ai/azure-ai-inference/)
- [AWS Bedrock](https://opentelemetry.io/docs/specs/semconv/gen-ai/aws-bedrock/)

---

## Checklist for PR

- [ ] Update `SEMCONV` in constants.ts (add new, deprecate old)
- [ ] Update `OPERATIONS` with canonical names
- [ ] Update `traceLlmCall` to set `gen_ai.provider.name`, `gen_ai.response.id/model`, etc.
- [ ] Update `traceToolCall` to use `gen_ai.tool.call.arguments/result`
- [ ] Update `traceAgentInvocation` to set `gen_ai.agent.id`
- [ ] Add spec metrics (Phase 3)
- [ ] Update docs / CHANGELOG
