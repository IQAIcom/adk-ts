# ADK Pino Migration Execution Plan

## Overview
This document provides a detailed execution plan for migrating ADK's logging system from the custom Logger to Pino, including analysis of all current logger usage patterns and specific implementation strategies for each component.

## Current Logger Usage Analysis

### Files Using Logger (24 total instances)

#### Core Components
1. **`/flows/llm-flows/base-llm-flow.ts`** - 8 usage patterns
2. **`/agents/llm-agent.ts`** - 4 usage patterns  
3. **`/code-executors/container-code-executor.ts`** - 12 usage patterns
4. **`/runners.ts`** - 2 usage patterns
5. **`/models/ai-sdk.ts`** - 1 usage pattern

#### Flow Components
6. **`/flows/llm-flows/output-schema.ts`** - 2 usage patterns
7. **`/flows/llm-flows/single-flow.ts`** - 1 usage pattern
8. **`/flows/llm-flows/auto-flow.ts`** - 1 usage pattern

#### Model Components  
9. **`/models/anthropic-llm.ts`** - 1 usage pattern
10. **`/models/base-llm.ts`** - 1 usage pattern
11. **`/models/llm-registry.ts`** - 1 usage pattern

#### Tool Components
12. **`/tools/base/base-tool.ts`** - 1 usage pattern
13. **`/tools/mcp/create-tool.ts`** - 1 usage pattern
14. **`/tools/mcp/sampling-handler.ts`** - 1 usage pattern
15. **`/tools/mcp/client.ts`** - 1 usage pattern
16. **`/tools/common/exit-loop-tool.ts`** - 1 usage pattern
17. **`/tools/common/transfer-to-agent-tool.ts`** - 1 usage pattern
18. **`/tools/common/load-memory-tool.ts`** - 1 usage pattern
19. **`/tools/common/agent-tool.ts`** - 1 usage pattern
20. **`/tools/common/google-search.ts`** - 1 usage pattern
21. **`/tools/common/get-user-choice-tool.ts`** - 1 usage pattern

#### Agent Components
22. **`/agents/lang-graph-agent.ts`** - 2 usage patterns

---

## Log Levels Strategy

### Current State: Binary Debug System
- **Current**: Only `ADK_DEBUG=true/false` controls debug visibility
- **Limitation**: No granular control - it's all or nothing
- **Problem**: Debug floods in development, no intermediate levels

### New Multi-Level System
**Proposed Log Levels (Pino standard):**
- `trace` (10) - Extremely detailed debugging (function entry/exit, detailed state)
- `debug` (20) - Detailed debugging (current `debugStructured`, `debugArray`)  
- `info` (30) - General information (current `info` - agent lifecycle, major operations)
- `warn` (40) - Warning conditions (current `warn` - deprecated features, fallbacks)
- `error` (50) - Error conditions (current `error` - failures, exceptions)
- `fatal` (60) - Fatal errors requiring immediate attention (system crashes)

### Environment Variable Migration
```bash
# OLD
ADK_DEBUG=true    # Shows debug + info + warn + error

# NEW  
ADK_LOG_LEVEL=debug    # Shows debug + info + warn + error + fatal
ADK_LOG_LEVEL=info     # Shows info + warn + error + fatal (production default)
ADK_LOG_LEVEL=warn     # Shows warn + error + fatal
ADK_LOG_LEVEL=error    # Shows error + fatal only
ADK_LOG_LEVEL=trace    # Shows everything (very verbose)
```

### Log Level Assignment Strategy

#### **TRACE Level** - Internal Framework Debugging
```typescript
// Function entry/exit, detailed state changes
agentLogger.trace({ context: ctx }, 'Entering runAsyncImpl');
llmLogger.trace({ toolArgs: args }, 'Tool call arguments');
this.logger.trace({ state: this.currentState }, 'State transition');
```

#### **DEBUG Level** - Development Debugging  
```typescript
// Replace current debugStructured/debugArray calls
llmLogger.debug({ request: requestData }, 'LLM request details');
this.logger.debug({ tools: toolsArray }, 'Available tools loaded');
containerLogger.debug({ containerId }, 'Container operation started');
```

#### **INFO Level** - Production Operational Logs
```typescript
// Replace current info() calls - major lifecycle events
agentLogger.info('Agent started');
agentLogger.info({ duration: 1200 }, 'Agent completed');
this.logger.info({ tag: 'latest' }, 'Docker image built successfully');
```

#### **WARN Level** - Production Warnings
```typescript  
// Replace current warn() calls - non-fatal issues
this.logger.warn('runLive not fully implemented, delegating to runAsync');
modelLogger.warn({ model: 'deprecated-model' }, 'Using deprecated model');
```

#### **ERROR Level** - Production Errors
```typescript
// Replace current error() calls - failures and exceptions  
agentLogger.error({ err: error }, 'Agent execution failed');
containerLogger.error({ err: error }, 'Container operation failed');
```

#### **FATAL Level** - System Critical Errors
```typescript
// New level for system-breaking errors
this.logger.fatal({ err: error }, 'ADK framework initialization failed');
this.logger.fatal({ err: error }, 'Database connection lost');
```

## Current Logging Patterns Analysis

### Pattern 1: Basic Lifecycle Logging
**Current Usage:**
```typescript
protected logger = new Logger({ name: "ComponentName" });

this.logger.info(`Agent '${invocationContext.agent.name}' started.`);
this.logger.info(`Agent finished after ${stepCount} steps.`);
this.logger.warn("⚠️ runLive not fully implemented, delegating to runAsync");
this.logger.error("Failed to build Docker image", error);
```

**Found in:** BaseLlmFlow, LlmAgent, ContainerCodeExecutor, Runners, and all tool components

### Pattern 2: Structured Debug Logging  
**Current Usage:**
```typescript
this.logger.debugStructured("📤 LLM Request", {
  Model: llm.model,
  Agent: invocationContext.agent.name,
  "Content Items": llmRequest.contents?.length || 0,
  // ... more fields
});

this.logger.debugStructured("📥 LLM Response", {
  Model: llm.model,
  "Token Count": tokenCount,
  "Function Calls": functionCallsDisplay,
  // ... more fields
});
```

**Found in:** BaseLlmFlow (most critical usage)

### Pattern 3: Array Debug Logging
**Current Usage:**
```typescript
this.logger.debugArray("🛠️ Available Tools", toolsData);
this.logger.debugArray("🔧 Function Calls", functionCallsData);
```

**Found in:** BaseLlmFlow

### Pattern 4: Simple Debug with Context
**Current Usage:**
```typescript
this.logger.debug("Executing code in container", {
  containerId: this.containerId,
  language: codeRequest.language
});

this.logger.debug("Code execution completed", { stdout, stderr });
```

**Found in:** ContainerCodeExecutor, OutputSchema, various components

### Pattern 5: Error Logging with Context
**Current Usage:**
```typescript
this.logger.error("Error executing code in container", error);
this.logger.error(`AI SDK Error: ${String(error)}`, { error, request });
```

**Found in:** Throughout all components

---

## Migration Strategy by Component

### 1. Core Flow Components (High Priority)

#### **BaseLlmFlow** - Most Complex Migration
**Current Critical Usage:**
- Structured LLM request/response logging
- Tool array logging  
- Agent lifecycle tracking
- Transfer logging

**New Implementation with Log Levels:**
```typescript
export class BaseLlmFlow {
  private logger = new Logger({ name: "BaseLlmFlow" });
  
  async *runAsync(invocationContext: InvocationContext): AsyncGenerator<Event> {
    // Create context-aware loggers
    const agentLogger = this.logger.agent(invocationContext.agent.name);
    const llmLogger = this.logger.llm(invocationContext.agent.model);
    
    // INFO level - Production operational logs
    agentLogger.info({ invocationId: invocationContext.invocationId }, 'Agent started');
    
    let stepCount = 0;
    while (true) {
      stepCount++;
      
      // TRACE level - Detailed execution flow
      this.logger.trace({ step: stepCount }, 'Processing agent step');
      
      // ... existing logic
      
      if (!lastEvent || lastEvent.isFinalResponse()) {
        // INFO level - Major lifecycle completion
        agentLogger.info({ 
          stepCount, 
          duration: Date.now() - startTime 
        }, 'Agent completed');
        break;
      }
    }
  }
  
  async *_callLlmAsync(invocationContext, llmRequest, modelResponseEvent): AsyncGenerator<LlmResponse> {
    const llmLogger = this.logger.llm(llm.model);
    
    // DEBUG level - Replace debugStructured calls
    llmLogger.debug({
      agent: invocationContext.agent.name,
      contentItems: llmRequest.contents?.length || 0,
      systemInstruction: llmRequest.getSystemInstructionText() ? 'present' : 'none',
      toolCount: llmRequest.config?.tools?.length || 0,
      streaming: isStreaming
    }, 'LLM request');
    
    const startTime = Date.now();
    for await (const llmResponse of llm.generateContentAsync(llmRequest, isStreaming)) {
      const duration = Date.now() - startTime;
      
      // DEBUG level - Detailed response info
      llmLogger.debug({
        tokenCount: llmResponse.usageMetadata?.totalTokenCount,
        functionCalls: llmResponse.content?.parts?.filter(p => p.functionCall)?.length || 0,
        finishReason: llmResponse.finishReason,
        duration_ms: duration,
        partial: llmResponse.partial
      }, 'LLM response');
      
      // TRACE level - Very detailed response analysis
      if (llmResponse.content?.parts) {
        this.logger.trace({
          parts: llmResponse.content.parts.map(part => ({
            type: part.text ? 'text' : part.functionCall ? 'function_call' : 'other',
            size: part.text?.length || 0
          }))
        }, 'Response parts breakdown');
      }
      
      yield llmResponse;
    }
  }
  
  async *_preprocessAsync(invocationContext, llmRequest): AsyncGenerator<Event> {
    // DEBUG level - Replace debugArray with structured logging
    if (tools.length > 0) {
      this.logger.debug({
        toolCount: tools.length,
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description?.substring(0, 50),
          longRunning: tool.isLongRunning
        }))
      }, '🛠️ Available tools loaded');
      
      // TRACE level - Full tool details
      this.logger.trace({
        tools: tools.map(tool => ({
          name: tool.name,
          fullDescription: tool.description,
          schema: tool.schema,
          isLongRunning: tool.isLongRunning
        }))
      }, 'Complete tool configurations');
    }
  }
  
  _getAgentToRun(invocationContext: InvocationContext, agentName: string): BaseAgent {
    // TRACE level - Agent lookup process
    this.logger.trace({ targetAgent: agentName }, 'Looking up agent in tree');
    
    const rootAgent = invocationContext.agent.rootAgent;
    const agentToRun = rootAgent.findAgent(agentName);

    if (!agentToRun) {
      // ERROR level - Agent not found
      this.logger.error({ 
        targetAgent: agentName,
        availableAgents: this.getAvailableAgentNames(rootAgent)
      }, `Agent '${agentName}' not found in agent tree`);
      throw new Error(`Agent ${agentName} not found in the agent tree.`);
    }

    // DEBUG level - Successful agent lookup
    this.logger.debug({ 
      targetAgent: agentName,
      found: true 
    }, 'Agent found in tree');

    return agentToRun;
  }
}
```

#### **LlmAgent** - Agent Lifecycle
**Current Usage:**
- Agent execution logging
- Output schema validation
- Error handling

**New Implementation:**
```typescript
export class LlmAgent {
  protected logger = new Logger({ name: "LlmAgent" });
  
  protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event> {
    const agentLogger = this.logger.agent(this.name);
    
    agentLogger.started({ 
      invocationId: context.invocationId,
      model: this.model 
    });
    
    try {
      for await (const event of this.llmFlow.runAsync(context)) {
        this.maybeSaveOutputToState(event);
        yield event;
      }
      agentLogger.completed(Date.now() - startTime);
    } catch (error) {
      agentLogger.error(error, { 
        invocationId: context.invocationId 
      });
      throw error;
    }
  }
}
```

### 2. Container Code Executor (Medium Priority)

**Current Complex Usage:**
- Docker container lifecycle
- Code execution tracking
- Build process logging

**New Implementation:**
```typescript
export class ContainerCodeExecutor {
  protected logger = new Logger({ name: "ContainerCodeExecutor" });
  
  async executeCode(codeRequest: CodeRequest): Promise<CodeResponse> {
    const containerLogger = this.logger.child({
      container: this.containerId,
      language: codeRequest.language
    });
    
    containerLogger.debug({
      codeLength: codeRequest.code.length,
      language: codeRequest.language
    }, "Executing code in container");
    
    try {
      const result = await this.runCodeInContainer(codeRequest);
      
      containerLogger.debug({
        exitCode: result.exitCode,
        stdoutLength: result.stdout.length,
        stderrLength: result.stderr.length
      }, "Code execution completed");
      
      return result;
    } catch (error) {
      containerLogger.error({ err: error }, "Error executing code in container");
      throw error;
    }
  }
  
  private async buildImage(): Promise<void> {
    const buildLogger = this.logger.child({ image: this.image });
    
    buildLogger.info({ tag: this.image }, "Building Docker image...");
    
    try {
      // ... build logic
      buildLogger.info({ tag: this.image }, "Docker image built successfully");
    } catch (error) {
      buildLogger.error({ err: error }, "Failed to build Docker image");
      throw error;
    }
  }
}
```

### 3. Simple Tool Components (Low Priority)

**Current Usage Pattern:**
```typescript
protected logger = new Logger({ name: "ToolName" });
// Minimal usage, mostly basic info/error logging
```

**New Implementation:**
```typescript
// Most tools can use simple migration
export class BaseTool {
  protected logger = new Logger({ name: "BaseTool" });
  
  // Simple replacement - no specialized loggers needed
  // Just update to structured format where beneficial
}
```

### 4. Model Components (Medium Priority)

**Current Usage:**
- Model-specific debugging
- Request/response logging
- Error handling

**New Implementation:**
```typescript
export class AiSdkLlm {
  protected logger = new Logger({ name: "AiSdkLlm" });
  
  async generateContentAsync(request: LlmRequest): AsyncGenerator<LlmResponse> {
    const modelLogger = this.logger.llm(this.model);
    
    try {
      // Use specialized LLM logging
      modelLogger.request(request);
      
      for await (const response of this.callModel(request)) {
        modelLogger.response(response, duration);
        yield response;
      }
    } catch (error) {
      modelLogger.error({ err: error, request }, `AI SDK Error: ${String(error)}`);
      throw error;
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 Install Dependencies
```bash
cd packages/adk
pnpm add pino pino-pretty pino-abstract-transport
pnpm add -D @types/pino
```

#### 1.2 Create New Logger Structure
```
/packages/adk/src/logger/
├── index.ts              # Main Logger class
├── config.ts             # Configuration management
├── specialized/
│   ├── agent-logger.ts   # AgentLogger class
│   ├── llm-logger.ts     # LLMLogger class
│   └── session-logger.ts # SessionLogger class
├── formatters/
│   ├── llm-formatter.ts  # Migrate LogFormatter functionality
│   └── development.ts    # Pretty printing for dev
└── types.ts              # TypeScript interfaces
```

#### 1.3 Build Core Logger Class
**File: `/logger/index.ts`**
```typescript
import pino from 'pino';
import { AgentLogger } from './specialized/agent-logger';
import { LLMLogger } from './specialized/llm-logger';
import { SessionLogger } from './specialized/session-logger';
import { getLoggerConfig } from './config';

export class Logger {
  private pino: pino.Logger;
  
  constructor(options: { name: string }) {
    this.pino = pino({
      ...getLoggerConfig(),
      base: { component: options.name }
    });
  }
  
  // Standard logging methods with overloads
  trace(data: object, message: string): void;
  trace(message: string): void;
  trace(dataOrMessage: object | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.trace(dataOrMessage);
    } else {
      this.pino.trace(dataOrMessage, message);
    }
  }
  
  debug(data: object, message: string): void;
  debug(message: string): void;
  debug(dataOrMessage: object | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.debug(dataOrMessage);
    } else {
      this.pino.debug(dataOrMessage, message);
    }
  }
  
  info(data: object, message: string): void;
  info(message: string): void;
  info(dataOrMessage: object | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.info(dataOrMessage);
    } else {
      this.pino.info(dataOrMessage, message);
    }
  }
  
  warn(data: object, message: string): void;
  warn(message: string): void;
  warn(dataOrMessage: object | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.warn(dataOrMessage);
    } else {
      this.pino.warn(dataOrMessage, message);
    }
  }
  
  error(data: object, message: string): void;
  error(message: string): void;
  error(dataOrMessage: object | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.error(dataOrMessage);
    } else {
      this.pino.error(dataOrMessage, message);
    }
  }
  
  // Context-aware logger factories
  agent(agentName: string): AgentLogger {
    return new AgentLogger(this.pino.child({ agent: agentName }));
  }
  
  llm(model: string): LLMLogger {
    return new LLMLogger(this.pino.child({ llm: { model } }));
  }
  
  session(sessionId: string, userId?: string): SessionLogger {
    return new SessionLogger(this.pino.child({ 
      session: sessionId, 
      user: userId 
    }));
  }
  
  // Create child logger with additional context
  child(context: object): Logger {
    const childLogger = new Logger({ name: 'child' });
    childLogger.pino = this.pino.child(context);
    return childLogger;
  }
}
```

#### 1.4 Build Specialized Loggers
**File: `/logger/specialized/agent-logger.ts`**
```typescript
import pino from 'pino';

export class AgentLogger {
  constructor(private pino: pino.Logger) {}
  
  started(data?: object) {
    this.pino.info(data, 'Agent started');
  }
  
  completed(duration: number, data?: object) {
    this.pino.info({ duration_ms: duration, ...data }, 'Agent completed');
  }
  
  error(error: Error, data?: object) {
    this.pino.error({ err: error, ...data }, 'Agent error');
  }
  
  transferring(targetAgent: string, reason?: string) {
    this.pino.debug({ target_agent: targetAgent, reason }, 'Transferring to agent');
  }
  
  step(stepNumber: number, data?: object) {
    this.pino.debug({ step: stepNumber, ...data }, 'Agent step');
  }
}
```

**File: `/logger/specialized/llm-logger.ts`**
```typescript
import pino from 'pino';
import type { LlmRequest, LlmResponse } from '../../models';

export class LLMLogger {
  constructor(private pino: pino.Logger) {}
  
  request(data: {
    agent?: string;
    contentItems?: number;
    systemInstruction?: string;
    toolCount?: number;
    streaming?: boolean;
  }) {
    this.pino.debug({
      content_items: data.contentItems,
      system_instruction: data.systemInstruction ? 'present' : 'none',
      tool_count: data.toolCount || 0,
      streaming: data.streaming || false,
      agent: data.agent
    }, 'LLM request');
  }
  
  response(response: LlmResponse, duration: number) {
    this.pino.debug({
      finish_reason: response.finishReason,
      usage: response.usageMetadata,
      duration_ms: duration,
      function_calls: response.content?.parts?.filter(p => p.functionCall)?.length || 0,
      partial: response.partial || false,
      error: response.errorCode || null
    }, 'LLM response');
  }
  
  toolCall(toolName: string, args: object) {
    this.pino.trace({ 
      tool: toolName, 
      args: JSON.stringify(args).substring(0, 100) 
    }, 'Tool call');
  }
  
  toolResult(toolName: string, result: any, duration: number) {
    this.pino.trace({ 
      tool: toolName, 
      result_type: typeof result, 
      duration_ms: duration 
    }, 'Tool result');
  }
}
```

#### 1.5 Configuration Management
**File: `/logger/config.ts`**
```typescript
import type { LoggerOptions } from 'pino';

export function getLoggerConfig(): LoggerOptions {
  const level = process.env.ADK_LOG_LEVEL || (isDebugEnabled() ? 'debug' : 'info');
  const format = process.env.ADK_LOG_FORMAT || 'pretty';
  
  const config: LoggerOptions = {
    level,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({ 
        ...bindings, 
        framework: 'adk',
        pid: undefined, // Remove pid for cleaner logs
        hostname: undefined // Remove hostname for cleaner logs
      })
    }
  };
  
  // Development: pretty printing
  if (format === 'pretty' && (process.env.NODE_ENV === 'development' || isDebugEnabled())) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:mm:ss',
        singleLine: false,
        messageFormat: '{component} | {msg}'
      }
    };
  }
  
  // Production: structured JSON
  if (format === 'json') {
    // No transport - raw JSON output
  }
  
  return config;
}

function isDebugEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ADK_DEBUG === 'true';
}
```

### Phase 2: Component Migration (Week 2)

#### 2.1 Migrate BaseLlmFlow (Day 1-2)
1. Replace `debugStructured` calls with `llmLogger.request()` and `llmLogger.response()`
2. Replace `debugArray` calls with structured debug logging
3. Update agent lifecycle logging with `agentLogger`
4. Test LLM request/response logging

#### 2.2 Migrate LlmAgent (Day 3)
1. Update agent lifecycle logging
2. Migrate error handling
3. Test agent execution flow

#### 2.3 Migrate ContainerCodeExecutor (Day 4)
1. Update container lifecycle logging
2. Migrate Docker build logging
3. Update code execution logging

#### 2.4 Migrate All Other Components (Day 5)
1. Batch update all tool components
2. Update model components
3. Update remaining agent components

### Phase 3: Advanced Features (Week 3)

#### 3.1 Add LLM Formatter Migration
Migrate existing `LogFormatter` functionality to work with Pino structured logging.

#### 3.2 Add File Logging
```typescript
// Production configuration with file logging
if (process.env.ADK_LOG_FILE) {
  config.transport = [
    {
      target: 'pino/file',
      options: { 
        destination: process.env.ADK_LOG_FILE,
        mkdir: true
      }
    }
  ];
}
```

#### 3.3 Add Request Correlation
Implement session and request correlation tracking across components.

### Phase 4: Testing and Validation (Week 4)

#### 4.1 Update All Imports
Replace all `import { Logger } from "@adk/logger"` across the codebase.

#### 4.2 Remove Old Logger Files
- Delete `/logger/index.ts` (old)
- Delete `/logger/log-formatter.ts` (migrate functionality to new structure)

#### 4.3 Update Examples and Documentation
Update all examples to use new logging patterns.

#### 4.4 Performance Testing
Benchmark new vs old logging performance.

---

## Migration Checklist

### Critical Components (Must migrate first)
- [ ] `BaseLlmFlow` - Core LLM logging
- [ ] `LlmAgent` - Agent lifecycle  
- [ ] `ContainerCodeExecutor` - Container operations

### Standard Components (Batch migration)
- [ ] All tool components (21 files)
- [ ] Model components (3 files)
- [ ] Remaining flow components (3 files)

### Validation Steps
- [ ] All imports updated
- [ ] Old logger files removed
- [ ] Examples updated
- [ ] Tests passing
- [ ] Performance benchmarks completed

### Breaking Changes Documentation
- [ ] Create migration guide for alpha users
- [ ] Update ADK_DEBUG to ADK_LOG_LEVEL in docs
- [ ] Document new structured logging patterns
- [ ] Create examples of new API usage

---

## Risk Mitigation

### High-Risk Components
1. **BaseLlmFlow** - Most complex logging, core to debugging
   - **Mitigation**: Implement with comprehensive testing, preserve all current functionality
   
2. **ContainerCodeExecutor** - Critical for code execution debugging
   - **Mitigation**: Test thoroughly with various code execution scenarios

### Low-Risk Components  
- All tool components have minimal logging
- Most model components have simple logging patterns

### Testing Strategy
1. **Unit tests** for new Logger class and specialized loggers
2. **Integration tests** with real LLM calls and agent execution
3. **Performance tests** comparing old vs new logging throughput
4. **Visual tests** ensuring debug output remains useful

This execution plan provides a systematic approach to migrating ADK's logging while minimizing risk and ensuring all current functionality is preserved and enhanced.

---

## Log Levels Implementation Guide

### Log Level Hierarchy & Usage Patterns

Pino uses numeric log levels where lower numbers represent more verbose logging:

| Level | Name    | Value | When to Use | Production Visible |
|-------|---------|-------|-------------|-------------------|
| trace | TRACE   | 10    | Function entry/exit, detailed state changes | No |
| debug | DEBUG   | 20    | Development debugging, detailed operations | No |
| info  | INFO    | 30    | Normal operations, lifecycle events | Yes |
| warn  | WARN    | 40    | Warnings, deprecated usage, fallbacks | Yes |
| error | ERROR   | 50    | Errors, failures, exceptions | Yes |
| fatal | FATAL   | 60    | Critical system failures | Yes |

### Environment Configuration

```bash
# Development (shows everything)
ADK_LOG_LEVEL=trace

# Development (moderate verbosity) 
ADK_LOG_LEVEL=debug

# Production (default)
ADK_LOG_LEVEL=info

# Production (quiet)
ADK_LOG_LEVEL=warn

# Production (errors only)
ADK_LOG_LEVEL=error
```

### Migration Mapping from Current System

#### Current `debugStructured()` → New `debug()`
```typescript
// OLD
this.logger.debugStructured("📤 LLM Request", {
  Model: llm.model,
  Agent: invocationContext.agent.name,
  "Content Items": llmRequest.contents?.length || 0
});

// NEW
llmLogger.debug({
  model: llm.model,
  agent: invocationContext.agent.name,
  contentItems: llmRequest.contents?.length || 0
}, "LLM request");
```

#### Current `debugArray()` → New `debug()` 
```typescript
// OLD
this.logger.debugArray("🛠️ Available Tools", toolsData);

// NEW
this.logger.debug({
  toolCount: tools.length,
  tools: tools.map(tool => ({
    name: tool.name,
    description: tool.description?.substring(0, 50)
  }))
}, "Available tools loaded");
```

#### Current `info()` → New `info()`
```typescript
// OLD
this.logger.info(`Agent '${invocationContext.agent.name}' started.`);

// NEW  
agentLogger.info({
  invocationId: invocationContext.invocationId,
  model: this.model
}, "Agent started");
```

#### Current `warn()` → New `warn()`
```typescript
// OLD
this.logger.warn("⚠️ runLive not fully implemented, delegating to runAsync");

// NEW
this.logger.warn({ 
  method: 'runLive',
  fallback: 'runAsync' 
}, "runLive not fully implemented, delegating to runAsync");
```

#### Current `error()` → New `error()`
```typescript
// OLD
this.logger.error("Failed to build Docker image", error);

// NEW
containerLogger.error({ 
  err: error,
  containerId: this.containerId,
  operation: 'build'
}, "Failed to build Docker image");
```

### New Log Level Usage Examples

#### **TRACE Level** - Framework Internals
```typescript
// Function entry/exit tracking
agentLogger.trace({ method: 'runAsyncImpl', args: { contextId: context.id } }, 'Method entry');

// Detailed state transitions  
this.logger.trace({ 
  from: this.previousState, 
  to: this.currentState,
  trigger: 'user_input'
}, 'State transition');

// Low-level framework operations
this.logger.trace({ 
  eventType: event.constructor.name,
  eventData: event 
}, 'Processing framework event');
```

#### **DEBUG Level** - Development Debugging
```typescript
// Replace current debugStructured patterns
llmLogger.debug({
  requestId: generateId(),
  model: llm.model,
  tokenCount: estimateTokens(request),
  toolsAvailable: tools.length,
  streaming: isStreaming
}, "Preparing LLM request");

// Tool execution details
toolLogger.debug({
  toolName: tool.name,
  arguments: tool.args,
  timeout: tool.timeout
}, "Executing tool");

// Container operations
containerLogger.debug({
  containerId: this.containerId,
  language: codeRequest.language,
  codeLength: codeRequest.code.length
}, "Executing code in container");
```

#### **INFO Level** - Production Operations
```typescript
// Agent lifecycle (most important for production)
agentLogger.info({ duration: endTime - startTime }, "Agent completed successfully");

// System initialization
this.logger.info({ 
  version: packageInfo.version,
  environment: process.env.NODE_ENV
}, "ADK framework initialized");

// Major operational milestones
containerLogger.info({ 
  imageTag: 'latest',
  buildTime: buildDuration 
}, "Docker image built successfully");

// Important business logic events
flowLogger.info({ 
  flowType: 'SingleFlow',
  stepCount: totalSteps 
}, "Flow execution completed");
```

#### **WARN Level** - Production Warnings
```typescript
// Deprecated feature usage
this.logger.warn({ 
  feature: 'runLive',
  alternative: 'runAsync',
  deprecationVersion: '2.0.0'
}, "Using deprecated method, please migrate");

// Performance concerns
llmLogger.warn({ 
  responseTime: duration,
  threshold: 30000 
}, "LLM response took longer than expected");

// Fallback behavior
modelLogger.warn({ 
  requestedModel: 'gpt-4',
  fallbackModel: 'gpt-3.5-turbo',
  reason: 'quota_exceeded'
}, "Falling back to alternative model");

// Configuration issues
this.logger.warn({ 
  missingEnvVar: 'ANTHROPIC_API_KEY',
  impact: 'Claude models unavailable'
}, "Missing API key configuration");
```

#### **ERROR Level** - Production Errors
```typescript
// Tool execution failures
toolLogger.error({ 
  err: error,
  toolName: tool.name,
  arguments: tool.args,
  retryCount: attempts
}, "Tool execution failed");

// LLM communication errors
llmLogger.error({ 
  err: error,
  model: llm.model,
  requestId: request.id,
  statusCode: error.status
}, "LLM request failed");

// Container operation failures
containerLogger.error({ 
  err: error,
  containerId: this.containerId,
  operation: 'execute',
  exitCode: error.exitCode
}, "Container execution failed");

// Agent execution failures
agentLogger.error({ 
  err: error,
  invocationId: context.invocationId,
  stepCount: currentStep
}, "Agent execution failed");
```

#### **FATAL Level** - Critical System Errors
```typescript
// Framework initialization failures
this.logger.fatal({ 
  err: error,
  component: 'LoggerFactory',
  impact: 'framework_unusable'
}, "Failed to initialize logging system");

// Database connection failures
this.logger.fatal({ 
  err: error,
  connectionString: obfuscateConnectionString(dbUrl),
  impact: 'data_persistence_unavailable'
}, "Database connection failed");

// Critical configuration errors
this.logger.fatal({ 
  err: error,
  configFile: 'adk.config.js',
  impact: 'framework_initialization_failed'
}, "Invalid configuration detected");
```

### Context-Aware Logger Specializations

#### **Agent Logger** - `logger.agent(agentName)`
```typescript
const agentLogger = this.logger.agent('DataAnalysisAgent');

// Specialized methods for agent lifecycle
agentLogger.started({ invocationId, model });
agentLogger.completed({ duration, stepCount });
agentLogger.transferring({ toAgent: 'ReportAgent', context });
agentLogger.error({ err: error, step: currentStep });
```

#### **LLM Logger** - `logger.llm(modelName)`
```typescript
const llmLogger = this.logger.llm('gpt-4');

// Specialized methods for LLM operations
llmLogger.request({ tokenCount, toolsCount, streaming });
llmLogger.response({ tokenCount, functionCalls, duration });
llmLogger.rateLimited({ retryAfter, requestId });
llmLogger.error({ err: error, requestId, statusCode });
```

#### **Tool Logger** - `logger.tool(toolName)`
```typescript
const toolLogger = this.logger.tool('WebSearchTool');

// Specialized methods for tool operations
toolLogger.executing({ arguments: args });
toolLogger.completed({ result: summary, duration });
toolLogger.longRunning({ taskId, estimatedDuration });
toolLogger.error({ err: error, arguments: args });
```

#### **Container Logger** - `logger.container(containerId)`
```typescript
const containerLogger = this.logger.container(this.containerId);

// Specialized methods for container operations
containerLogger.building({ imageTag, dockerfile });
containerLogger.starting({ ports, volumes });
containerLogger.executing({ language, codeLength });
containerLogger.stopped({ exitCode, duration });
```

### Production Log Level Recommendations

#### **Development Environment**
```bash
ADK_LOG_LEVEL=debug  # Show debug + info + warn + error + fatal
ADK_LOG_FORMAT=pretty  # Human-readable colored output
```

#### **Staging Environment**
```bash
ADK_LOG_LEVEL=info   # Show info + warn + error + fatal
ADK_LOG_FORMAT=json  # Structured JSON for log aggregation
```

#### **Production Environment**
```bash
ADK_LOG_LEVEL=warn   # Show warn + error + fatal only
ADK_LOG_FORMAT=json  # Structured JSON for monitoring systems
ADK_LOG_FILE=/var/log/adk/app.log  # File output for persistence
```

#### **Debug Production Issues**
```bash
ADK_LOG_LEVEL=debug  # Temporarily increase verbosity
ADK_LOG_FORMAT=json  # Keep structured format
# Don't leave debug level in production long-term
```

This implementation guide ensures that the new log levels are used consistently across all components while providing clear migration paths from the current logging patterns.

---
