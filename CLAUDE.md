# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADK-TS is the Agent Development Kit for TypeScript - a comprehensive framework for building sophisticated AI agents with multi-LLM support, advanced tools, and flexible conversation flows. This is a monorepo containing the core framework package, documentation site, examples, and CLI tools.

## Development Commands

### Core Commands
- `pnpm install` - Install all dependencies across the monorepo
- `pnpm build` - Build all packages using Turbo (with 50 concurrency)
- `pnpm dev` - Start development mode for all apps
- `pnpm test` - Run tests (use `pnpm test --filter=adk` for core package only)
- `pnpm format` - Format code using Biome
- `pnpm lint` - Run linting using lint-staged

### Package-Specific Commands
- `pnpm build:docs` - Build documentation site only
- `pnpm start:docs` - Start docs site in production mode
- Core package tests: `cd packages/adk && pnpm test` or `pnpm test:watch` for watch mode
- Single test: `cd packages/adk && pnpm test -- <test-pattern>`

### Cleanup Commands
- `pnpm clean` - Clean all build outputs via Turbo
- `pnpm clean-modules` - Remove all node_modules directories
- `pnpm clean-dist` - Remove all dist directories

## Architecture

### Monorepo Structure
- `packages/adk/` - Core ADK framework package (`@iqai/adk`)
// ...existing code...
- `packages/tsconfig/` - Shared TypeScript configurations
- `apps/docs/` - Documentation website (Next.js + Fumadocs)
- `apps/examples/` - Comprehensive example implementations
- `packages/adk-cli/` - Official CLI for creating and managing ADK projects.

### Core Framework Components

The main framework in `packages/adk/src/` is organized into:

**Agents** (`src/agents/`)
- `AgentBuilder` - Fluent API for creating agents with different types
- `LlmAgent` - Single LLM-based agent  
- `LoopAgent` - Agent that can iterate and plan
- `ParallelAgent` - Execute multiple agents concurrently
- `SequentialAgent` - Execute agents in sequence
- `LangGraphAgent` - Graph-based workflow agent

**Models** (`src/models/`)
- Multi-provider LLM support: OpenAI, Anthropic, Google (Gemini/Vertex), AI SDK
- `LlmRegistry` - Central registry for all LLM providers
- Automatic provider registration via `registry.ts`

**Tools** (`src/tools/`)
- `BaseTool` - Abstract base for all tools
- Built-in tools: file ops, HTTP requests, user interaction, memory loading
- MCP (Model Context Protocol) integration for external tools
- Function tools with automatic schema generation

**Memory & Sessions** (`src/memory/`, `src/sessions/`)
- Pluggable memory services (in-memory, Vertex AI RAG)
- Session management with database persistence options
- State management across conversations

**Code Execution** (`src/code-executors/`)
- Multiple execution environments: local unsafe, container-based, Vertex AI
- Built-in code execution with sandboxing options

**Flows** (`src/flows/`)
- LLM-based processing flows for complex multi-step operations
- Auto-flows, planning flows, content processing

## Key Patterns

### Agent Creation
```typescript
// Simple usage
const response = await AgentBuilder
  .withModel("gpt-4")
  .ask("Question");

// Complex usage
const agent = new AgentBuilder()
  .withName("MyAgent")
  .withModel("gemini-2.5-flash")
  .withTools([tool1, tool2])
  .withInstruction("You are a helpful assistant")
  .buildLlm();
```

### Tool Development
- Extend `BaseTool` class
- Implement `execute()` method
- Use Zod schemas for input validation
- Tools receive `ToolContext` with session, memory, artifacts

### Session Management
- Use `SessionConfig` for persistent sessions
- Memory services store conversation history and context
- Artifact services handle file/data storage

## Testing

- Uses Vitest for testing
- Test files follow `*.test.ts` pattern
- Coverage via `pnpm test:coverage` in adk package
- Tests located in `packages/adk/tests/` and `packages/adk/src/tests/`

## Code Style

- Uses Biome for formatting and linting
- Tab indentation, double quotes
- No explicit any allowed (except in tests)
- Pre-commit hooks via Husky enforce formatting

## Environment Requirements

- Node.js >=22.0
- pnpm 9.0.0 (specified as packageManager)
- Uses Turbo for monorepo orchestration

## Examples Location

Comprehensive examples in `apps/examples/src/` demonstrate:
- Simple agents, tool usage, memory integration
- MCP server integration, multi-agent systems
- Database sessions, artifact handling
- All major framework features

Run examples with: `cd apps/examples && pnpm dev`