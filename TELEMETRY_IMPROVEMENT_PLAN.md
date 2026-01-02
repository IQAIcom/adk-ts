# Telemetry Improvement Plan: ADK-TS

**Date:** January 2, 2026  
**Current Version:** 0.2.1  
**Target Version:** 0.3.0

---

## Executive Summary

This document outlines a comprehensive plan to enhance the ADK-TS telemetry system with better span coverage, improved semantic conventions, and richer observability across all framework operations. The goal is to provide **full visibility** into agent execution, tool invocations, model calls, agent transfers, and internal workflows.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [User Personas & Use Cases](#user-personas--use-cases)
3. [Identified Gaps](#identified-gaps)
4. [Improvement Areas](#improvement-areas)
5. [Phase 1: Core Span Enhancements](#phase-1-core-span-enhancements)
6. [Phase 2: Agent Transfer & Orchestration](#phase-2-agent-transfer--orchestration)
7. [Phase 3: Advanced Observability](#phase-3-advanced-observability)
8. [Phase 4: Performance & UX](#phase-4-performance--ux)
9. [New Semantic Conventions](#new-semantic-conventions)
10. [Implementation Priorities](#implementation-priorities)
11. [Testing Strategy](#testing-strategy)

---

## User Personas & Use Cases

To build truly useful telemetry, we must understand **who** uses ADK-TS and **how** they deploy it.

### Persona 1: Application Developer 👨‍💻

**Goal:** Build and debug agents quickly

**Deployment Types:**
- Simple chatbot (single agent)
- Multi-agent workflows
- Tool-heavy agents (MCP, APIs)

**What They Need from Traces:**
| Need | How Telemetry Helps |
|------|---------------------|
| "Why did my agent give wrong answer?" | See exact LLM prompts, tool results, and decision flow |
| "Which tool failed?" | Tool spans with error details and stack traces |
| "Why is it slow?" | Duration breakdown per operation |
| "What did the model see?" | Full context/prompt capture (dev mode) |

**Trace Query Examples:**
```
# Find all failed tool executions
adk.tool.status = "error"

# Find slow LLM calls
adk.llm.duration_ms > 5000

# Trace a specific session
adk.session.id = "sess_abc123"
```

**Key Requirements:**
- ✅ Detailed spans in development
- ✅ Full request/response capture (toggleable)
- ✅ Clear error messages with context
- ✅ Local development support (console exporter)

---

### Persona 2: DevOps / SRE 🔧

**Goal:** Monitor production health, set up alerts

**Deployment Types:**
- Containerized services (Docker, K8s)
- Serverless (Cloud Run, Lambda)
- Edge deployments

**What They Need from Traces:**
| Need | How Telemetry Helps |
|------|---------------------|
| "Is the system healthy?" | Metrics dashboards (invocations, errors, latency) |
| "Alert on failures" | Error rate spans, status codes |
| "Capacity planning" | Token usage, request volume |
| "Identify bottlenecks" | P95/P99 latency per operation |

**Trace Query Examples:**
```
# Error rate by agent
GROUP BY adk.agent.name WHERE status = "error"

# P99 latency by operation
PERCENTILE(duration, 99) GROUP BY gen_ai.operation.name

# Token usage trend
SUM(gen_ai.usage.total_tokens) BY hour
```

**Key Requirements:**
- ✅ Low-cardinality attributes for aggregation
- ✅ Consistent status codes
- ✅ Sampling support for high-volume
- ✅ RED metrics (Rate, Errors, Duration)
- ✅ Resource detection (k8s, cloud provider)

---

### Persona 3: Product Manager / Business Analyst 📊

**Goal:** Understand usage patterns, measure costs

**What They Need from Traces:**
| Need | How Telemetry Helps |
|------|---------------------|
| "Which agents are used most?" | Agent invocation counts |
| "What's our LLM spend?" | Token usage by model/agent |
| "User journey analysis" | Session-level traces |
| "Feature adoption" | Tool usage statistics |

**Trace Query Examples:**
```
# Most used agents
COUNT(*) GROUP BY adk.agent.name

# Token cost by model
SUM(gen_ai.usage.total_tokens) GROUP BY gen_ai.request.model

# Average tools per session
AVG(tool_count) GROUP BY adk.session.id
```

**Key Requirements:**
- ✅ Business-friendly attribute names
- ✅ Session/user-level grouping
- ✅ Cost attribution (tokens → dollars)
- ✅ Export to analytics tools (BigQuery, etc.)

---

### Persona 4: Security / Compliance Officer 🔒

**Goal:** Audit trails, data protection

**What They Need from Traces:**
| Need | How Telemetry Helps |
|------|---------------------|
| "Who accessed what?" | User ID, session ID on all spans |
| "What data was sent to LLM?" | Content capture (with redaction) |
| "Audit trail" | Immutable trace records |
| "PII protection" | Content filtering options |

**Key Requirements:**
- ✅ `ADK_CAPTURE_MESSAGE_CONTENT=false` for production
- ✅ User ID propagation on all spans
- ✅ Timestamp precision
- ✅ No PII in default attributes
- ✅ Configurable content redaction

**New Attributes for Compliance:**
```typescript
{
  "adk.privacy.content_captured": false,
  "adk.privacy.redaction_applied": true,
  "adk.audit.user_id": "user_123",
  "adk.audit.timestamp_iso": "2026-01-02T10:30:00Z",
}
```

---

### Persona 5: ML Engineer / Data Scientist 🧪

**Goal:** Optimize model performance, A/B testing

**What They Need from Traces:**
| Need | How Telemetry Helps |
|------|---------------------|
| "Which model performs better?" | Compare latency/quality by model |
| "Prompt optimization" | See which prompts get better results |
| "Tool success rates" | Tool-level metrics |
| "Response quality" | Finish reasons, token efficiency |

**Trace Query Examples:**
```
# Compare models
AVG(duration) GROUP BY gen_ai.request.model

# Token efficiency
AVG(gen_ai.usage.output_tokens / gen_ai.usage.input_tokens)

# Tool success rate
COUNT(status="success") / COUNT(*) GROUP BY adk.tool.name
```

**Key Requirements:**
- ✅ Model name on all LLM spans
- ✅ Detailed token breakdown (input/output/cached)
- ✅ Finish reason tracking
- ✅ A/B test variant attribute support

---

### Persona 6: Customer Support 🎧

**Goal:** Debug user-reported issues

**What They Need from Traces:**
| Need | How Telemetry Helps |
|------|---------------------|
| "What happened in this conversation?" | Session-level trace view |
| "Why did user get error?" | Error spans with context |
| "Reproduce the issue" | Full trace with inputs |

**Trace Query Examples:**
```
# Find user's recent sessions
adk.user.id = "user_456" ORDER BY timestamp DESC

# Find errors for session
adk.session.id = "sess_abc" AND status = "error"
```

**Key Requirements:**
- ✅ Searchable by user ID
- ✅ Searchable by session ID
- ✅ Human-readable error messages
- ✅ Conversation context visibility

---

## Use Case: Deployment Scenarios

### Scenario 1: Simple Chatbot (Single Agent)

```
User → Agent → LLM → Response
```

**Trace Structure:**
```
invocation [simple, clean]
└── agent_run [chatbot]
    ├── llm_generate [gpt-4]
    └── (optional) execute_tool [search]
```

**Priority Attributes:**
- Session ID, User ID
- LLM model, tokens, latency
- Response quality (finish reason)

---

### Scenario 2: Multi-Agent Orchestration

```
User → Coordinator → Weather Agent → Booking Agent → Confirmation
```

**Trace Structure (Flat with Links):**
```
invocation
├── agent_run [coordinator]
├── agent_run [weather_agent]    ← LINK
├── agent_run [booking_agent]    ← LINK
└── agent_run [confirmation]     ← LINK

All with: adk.transfer.chain attribute
```

**Priority Attributes:**
- Transfer chain for full path
- Per-agent timing
- Handoff success/failure

---

### Scenario 3: MCP Server Integration

```
User → Agent → MCP Tool → External Service → Response
```

**Trace Structure:**
```
invocation
└── agent_run [mcp_agent]
    ├── llm_generate
    └── execute_tool [mcp_tool]
        ├── mcp_request [external_server]
        └── mcp_response
```

**New Attributes Needed:**
```typescript
{
  "adk.mcp.server_name": "github-mcp",
  "adk.mcp.tool_name": "search_repos",
  "adk.mcp.transport": "stdio",
  "adk.mcp.latency_ms": 234,
}
```

---

### Scenario 4: Discord/Telegram Bot

```
Platform → Webhook → Runner → Agent → Response → Platform
```

**Trace Structure:**
```
http_request [webhook_handler]              ← Auto-instrumented
└── invocation
    └── agent_run [bot_agent]
        ├── llm_generate
        └── execute_tool [send_message]
```

**Priority Attributes:**
- Platform (discord/telegram)
- Channel/Chat ID
- Message type (command, mention, DM)

**New Attributes:**
```typescript
{
  "adk.platform": "discord",
  "adk.platform.channel_id": "123456",
  "adk.platform.message_type": "slash_command",
}
```

---

### Scenario 5: API Backend (Hono/Next.js)

```
HTTP Request → API Route → Runner → Agent → Response
```

**Trace Structure:**
```
http_request [POST /api/chat]               ← Auto-instrumented
└── invocation
    └── agent_run [api_agent]
        ├── llm_generate
        └── execute_tool [database_query]
```

**Priority Attributes:**
- HTTP method, path, status code
- Request/Response correlation
- API version

---

### Scenario 6: Batch Processing / Cron Jobs

```
Scheduler → Batch Runner → Agent (loop) → Results
```

**Trace Structure:**
```
batch_job [nightly_report]
├── invocation [item_1]
│   └── agent_run [report_agent]
├── invocation [item_2]
│   └── agent_run [report_agent]
└── invocation [item_N]
    └── agent_run [report_agent]
```

**New Attributes:**
```typescript
{
  "adk.batch.job_id": "job_123",
  "adk.batch.item_index": 5,
  "adk.batch.total_items": 100,
  "adk.batch.trigger": "cron",
}
```

---

### Scenario 7: Streaming Responses

```
User → Agent → LLM (streaming) → Chunked Response
```

**Trace Structure:**
```
invocation
└── agent_run [streaming_agent]
    └── llm_generate [streaming=true]
        ├── event: first_token (t=245ms)
        ├── event: chunk (tokens=50)
        ├── event: chunk (tokens=100)
        └── event: stream_complete (total=200 tokens)
```

**Priority Attributes:**
- Time to first token (TTFT)
- Chunk count
- Total stream duration
- Tokens per second

---

## Trace Attribute Tiers

To balance detail vs. overhead, we propose three tiers:

### Tier 1: Always Present (Core)
```typescript
// On EVERY span
{
  "adk.session.id": "...",
  "adk.invocation.id": "...",
  "gen_ai.system": "iqai-adk",
}
```

### Tier 2: Operation-Specific (Standard)
```typescript
// On agent spans
{ "adk.agent.name": "...", "adk.agent.type": "LlmAgent" }

// On tool spans  
{ "adk.tool.name": "...", "adk.tool.status": "success" }

// On LLM spans
{ "gen_ai.request.model": "...", "gen_ai.usage.total_tokens": 500 }
```

### Tier 3: Debug/Development (Verbose)
```typescript
// Only when ADK_CAPTURE_MESSAGE_CONTENT=true
{
  "adk.llm.request": "{...full JSON...}",
  "adk.llm.response": "{...full JSON...}",
  "adk.tool.args": "{...}",
  "adk.tool.response": "{...}",
}
```

---

## Sampling Strategies by Use Case

| Scenario | Recommended Sampling | Rationale |
|----------|---------------------|-----------|
| Development | 100% (no sampling) | Need full visibility |
| Production (low volume) | 100% | Affordable |
| Production (high volume) | 10-20% | Cost control |
| Production (errors only) | 100% errors, 5% success | Focus on issues |
| Batch jobs | 100% | Important for auditing |

**Implementation:**
```typescript
telemetryService.initialize({
  sampling: {
    default: 0.1,          // 10% of traces
    errorRate: 1.0,        // 100% of errors
    slowThresholdMs: 5000, // Always trace slow requests
    endpoints: {
      "/health": 0,        // Never trace health checks
    }
  }
});
```

---

## Current State Analysis

### ✅ What's Working Well

| Component | Status | Location |
|-----------|--------|----------|
| Agent Execution Spans | ✅ Implemented | `base-agent.ts` → `runAsync()` wraps with `traceAsyncGenerator` |
| Tool Execution Spans | ✅ Implemented | `functions.ts` → `tracer.startSpan()` per tool |
| LLM Generation Spans | ✅ Implemented | `base-llm.ts` → `startActiveSpan()` in `generateContentAsync` |
| Runner Invocation Spans | ✅ Implemented | `runners.ts` → `tracer.startSpan("invocation")` |
| Agent Invocation Attributes | ✅ Implemented | `TracingService.traceAgentInvocation()` |
| Tool Call Attributes | ✅ Implemented | `TracingService.traceToolCall()` |
| LLM Call Attributes | ✅ Implemented | `TracingService.traceLlmCall()` |
| Metrics (Counters/Histograms) | ✅ Implemented | `MetricsService` with agent/tool/LLM metrics |

### ⚠️ Current Limitations

1. **No Agent Transfer Tracing** - When agents delegate to sub-agents, there's no dedicated span
2. **No Callback Tracing** - `beforeAgentCallback`, `afterAgentCallback`, `beforeToolCallback`, `afterToolCallback`, `beforeModelCallback`, `afterModelCallback` have no spans
3. **No Flow/Processor Tracing** - LLM flow processors (`AutoFlow`, `SingleFlow`, `AgentTransfer`) lack spans
4. **No Memory/Session Service Tracing** - Memory retrieval and session operations are invisible
5. **No Plugin Lifecycle Tracing** - Plugin `onBeforeAgent`, `onAfterAgent`, etc. are not traced
6. **Missing Span Links** - No linking between parent-child agent spans for transfer visualization
7. **Incomplete Error Attribution** - Errors don't always propagate span status correctly
8. **No Streaming Spans** - Streaming LLM responses lack progressive span updates

---

## Identified Gaps

### Gap 1: Agent Transfer Visibility
```
Current: Agent A → (invisible) → Agent B
Desired: Agent A → transfer_to_agent span → Agent B (with parent link)
```

### Gap 2: Callback Visibility
```
Current: Agent Run (single span with everything inside)
Desired: 
  Agent Run
  ├── before_agent_callback
  ├── agent_execution
  ├── tool_execution (existing)
  └── after_agent_callback
```

### Gap 3: LLM Flow Visibility
```
Current: llm_generate span only
Desired:
  llm_agent_run
  ├── prepare_request (instruction building)
  ├── llm_generate
  │   ├── call_model
  │   └── process_response
  ├── execute_tools (if any)
  └── process_agent_transfer (if any)
```

### Gap 4: Multi-Agent Orchestration
```
Current: Flat spans, hard to visualize hierarchy
Desired: Hierarchical spans with proper parent-child relationships
```

---

## Improvement Areas

### Area 1: Tool Invocation Enhancements

**Current Implementation:**
- Single span `execute_tool ${tool.name}` in `functions.ts`
- Attributes set via `traceToolCall()`

**Proposed Improvements:**

| Improvement | Description | Priority |
|------------|-------------|----------|
| Tool Type Span Naming | `execute_tool [FunctionTool] ${name}` vs `execute_tool [McpTool] ${name}` | Medium |
| Input/Output Events | Add span events for tool input/output (not just attributes) | High |
| Tool Chain Tracking | Track tool execution order within a single LLM response | Medium |
| Retry Tracing | Trace tool retries with attempt number | Low |
| Async Tool Progress | For long-running tools, emit progress events | Low |

**New Attributes:**
```typescript
{
  "adk.tool.execution_order": 1,          // Position in tool chain
  "adk.tool.parallel_group": "abc123",    // Group ID for parallel tools
  "adk.tool.retry_count": 0,              // Number of retries
  "adk.tool.is_callback_override": false, // Was result from callback?
}
```

---

### Area 2: Model Invocation Enhancements

**Current Implementation:**
- Span in `base-llm.ts` with model attributes
- No distinction between streaming vs non-streaming

**Proposed Improvements:**

| Improvement | Description | Priority |
|------------|-------------|----------|
| Streaming Chunks | Emit span events per chunk for streaming | Medium |
| First Token Latency | Record time-to-first-token metric | High |
| Model Fallback Tracing | Trace when model fallback occurs | Medium |
| Request Preparation Span | Separate span for instruction/context building | Medium |
| Response Parsing Span | Separate span for response parsing/extraction | Low |

**New Attributes:**
```typescript
{
  "adk.llm.streaming": true,
  "adk.llm.time_to_first_token_ms": 245,
  "adk.llm.chunk_count": 15,
  "adk.llm.is_cached": false,
  "adk.llm.context_window_used_pct": 45.2,
}
```

**New Span Events:**
```typescript
span.addEvent("gen_ai.stream.chunk", {
  "chunk_index": 5,
  "cumulative_tokens": 120,
  "timestamp": Date.now()
});
```

---

### Area 3: Agent Transfer Tracing

**Current State:** No dedicated tracing for agent transfers

**⚠️ Key Design Decision: Flat Spans with Links (Not Nested)**

Deep nesting is problematic:
- Trace tools (Jaeger, Zipkin) become unreadable at 5+ levels
- Memory overhead grows with each nesting level
- Complex multi-agent workflows can have 10+ transfers

**Proposed Architecture: Flat Sibling Spans with Span Links**

```
invocation [session_abc]                    ← Root span
├── agent_run [coordinator]                 ← Sibling 1
├── agent_run [weather_agent]               ← Sibling 2 (LINK to coordinator)
├── agent_run [booking_agent]               ← Sibling 3 (LINK to weather_agent)
└── agent_run [confirmation_agent]          ← Sibling 4 (LINK to booking_agent)
```

Instead of:
```
invocation
└── agent_run [coordinator]
    └── agent_run [weather_agent]
        └── agent_run [booking_agent]
            └── agent_run [confirmation_agent]  ← 4 levels deep!
```

**Implementation Strategy:**

1. **All Agent Spans are Siblings Under Invocation**
   - Every `agent_run` span has `invocation` as parent
   - Keeps trace depth at exactly 2 levels for agent hierarchy

2. **Use Span Links for Transfer Relationships**
```typescript
// When creating target agent span
const targetSpan = tracer.startSpan(`agent_run [${targetAgent.name}]`, {
  links: [{
    context: sourceAgentSpan.spanContext(),
    attributes: {
      "adk.link.type": "transfer_from",
      "adk.transfer.source_agent": sourceAgent.name,
    }
  }]
});
```

3. **Transfer Tracking via Attributes (Not Nesting)**
```typescript
{
  "adk.transfer.chain": ["coordinator", "weather_agent", "booking_agent"],
  "adk.transfer.depth": 2,
  "adk.transfer.source_agent": "weather_agent",
  "adk.transfer.root_agent": "coordinator",
}
```

4. **Transfer Events on Both Sides**
```typescript
// On source agent span (before transfer)
sourceSpan.addEvent("agent_transfer_initiated", {
  "target_agent": "weather_agent",
  "trigger": "tool_call",
  "transfer_depth": 1,
});

// On target agent span (at start)
targetSpan.addEvent("agent_transfer_received", {
  "source_agent": "coordinator", 
  "transfer_chain": JSON.stringify(["coordinator"]),
});
```

**Visualization Benefits:**
- Trace tools show a flat list of agent runs
- Span links create visual arrows between related agents
- Transfer chain attribute shows the full path
- Easy to filter/search by any agent in the chain

**Context Propagation:**
```typescript
interface TransferContext {
  transferChain: string[];      // ["coordinator", "weather_agent"]
  transferDepth: number;        // 2
  rootAgentName: string;        // "coordinator"
  rootSpanContext: SpanContext; // For linking back to root
  previousSpanContext: SpanContext; // For linking to immediate predecessor
}
```

**Implementation Location:** 
- `invocation-context.ts` - Add `TransferContext` to track chain
- `agent-transfer.ts` - Update transfer context on each hop
- `transfer-to-agent-tool.ts` - Record transfer event, update chain
- `base-agent.ts` - Create flat span with links, read transfer context

---

### Area 4: Callback Tracing

**Callbacks to Trace:**

| Callback | Location | Proposed Span Name |
|----------|----------|-------------------|
| `beforeAgentCallback` | `base-agent.ts` | `callback [before_agent]` |
| `afterAgentCallback` | `base-agent.ts` | `callback [after_agent]` |
| `beforeModelCallback` | `llm-agent.ts` | `callback [before_model]` |
| `afterModelCallback` | `llm-agent.ts` | `callback [after_model]` |
| `beforeToolCallback` | `functions.ts` | `callback [before_tool] ${toolName}` |
| `afterToolCallback` | `functions.ts` | `callback [after_tool] ${toolName}` |

**Proposed Attributes:**
```typescript
{
  "adk.callback.type": "before_agent",
  "adk.callback.name": "customGuardrail",  // if named function
  "adk.callback.index": 0,                  // position in callback array
  "adk.callback.result": "continue" | "override" | "error",
  "adk.callback.override_returned": false,
}
```

---

### Area 5: Flow & Processor Tracing

**LLM Flows to Trace:**

| Flow/Processor | Description | Proposed Span |
|---------------|-------------|---------------|
| `AutoFlow` | Automatic tool/agent orchestration | `llm_flow [auto]` |
| `SingleFlow` | Single LLM call | `llm_flow [single]` |
| `AgentTransferLlmRequestProcessor` | Agent transfer setup | `processor [agent_transfer]` |
| `InstructionProcessor` | Instruction building | `processor [instructions]` |
| `ToolProcessor` | Tool declaration building | `processor [tools]` |

**Proposed Span Hierarchy:**
```
agent_run [weather_agent]
├── llm_flow [auto]
│   ├── processor [instructions]
│   ├── processor [tools]
│   ├── processor [agent_transfer]
│   ├── llm_generate [gemini-2.0-flash]
│   │   ├── prepare_request
│   │   └── call_model
│   ├── execute_tool [get_weather]
│   └── llm_generate [gemini-2.0-flash]  // follow-up
└── finalize_response
```

---

### Area 6: Memory & Session Service Tracing

**Operations to Trace:**

| Operation | Proposed Span | Attributes |
|-----------|--------------|------------|
| Session creation | `session [create]` | session_id, user_id |
| Session retrieval | `session [get]` | session_id, found |
| Memory search | `memory [search]` | query_length, results_count |
| Memory insert | `memory [insert]` | content_type, size |
| Artifact save | `artifact [save]` | artifact_type, size |
| Artifact load | `artifact [load]` | artifact_id, found |

---

### Area 7: Plugin Lifecycle Tracing

**Plugin Hooks to Trace:**

```typescript
// Before agent execution
span: `plugin [${plugin.name}] before_agent`

// After agent execution  
span: `plugin [${plugin.name}] after_agent`

// Before model call
span: `plugin [${plugin.name}] before_model`

// After model call
span: `plugin [${plugin.name}] after_model`

// On event
span: `plugin [${plugin.name}] on_event`
```

---

### Area 8: Error Propagation Enhancements

**Current Issues:**
- Some errors don't set span status correctly
- Error context is sometimes lost

**Proposed Improvements:**

1. **Consistent Error Recording:**
```typescript
try {
  // operation
} catch (error) {
  span.recordException(error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message
  });
  span.setAttributes({
    "error.type": error.constructor.name,
    "error.message": error.message,
    "error.stack": error.stack?.substring(0, 1000),
  });
  throw error;
}
```

2. **Error Categories:**
```typescript
{
  "adk.error.category": "tool_error" | "model_error" | "transfer_error" | "callback_error",
  "adk.error.recoverable": true,
  "adk.error.retry_recommended": false,
}
```

---

## Phase 1: Core Span Enhancements

**Timeline:** 1-2 weeks  
**Priority:** High

### Tasks

1. **Add Callback Tracing**
   - [ ] Wrap `beforeAgentCallback` execution in span
   - [ ] Wrap `afterAgentCallback` execution in span  
   - [ ] Wrap `beforeToolCallback` execution in span
   - [ ] Wrap `afterToolCallback` execution in span
   - [ ] Wrap `beforeModelCallback` execution in span
   - [ ] Wrap `afterModelCallback` execution in span

2. **Enhance Tool Spans**
   - [ ] Add execution order attribute
   - [ ] Add parallel group tracking
   - [ ] Add callback override indicator
   - [ ] Add input/output as span events (in addition to attributes)

3. **Enhance LLM Spans**
   - [ ] Add streaming indicator
   - [ ] Add time-to-first-token metric
   - [ ] Add chunk count for streaming
   - [ ] Add context window utilization

4. **Standardize Error Handling**
   - [ ] Create `traceError()` utility function
   - [ ] Apply consistent error recording across all spans
   - [ ] Add error categorization

---

## Phase 2: Agent Transfer & Orchestration

**Timeline:** 1-2 weeks  
**Priority:** High

### Tasks

1. **Agent Transfer Tracing (Flat Architecture)**
   - [ ] Add `TransferContext` interface to `invocation-context.ts`
   - [ ] Modify `base-agent.ts` to create sibling spans under invocation (not nested)
   - [ ] Add span links pointing to previous agent in transfer chain
   - [ ] Add `transfer_to_agent` span in tool execution
   - [ ] Add transfer events on source and target agent spans
   - [ ] Store transfer chain as attribute for queryability

2. **Transfer Context Propagation**
   - [ ] Pass `TransferContext` through `InvocationContext`
   - [ ] Update chain array on each transfer
   - [ ] Preserve root span context for direct linking

3. **Orchestration Agent Spans (Keep Flat)**
   - [ ] `SequentialAgent` - each sub-agent as sibling, linked in order
   - [ ] `ParallelAgent` - each sub-agent as sibling, same parent link
   - [ ] `LoopAgent` - each iteration's agent as sibling with iteration number

---

## Phase 3: Advanced Observability

**Timeline:** 2-3 weeks  
**Priority:** Medium

### Tasks

1. **Flow & Processor Tracing**
   - [ ] Add spans for `AutoFlow` and `SingleFlow`
   - [ ] Add spans for each LLM request processor
   - [ ] Create hierarchical span structure

2. **Memory & Session Tracing**
   - [ ] Add spans for session operations
   - [ ] Add spans for memory search/insert
   - [ ] Add spans for artifact operations

3. **Plugin Lifecycle Tracing**
   - [ ] Add spans for each plugin hook
   - [ ] Track plugin execution time
   - [ ] Record plugin success/failure

4. **Streaming Enhancements**
   - [ ] Emit progressive span events for streaming
   - [ ] Track token count per chunk
   - [ ] Calculate streaming throughput

---

## Phase 4: Performance & UX

**Timeline:** 1-2 weeks  
**Priority:** Medium

### Tasks

1. **Span Optimization**
   - [ ] Add sampling configuration
   - [ ] Implement span filtering for high-volume scenarios
   - [ ] Add batch processing for span events

2. **Developer Experience**
   - [ ] Create `@Traced` decorator for easy span creation
   - [ ] Add span context utilities
   - [ ] Improve debug logging integration

3. **Dashboard Templates**
   - [ ] Create Grafana dashboard template
   - [ ] Create Jaeger/Zipkin query examples
   - [ ] Document trace analysis patterns

---

## New Semantic Conventions

### Proposed New Constants

Add to `constants.ts`:

```typescript
export const OPERATIONS = {
  // Existing
  INVOKE_AGENT: "invoke_agent",
  EXECUTE_TOOL: "execute_tool",
  CALL_LLM: "call_llm",
  STREAM_LLM: "stream_llm",
  
  // New - Core
  TRANSFER_AGENT: "transfer_agent",
  EXECUTE_CALLBACK: "execute_callback",
  PROCESS_FLOW: "process_flow",
  
  // New - Services
  SEARCH_MEMORY: "search_memory",
  INSERT_MEMORY: "insert_memory",
  GET_SESSION: "get_session",
  SAVE_ARTIFACT: "save_artifact",
  LOAD_ARTIFACT: "load_artifact",
  EXECUTE_PLUGIN: "execute_plugin",
  
  // New - MCP
  MCP_REQUEST: "mcp_request",
  MCP_RESPONSE: "mcp_response",
} as const;

export const ADK_ATTRS = {
  // ============================================
  // TIER 1: Always Present (Core Identity)
  // ============================================
  SESSION_ID: "adk.session.id",
  INVOCATION_ID: "adk.invocation.id",
  USER_ID: "adk.user.id",
  ENVIRONMENT: "adk.environment",
  
  // ============================================
  // TIER 2: Operation-Specific (Standard)
  // ============================================
  
  // Agent attributes
  AGENT_NAME: "adk.agent.name",
  AGENT_DESCRIPTION: "adk.agent.description",
  AGENT_TYPE: "adk.agent.type",              // LlmAgent, SequentialAgent, etc.
  AGENT_DEPTH: "adk.agent.depth",            // 0 = root, 1 = first transfer, etc.
  AGENT_PARENT: "adk.agent.parent",          // Parent agent name
  
  // Transfer attributes (for multi-agent)
  TRANSFER_SOURCE_AGENT: "adk.transfer.source_agent",
  TRANSFER_TARGET_AGENT: "adk.transfer.target_agent",
  TRANSFER_CHAIN: "adk.transfer.chain",      // JSON array of agent names
  TRANSFER_DEPTH: "adk.transfer.depth",      // Number of hops
  TRANSFER_ROOT_AGENT: "adk.transfer.root_agent",
  TRANSFER_REASON: "adk.transfer.reason",
  
  // Tool attributes
  TOOL_NAME: "adk.tool.name",
  TOOL_TYPE: "adk.tool.type",                // FunctionTool, McpTool, etc.
  TOOL_STATUS: "adk.tool.status",            // success, error
  TOOL_EXECUTION_ORDER: "adk.tool.execution_order",
  TOOL_PARALLEL_GROUP: "adk.tool.parallel_group",
  TOOL_IS_CALLBACK_OVERRIDE: "adk.tool.is_callback_override",
  
  // LLM attributes
  LLM_MODEL: "adk.llm.model",
  LLM_STREAMING: "adk.llm.streaming",
  LLM_TIME_TO_FIRST_TOKEN: "adk.llm.time_to_first_token_ms",
  LLM_CHUNK_COUNT: "adk.llm.chunk_count",
  LLM_CACHED_TOKENS: "adk.llm.cached_tokens",
  
  // Callback attributes
  CALLBACK_TYPE: "adk.callback.type",        // before_agent, after_tool, etc.
  CALLBACK_NAME: "adk.callback.name",
  CALLBACK_INDEX: "adk.callback.index",
  CALLBACK_RESULT: "adk.callback.result",    // continue, override, error
  
  // Flow attributes
  FLOW_TYPE: "adk.flow.type",                // auto, single
  FLOW_ITERATION: "adk.flow.iteration",
  
  // ============================================
  // TIER 2: Platform-Specific
  // ============================================
  
  // Platform (Discord, Telegram, etc.)
  PLATFORM: "adk.platform",                  // discord, telegram, slack, web
  PLATFORM_CHANNEL_ID: "adk.platform.channel_id",
  PLATFORM_MESSAGE_TYPE: "adk.platform.message_type",
  PLATFORM_GUILD_ID: "adk.platform.guild_id",
  
  // MCP attributes
  MCP_SERVER_NAME: "adk.mcp.server_name",
  MCP_TOOL_NAME: "adk.mcp.tool_name",
  MCP_TRANSPORT: "adk.mcp.transport",        // stdio, http, websocket
  MCP_LATENCY_MS: "adk.mcp.latency_ms",
  
  // Batch processing
  BATCH_JOB_ID: "adk.batch.job_id",
  BATCH_ITEM_INDEX: "adk.batch.item_index",
  BATCH_TOTAL_ITEMS: "adk.batch.total_items",
  BATCH_TRIGGER: "adk.batch.trigger",        // cron, manual, webhook
  
  // ============================================
  // TIER 3: Debug/Verbose (Content Capture)
  // ============================================
  LLM_REQUEST: "adk.llm.request",
  LLM_RESPONSE: "adk.llm.response",
  TOOL_ARGS: "adk.tool.args",
  TOOL_RESPONSE: "adk.tool.response",
  EVENT_ID: "adk.event.id",
  
  // ============================================
  // Privacy & Compliance
  // ============================================
  PRIVACY_CONTENT_CAPTURED: "adk.privacy.content_captured",
  PRIVACY_REDACTION_APPLIED: "adk.privacy.redaction_applied",
  AUDIT_TIMESTAMP_ISO: "adk.audit.timestamp_iso",
  
  // ============================================
  // Error Categorization
  // ============================================
  ERROR_CATEGORY: "adk.error.category",      // tool_error, model_error, etc.
  ERROR_RECOVERABLE: "adk.error.recoverable",
  ERROR_RETRY_RECOMMENDED: "adk.error.retry_recommended",
  
  // ============================================
  // Memory & Session
  // ============================================
  MEMORY_QUERY: "adk.memory.query",
  MEMORY_RESULTS_COUNT: "adk.memory.results_count",
  
  // Plugin
  PLUGIN_NAME: "adk.plugin.name",
  PLUGIN_HOOK: "adk.plugin.hook",
} as const;

/**
 * Attribute tiers for documentation and filtering
 */
export const ATTRIBUTE_TIERS = {
  CORE: [
    ADK_ATTRS.SESSION_ID,
    ADK_ATTRS.INVOCATION_ID,
    ADK_ATTRS.USER_ID,
  ],
  STANDARD: [
    ADK_ATTRS.AGENT_NAME,
    ADK_ATTRS.TOOL_NAME,
    ADK_ATTRS.LLM_MODEL,
    // ... other tier 2 attrs
  ],
  VERBOSE: [
    ADK_ATTRS.LLM_REQUEST,
    ADK_ATTRS.LLM_RESPONSE,
    ADK_ATTRS.TOOL_ARGS,
    ADK_ATTRS.TOOL_RESPONSE,
  ],
} as const;
```

### Span Naming Conventions

Consistent naming for easy querying:

```typescript
// Pattern: operation [identifier]

// Agents
`agent_run [${agentName}]`           // e.g., agent_run [weather_agent]

// Tools  
`execute_tool [${toolName}]`         // e.g., execute_tool [get_weather]

// LLM
`llm_generate [${modelName}]`        // e.g., llm_generate [gemini-2.0-flash]
`llm_stream [${modelName}]`          // e.g., llm_stream [gpt-4]

// Callbacks
`callback [${type}]`                 // e.g., callback [before_agent]
`callback [${type}] ${target}`       // e.g., callback [before_tool] get_weather

// Transfers
`transfer_to_agent [${targetAgent}]` // e.g., transfer_to_agent [booking_agent]

// Flows
`llm_flow [${flowType}]`             // e.g., llm_flow [auto]

// MCP
`mcp_call [${serverName}/${tool}]`   // e.g., mcp_call [github/search_repos]

// Services
`session [${operation}]`             // e.g., session [get]
`memory [${operation}]`              // e.g., memory [search]
`artifact [${operation}]`            // e.g., artifact [save]

// Plugins
`plugin [${pluginName}] ${hook}`     // e.g., plugin [rate_limiter] before_model
```

---

## Implementation Priorities

### Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Agent Transfer Tracing | High | Medium | **P0** |
| Callback Tracing | High | Low | **P0** |
| Enhanced Tool Attributes | Medium | Low | **P1** |
| LLM Streaming Events | Medium | Medium | **P1** |
| Flow/Processor Tracing | Medium | Medium | **P1** |
| Memory Service Tracing | Medium | Low | **P2** |
| Plugin Lifecycle Tracing | Low | Low | **P2** |
| Span Optimization | Medium | High | **P3** |
| Dashboard Templates | Low | Medium | **P3** |

### Recommended Implementation Order

1. **Week 1:** Agent Transfer + Callback Tracing (P0)
2. **Week 2:** Enhanced Tool/LLM Attributes (P1)
3. **Week 3:** Flow/Processor Tracing (P1)
4. **Week 4:** Memory/Plugin Tracing + Testing (P2)

---

## Testing Strategy

### Unit Tests

- [ ] Test span creation for each new operation
- [ ] Test attribute values are correctly set
- [ ] Test error propagation and status codes
- [ ] Test span relationships (parent-child)

### Integration Tests

- [ ] End-to-end trace with multi-agent transfer
- [ ] Trace with all callbacks enabled
- [ ] Trace with tools, memory, and plugins

### Performance Tests

- [ ] Measure overhead of new spans
- [ ] Test with high-volume scenarios
- [ ] Validate sampling works correctly

### Manual Validation

- [ ] Verify traces render correctly in Jaeger
- [ ] Verify traces render correctly in Grafana
- [ ] Verify Google Cloud Trace compatibility

---

## Files to Modify

| File | Changes |
|------|---------|
| `telemetry/constants.ts` | Add new operations and attributes |
| `telemetry/tracing.ts` | Add new tracing methods |
| `telemetry/types.ts` | Add new type definitions |
| `agents/base-agent.ts` | Add callback tracing |
| `agents/llm-agent.ts` | Add model callback tracing |
| `flows/llm-flows/functions.ts` | Enhance tool tracing |
| `flows/llm-flows/agent-transfer.ts` | Add transfer tracing |
| `tools/common/transfer-to-agent-tool.ts` | Add span for transfer |
| `models/base-llm.ts` | Enhance LLM spans |
| `runners.ts` | Ensure proper context propagation |
| `memory/` | Add memory operation spans |
| `sessions/` | Add session operation spans |
| `plugins/` | Add plugin lifecycle spans |

---

## Success Criteria

### Technical Criteria

1. **Full Visibility:** Every significant operation has a corresponding span
2. **Clear Hierarchy:** Flat agent spans with links (max depth = 3)
3. **Agent Transfers:** Visible with source/target context and chain attribute
4. **Callbacks:** All 6 callback types individually traceable
5. **Error Context:** Full categorization and stack traces
6. **Performance:** < 5% overhead from telemetry in production
7. **Compatibility:** Works with OTLP, Jaeger, Zipkin, Google Cloud Trace

### Persona-Specific Criteria

| Persona | Success Metric |
|---------|---------------|
| **Developer** | Can debug any agent issue in < 5 minutes using traces |
| **DevOps/SRE** | Can set up alerting on error rate, latency, token usage |
| **Product/Business** | Can generate usage reports by agent, model, user |
| **Security/Compliance** | Can audit any session, toggle content capture |
| **ML Engineer** | Can compare model performance, optimize prompts |
| **Customer Support** | Can find any user's session and see full conversation flow |

### Use Case Criteria

| Scenario | Success Metric |
|----------|---------------|
| Single Agent | Clean trace with LLM + optional tools |
| Multi-Agent | Flat spans with visible transfer chain |
| MCP Integration | MCP calls visible with server/tool names |
| Discord/Telegram | Platform context (channel, message type) visible |
| API Backend | Correlates with HTTP spans from auto-instrumentation |
| Batch Jobs | Job ID and item index for each invocation |
| Streaming | TTFT metric and chunk events visible |

---

## Appendix: Span Hierarchy Example

After implementation, a typical trace should look like:

```
invocation [session_abc]                              ← Root span (depth 0)
│
├── agent_run [coordinator]                           ← depth 1
│   ├── callback [before_agent]                       ← depth 2
│   ├── llm_flow [auto]                               ← depth 2
│   │   ├── processor [instructions]
│   │   ├── processor [tools]
│   │   └── llm_generate [gemini-2.0-flash]
│   ├── execute_tool [get_available_agents]           ← depth 2
│   │   ├── callback [before_tool]
│   │   └── callback [after_tool]
│   ├── llm_generate [gemini-2.0-flash]
│   ├── execute_tool [transfer_to_agent]              ← Transfer happens here
│   │   └── event: agent_transfer_initiated
│   └── callback [after_agent]
│
├── agent_run [weather_agent]                         ← depth 1 (SIBLING, not child!)
│   │                                                   LINK → coordinator span
│   ├── event: agent_transfer_received
│   ├── callback [before_agent]
│   ├── llm_flow [single]
│   │   └── llm_generate [gemini-2.0-flash]
│   ├── execute_tool [get_weather]
│   ├── execute_tool [transfer_to_agent]              ← Another transfer
│   └── callback [after_agent]
│
└── agent_run [booking_agent]                         ← depth 1 (SIBLING)
    │                                                   LINK → weather_agent span
    ├── event: agent_transfer_received
    ├── llm_flow [single]
    │   └── llm_generate [gemini-2.0-flash]
    └── callback [after_agent]

Attributes on booking_agent span:
  adk.transfer.chain: ["coordinator", "weather_agent", "booking_agent"]
  adk.transfer.depth: 2
  adk.transfer.source_agent: "weather_agent"
  adk.transfer.root_agent: "coordinator"
```

**Key Properties of This Design:**

1. **Max Depth = 3** (invocation → agent_run → tool/callback/llm)
2. **Agent Transfers = Sibling Spans** with links, not nested children
3. **Transfer Chain = Attribute** showing full path, easily queryable
4. **Links Enable Visualization** - Tools like Jaeger show arrows between linked spans

---

## Appendix B: Span Link Visualization

How trace tools render span links:

```
┌─────────────────────────┐
│ invocation [session]    │
└───────────┬─────────────┘
            │
    ┌───────┼───────┬───────────────┐
    │       │       │               │
    ▼       ▼       ▼               ▼
┌───────┐ ┌───────┐ ┌───────┐   ┌───────┐
│coord- │ │weather│ │booking│   │confirm│
│inator │→│_agent │→│_agent │ → │_agent │
└───────┘ └───────┘ └───────┘   └───────┘
    │         ↑          ↑           ↑
    └─────────┘          │           │
         LINK        LINK from   LINK from
                     weather     booking
```

The arrows (→) represent span links, not parent-child relationships.

---

## Next Steps

1. Review and approve this plan
2. Create GitHub issues for each phase
3. Begin Phase 1 implementation
4. Set up trace visualization tooling for validation
