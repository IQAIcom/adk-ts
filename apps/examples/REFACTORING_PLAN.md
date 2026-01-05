# ADK Examples Restructure Proposal

## Executive Summary

This document proposes consolidating the current **17 examples** into **8 streamlined examples** that reduce redundancy, group related concepts, and ensure CLI compatibility with the ADK discovery system.

---

## Current State Analysis

### Current Examples (17 total)

| # | Example | Primary Concepts | Overlap Issues |
|---|---------|-----------------|----------------|
| 01 | simple-agent | AgentBuilder, structured output | Basic, standalone |
| 02 | tools-and-state | Custom tools, state management, sessions | Overlaps with 03, 05 |
| 03 | interactive-app | CLI todo app, tools, state | Largely duplicates 02's tool/state concepts |
| 04 | agent-composition | Multi-agent, output keys, shared memory | Unique, keep |
| 05 | persistence-sessions | Database sessions, artifacts | Session concepts overlap with 02, 03 |
| 06 | flows-and-planning | Planners (BuiltIn, PlanReAct) | Unique, keep |
| 07 | code-execution | BuiltInCodeExecutor | Unique, keep |
| 08 | external-integrations | HTTP, files, AI SDK | File ops overlap with 06 |
| 09 | observability | Langfuse telemetry | Similar to 17 (plugins) |
| 10 | advanced-workflows | LangGraph, state machines | Overlaps with 04 (multi-agent) |
| 11 | mcp-integrations | MCP servers, sampling | Unique, keep |
| 12 | event-compaction | LlmEventSummarizer | Unique, keep |
| 13 | chat-bots | Discord, Telegram | Specialized, can be starter template |
| 14 | callbacks | Guardrails, beforeModel/beforeTool | Unique, keep |
| 15 | evaluation | AgentEvaluator | Unique, keep |
| 16 | rewind-session | Session rewind | Can merge with 05 (sessions) |
| 17 | plugins | LangfusePlugin, tools | Overlaps with 09 and 02 |

### Identified Redundancies

1. **Tools & State** (02, 03, 17): All demonstrate `createTool` and state management
2. **Sessions & Persistence** (02, 03, 05, 16): Session management repeated across examples
3. **Multi-Agent Patterns** (04, 10): Both cover agent coordination
4. **Observability** (09, 17): Both show Langfuse integration
5. **External Integrations** (06, 08): FileOperationsTool shown in multiple places

---

## Proposed New Structure (8 Examples)

### Design Principles

1. **CLI Compatibility**: Each example has an `agent.ts` file with proper exports
2. **Progressive Learning**: Examples build upon each other logically
3. **Minimal Redundancy**: Each concept taught once
4. **Comprehensive Coverage**: All ADK features demonstrated
5. **Runnable Independence**: Each example works standalone

### New Folder Structure

```
src/
├── 01-getting-started/
│   ├── agent.ts                 # CLI-compatible export
│   ├── index.ts                 # Runnable demo
│   └── README.md
├── 02-tools-and-state/
│   ├── agent.ts
│   ├── index.ts
│   └── README.md
├── 03-multi-agent-systems/
│   ├── agent.ts
│   ├── index.ts
│   └── README.md
├── 04-persistence-and-sessions/
│   ├── agent.ts
│   ├── index.ts
│   └── README.md
├── 05-planning-and-code-execution/
│   ├── agent.ts
│   ├── index.ts
│   └── README.md
├── 06-mcp-and-integrations/
│   ├── agent.ts
│   ├── greeting-server.ts
│   ├── index.ts
│   └── README.md
├── 07-guardrails-and-evaluation/
│   ├── agent.ts
│   ├── index.ts
│   ├── test_cases.json
│   └── README.md
├── 08-observability-and-plugins/
│   ├── agent.ts
│   ├── index.ts
│   └── README.md
└── utils.ts
```

---

## Detailed Example Specifications

### 01 - Getting Started

**Consolidates**: 01-simple-agent

**Concepts Covered**:
- AgentBuilder basics (`create()`, `withModel()`)
- System instructions (`withInstruction()`)
- Structured output with Zod schemas (`withOutputSchema()`)
- Simple conversation patterns
- CLI-compatible agent export patterns

**agent.ts** (CLI-compatible):
```typescript
import { LlmAgent } from "@iqai/adk";

export default new LlmAgent({
  name: "getting_started_agent",
  model: "gemini-2.5-flash",
  instruction: "You are a helpful assistant that answers questions concisely.",
});
```

---

### 02 - Tools and State

**Consolidates**: 02-tools-and-state, 03-interactive-app (tool patterns only)

**Concepts Covered**:
- Creating custom tools with `createTool()`
- Tool schemas with Zod validation
- State management (`context.state.get/set`)
- State injection in instructions (`{stateName}` syntax)
- InMemorySessionService basics

**Why Consolidated**:
- 03-interactive-app was mostly a larger version of 02 with CLI interaction
- Interactive CLI patterns are not core ADK concepts
- Focus on tool creation and state fundamentals

---

### 03 - Multi-Agent Systems

**Consolidates**: 04-agent-composition, 10-advanced-workflows

**Concepts Covered**:
- Sub-agents with `withSubAgents()`
- Output keys for data passing between agents (`outputKey`)
- Shared memory between agents (`InMemoryMemoryService`)
- LangGraph-style state machines (`asLangGraph()`)
- Workflow state management patterns
- Agent delegation and coordination

**Why Consolidated**:
- Both examples demonstrate multi-agent coordination
- Advanced workflows are an extension of composition patterns
- LangGraph patterns naturally follow sub-agent concepts

---

### 04 - Persistence and Sessions

**Consolidates**: 05-persistence-and-sessions, 16-rewind-session, 12-event-compaction

**Concepts Covered**:
- Database session services (`createDatabaseSessionService()`)
- Session configuration (userId, appName, sessionId)
- Artifact services (`InMemoryArtifactService`, `LoadArtifactsTool`)
- Session rewind (`runner.rewind()`)
- Event compaction (`withEventsCompaction()`)
- Custom summarizers (`LlmEventSummarizer`)
- Cross-session data retrieval

**Why Consolidated**:
- All deal with conversation/session persistence
- Event compaction is a session management optimization
- Rewind is a session manipulation feature
- Natural progression: store → compact → rewind

---

### 05 - Planning and Code Execution

**Consolidates**: 06-flows-and-planning, 07-code-execution

**Concepts Covered**:
- Built-in planner (`BuiltInPlanner`)
- PlanReAct planner (`PlanReActPlanner`)
- Thinking configuration (`thinkingConfig`)
- Code execution (`BuiltInCodeExecutor`)
- Comparing planning approaches
- Mathematical problem solving with code

**Why Consolidated**:
- Planning naturally leads to code execution for complex tasks
- Both enhance agent reasoning capabilities
- PlanReAct + CodeExecutor is a powerful combination
- Reduces context switching between examples

---

### 06 - MCP and Integrations

**Consolidates**: 08-external-integrations, 11-mcp-integrations

**Concepts Covered**:
- MCP toolset creation (`McpToolset`)
- Sampling handlers (`createSamplingHandler`)
- Custom MCP servers
- HTTP requests (`HttpRequestTool`)
- File operations (`FileOperationsTool`)
- AI SDK integration (Google, OpenAI, etc.)
- Combining multiple integration types

**Why Consolidated**:
- MCP is an integration protocol
- HTTP and file tools are forms of external integration
- Shows how MCP and native tools work together
- More realistic multi-integration scenario

**Note**: 13-chat-bots (Discord/Telegram) should become a **starter template** instead of an example, as it's more of a deployment pattern than a learning example.

---

### 07 - Guardrails and Evaluation

**Consolidates**: 14-callbacks, 15-evaluation

**Concepts Covered**:
- `beforeModelCallback` for input validation
- `beforeToolCallback` for tool argument inspection
- Blocking/allowing requests based on content
- `AgentEvaluator` for testing agents
- Creating test datasets (JSON format)
- Quality assessment patterns
- Safety patterns and content filtering

**Why Consolidated**:
- Both are about agent quality and safety
- Callbacks implement safety; evaluation tests safety
- Natural workflow: implement guardrails → test them
- Reduces conceptual fragmentation

---

### 08 - Observability and Plugins

**Consolidates**: 09-observability, 17-plugins

**Concepts Covered**:
- Telemetry service initialization
- Langfuse integration (both telemetryService and LangfusePlugin)
- Plugin system (`withPlugins()`)
- OTLP endpoints configuration
- Trace viewing and debugging
- Metrics collection
- Custom plugin patterns

**Why Consolidated**:
- LangfusePlugin is a plugin-based observability solution
- telemetryService is the lower-level API
- Both achieve similar goals (observability)
- Shows when to use each approach

---

## CLI Compatibility Guide

Each example's `agent.ts` must follow ADK CLI discovery patterns:

### Pattern 1: Default Export (Recommended for Simple Agents)
```typescript
import { LlmAgent } from "@iqai/adk";

export default new LlmAgent({
  name: "example_agent",
  model: "gemini-2.5-flash",
  instruction: "Your instructions here",
});
```

### Pattern 2: Named Async Function (Recommended for Complex Agents)
```typescript
import { AgentBuilder } from "@iqai/adk";

export async function agent() {
  return await AgentBuilder.create("example_agent")
    .withModel("gemini-2.5-flash")
    .withInstruction("Your instructions here")
    .withTools(/* tools that need initialization */)
    .build();
}
```

### Pattern 3: Named Export
```typescript
import { LlmAgent } from "@iqai/adk";

export const agent = new LlmAgent({
  name: "example_agent",
  model: "gemini-2.5-flash",
  instruction: "Your instructions here",
});
```

---

## Migration Plan

### What Happens to Removed Examples

| Old Example | Destination |
|-------------|-------------|
| 03-interactive-app | Tool patterns → 02, CLI patterns → remove (not core ADK) |
| 13-chat-bots | Move to `starter-templates/discord-telegram-bot/` |

### Starter Templates Addition

The `13-chat-bots` example should become a starter template:

```
starter-templates/
├── discord-bot/          # Already exists
├── telegram-bot/         # Already exists
└── multi-platform-bot/   # NEW: Combines Discord + Telegram
    ├── agent.ts
    ├── package.json
    └── README.md
```

---

## Learning Path Comparison

### Before (17 Examples)
```
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17
```
- Many examples feel repetitive
- Concepts scattered across examples
- Hard to find specific features

### After (8 Examples)
```
01-basics → 02-tools → 03-multi-agent → 04-sessions → 05-planning → 06-mcp → 07-safety → 08-observability
```
- Clear progression
- Each example teaches distinct concepts
- Easy to navigate by topic

---

## Concept Coverage Matrix

| Concept | Old Examples | New Example |
|---------|-------------|-------------|
| AgentBuilder | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11 | 01 (primary), all (usage) |
| createTool | 02, 03, 04, 05, 08, 09, 10, 14, 17 | 02 (primary) |
| State Management | 02, 03, 05, 10, 14, 17 | 02 (primary), 04 (persistence) |
| Sub-agents | 04, 10 | 03 |
| Output Keys | 04 | 03 |
| Shared Memory | 04 | 03 |
| LangGraph | 10 | 03 |
| Database Sessions | 05, 13 | 04 |
| Artifacts | 05 | 04 |
| Session Rewind | 16 | 04 |
| Event Compaction | 12 | 04 |
| Planners | 06 | 05 |
| Code Execution | 07 | 05 |
| MCP Toolset | 11 | 06 |
| Sampling | 11, 13 | 06 |
| HTTP/File Tools | 06, 08 | 06 |
| Callbacks/Guardrails | 14 | 07 |
| Evaluation | 15 | 07 |
| Telemetry | 09 | 08 |
| Plugins | 17 | 08 |

---

## Benefits Summary

1. **53% Reduction**: From 17 to 8 examples
2. **Clearer Learning Path**: Logical progression of concepts
3. **CLI Compatible**: Every example works with `adk run` and `adk serve`
4. **No Concept Loss**: All features still demonstrated
5. **Reduced Maintenance**: Fewer files to update when API changes
6. **Better Discovery**: Easier to find what you're looking for
7. **Focused Examples**: Each example has a clear purpose

---

## Next Steps

1. [ ] Review and approve this proposal
2. [ ] Create new folder structure
3. [ ] Implement `agent.ts` files for each example
4. [ ] Migrate and consolidate code from old examples
5. [ ] Write README.md for each new example
6. [ ] Update root examples README.md
7. [ ] Create multi-platform-bot starter template
8. [ ] Test all examples with `adk run` and `adk serve`
9. [ ] Remove old example folders
10. [ ] Update documentation references
