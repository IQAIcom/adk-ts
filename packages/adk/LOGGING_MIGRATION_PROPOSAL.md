# ADK Logging Migration Proposal: From Custom Logger to Pino

## Executive Summary

This document outlines the proposal to migrate ADK's current custom logging solution to [Pino](https://github.com/pinojs/pino), a high-performance JSON logger for Node.js. The migration will provide better performance, structured logging, multiple log levels, and production-ready features that an agent framework requires.

## Current State Analysis

### Current Logging Implementation

**Files to be replaced:**
- `/packages/adk/src/logger/index.ts` - Custom Logger class with basic console output
- `/packages/adk/src/logger/log-formatter.ts` - Specialized formatters for LLM-related objects

**Current Features:**
- ✅ Simple console-based logging with colored output (chalk)
- ✅ Debug mode control via `ADK_DEBUG=true` or `NODE_ENV=development`
- ✅ Structured debug tables (`debugStructured`, `debugArray`)
- ✅ Specialized LLM object formatting (function calls, content, responses)
- ✅ Timestamped log entries with emojis
- ✅ Framework-specific blue coloring for logs

**Current Log Levels:**
- `debug()` - Only shown when debug is enabled
- `info()` - Always shown
- `warn()` - Always shown  
- `error()` - Always shown

### Current Usage Patterns

**Throughout the codebase, the logger is used for:**

1. **Agent Lifecycle Events** (`BaseLlmFlow`)
   ```typescript
   this.logger.info(`Agent '${invocationContext.agent.name}' started.`);
   this.logger.info(`Agent finished after ${stepCount} steps.`);
   ```

2. **LLM Request/Response Debugging**
   ```typescript
   this.logger.debugStructured("📤 LLM Request", { ... });
   this.logger.debugStructured("📥 LLM Response", { ... });
   ```

3. **Tool Execution Tracking**
   ```typescript
   this.logger.debugArray("🛠️ Available Tools", toolsData);
   this.logger.debugArray("🔧 Function Calls", functionCallsData);
   ```

4. **Container Operations** (`ContainerCodeExecutor`)
   ```typescript
   this.logger.info("Building Docker image...", { tag: this.image });
   this.logger.debug("Code execution completed", { stdout, stderr });
   ```

5. **Error Handling and Warnings**
   ```typescript
   this.logger.error("Failed to build Docker image", error);
   this.logger.warn("⚠️ runLive not fully implemented, delegating to runAsync");
   ```

### Current Limitations

1. **Single Debug Level**: Only binary debug on/off, no granular control
2. **Console-Only Output**: No file, JSON, or remote logging support
3. **No Log Correlation**: No request/session correlation across components
4. **Limited Structured Data**: Basic object formatting, no standardized fields
5. **No Production Features**: No log rotation, compression, or performance optimizations
6. **No Observability Integration**: Limited integration with monitoring systems

## Proposed Solution: Pino Migration

### Why Pino?

1. **Performance**: 5x faster than other Node.js loggers
2. **Structured Logging**: Native JSON output with nested objects
3. **Multiple Transports**: Console, file, remote, HTTP, etc.
4. **Production Ready**: Log rotation, compression, sampling
5. **Ecosystem**: Rich plugin ecosystem for formatters and transports
6. **TypeScript Support**: Full TypeScript definitions
7. **Low Memory Footprint**: Optimized for high-throughput applications

### New Log Level Strategy

**Proposed Log Levels:**
- `trace` (10) - Very detailed debugging (replace current debug detailed logs)
- `debug` (20) - Debug information (replace current debug)
- `info` (30) - General information (current info)
- `warn` (40) - Warning conditions (current warn)
- `error` (50) - Error conditions (current error)
- `fatal` (60) - Fatal errors that require immediate attention

**Environment Variable Configuration:**
```bash
# Replace ADK_DEBUG=true with:
ADK_LOG_LEVEL=debug     # Set minimum log level
ADK_LOG_FORMAT=pretty   # 'json' | 'pretty' | 'structured'
ADK_LOG_FILE=./logs/adk.log  # Optional file output
ADK_LOG_CORRELATION=true     # Enable request correlation
```

### Migration Architecture

#### 1. New Logger Structure

```
/packages/adk/src/logger/
├── index.ts              # Main Pino logger configuration
├── formatters/
│   ├── llm-formatter.ts  # LLM-specific object formatters
│   ├── agent-formatter.ts # Agent lifecycle formatters
│   └── error-formatter.ts # Error formatting utilities
├── transports/
│   ├── console.ts        # Console transport configuration
│   ├── file.ts          # File transport configuration
│   └── telemetry.ts     # OpenTelemetry integration
├── context/
│   ├── correlation.ts   # Request/session correlation
│   └── agent-context.ts # Agent-specific context
└── types.ts             # TypeScript interfaces
```

#### 2. Modern API Design

**Clean Slate Approach**
- Design optimal API without legacy constraints
- Native Pino integration with full feature access
- Structured logging as the primary paradigm
- Agent-first logging patterns built-in

### Feature Implementation Plan

#### 1. Core Logger Replacement

**New Logger Class (Clean API):**
```typescript
import pino from 'pino';
import { AgentContext } from './context/agent-context';

export class Logger {
  private pino: pino.Logger;
  
  constructor(options: LoggerOptions) {
    this.pino = pino({
      level: getLogLevel(),
      transport: getTransports(),
      formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => ({ ...bindings, framework: 'adk' })
      }
    });
  }
  
  // Modern structured logging API
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
  
  // Context-aware logger factories
  // These create specialized loggers with built-in context and methods
  
  agent(agentName: string): AgentLogger {
    // Creates a logger that automatically includes agent context in all logs
    return new AgentLogger(this.pino.child({ agent: agentName }));
  }
  
  llm(model: string): LLMLogger {
    // Creates a logger specifically for LLM operations with model context
    // All logs from this logger will include { llm: { model: "gemini-2.5-flash" } }
    return new LLMLogger(this.pino.child({ llm: { model } }));
  }
  
  session(sessionId: string, userId?: string): SessionLogger {
    // Creates a logger for session-level operations with correlation IDs
    return new SessionLogger(this.pino.child({ 
      session: sessionId, 
      user: userId 
    }));
  }
}

// Specialized loggers for different contexts
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
}

export class LLMLogger {
  constructor(private pino: pino.Logger) {}
  
  request(request: LLMRequest) {
    this.pino.debug({
      model: request.model,
      messages: request.messages?.length,
      tools: request.tools?.length,
      stream: request.stream
    }, 'LLM request');
  }
  
  response(response: LLMResponse, duration: number) {
    this.pino.debug({
      finish_reason: response.finishReason,
      usage: response.usage,
      duration_ms: duration,
      function_calls: response.functionCalls?.length
    }, 'LLM response');
  }
  
  toolCall(toolName: string, args: object) {
    this.pino.trace({ tool: toolName, args }, 'Tool call');
  }
  
  toolResult(toolName: string, result: any, duration: number) {
    this.pino.trace({ 
      tool: toolName, 
      result: typeof result, 
      duration_ms: duration 
    }, 'Tool result');
  }
}
```

#### 2. Enhanced LLM Logging

**Specialized LLM Formatters:**
```typescript
export class LlmFormatter {
  static formatRequest(request: LlmRequest): LLMRequestLog {
    return {
      model: request.model,
      messageCount: request.messages?.length || 0,
      hasTools: request.tools && request.tools.length > 0,
      hasSystemPrompt: !!request.system,
      tokensEstimate: this.estimateTokens(request)
    };
  }
  
  static formatResponse(response: LlmResponse): LLMResponseLog {
    return {
      finishReason: response.finishReason,
      functionCalls: this.formatFunctionCalls(response.functionCalls),
      contentLength: this.getContentLength(response.content),
      usage: response.usage
    };
  }
}
```

#### 3. Request Correlation

**Agent Context Tracking:**
```typescript
export class AgentContext {
  private correlationId: string;
  private sessionId: string;
  private agentName: string;
  
  createChild(childAgentName: string): AgentContext {
    return new AgentContext({
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      agentName: childAgentName,
      parentAgent: this.agentName
    });
  }
  
  withLogger(logger: Logger): Logger {
    return logger.child({
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      agent: this.agentName
    });
  }
}
```

#### 4. Performance Monitoring

**Built-in Metrics:**
```typescript
export class PerformanceLogger {
  logAgentExecution(agentName: string, duration: number, success: boolean) {
    logger.info({
      metric: 'agent_execution',
      agent: agentName,
      duration_ms: duration,
      success,
      timestamp: Date.now()
    }, 'Agent execution completed');
  }
  
  logLLMCall(model: string, tokenUsage: TokenUsage, duration: number) {
    logger.info({
      metric: 'llm_call',
      model,
      input_tokens: tokenUsage.inputTokens,
      output_tokens: tokenUsage.outputTokens,
      duration_ms: duration
    }, 'LLM call completed');
  }
}
```

### Migration Plan

#### Phase 1: Clean Implementation (Week 1-2)
1. **Install Pino dependencies**
   ```bash
   pnpm add pino pino-pretty pino-abstract-transport
   pnpm add -D @types/pino
   ```

2. **Build new logger from scratch**
   - Modern API design with method overloading
   - Built-in agent/LLM/session context loggers
   - Full Pino feature access

3. **Replace current logger everywhere**
   - Update all imports in one go
   - Migrate to new API patterns
   - Remove old logger files entirely

#### Phase 2: Enhanced Features (Week 3-4)
1. **Implement specialized loggers**
   - AgentLogger with lifecycle methods
   - LLMLogger with request/response tracking
   - SessionLogger with correlation

2. **Add production features**
   - Request correlation out of the box
   - Performance metrics built-in
   - Error context enrichment

#### Phase 3: Advanced Features (Week 5-6)
1. **File logging and rotation**
   - Daily log rotation by default
   - Compression and cleanup
   - Multiple output targets

2. **Monitoring integration**
   - OpenTelemetry correlation
   - Metrics extraction
   - Alert-ready error formatting

#### Phase 4: Documentation and Polish (Week 7-8)
1. **Complete documentation**
   - New API examples
   - Configuration guide
   - Migration examples for alpha users

2. **Performance validation**
   - Benchmarks vs old solution
   - Memory usage optimization
   - Load testing

### Configuration Examples

#### Development Configuration
```typescript
// logger.config.ts
export const developmentConfig = {
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss',
      singleLine: false
    }
  },
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() })
  }
};
```

#### Production Configuration  
```typescript
export const productionConfig = {
  level: 'info',
  transport: [
    {
      target: 'pino/file',
      options: { destination: './logs/adk.log' }
    },
    {
      target: 'pino-http-send',
      options: { 
        url: process.env.LOG_ENDPOINT,
        headers: { 'Authorization': `Bearer ${process.env.LOG_TOKEN}` }
      }
    }
  ],
  base: {
    environment: process.env.NODE_ENV,
    service: 'adk-agent-framework'
  }
};
```

### Benefits of Migration

#### 1. Performance Improvements
- **5x faster logging** compared to current console.log approach
- **Reduced memory allocation** through object pooling
- **Async logging** to prevent blocking main thread
- **CPU usage reduction** with optimized JSON serialization

#### 2. Better Debugging Experience
- **Structured queries** on log data with tools like jq
- **Request correlation** across distributed agent systems  
- **Rich context** attached to every log entry
- **Filtering and searching** by any field

#### 3. Production Readiness
- **Log rotation and compression** to manage disk space
- **Remote logging** for centralized monitoring
- **Error aggregation** and alerting integration
- **Performance metrics** built into logging

#### 4. Developer Experience
- **Pretty printing** for development with colors and formatting
- **IDE integration** with structured log viewing
- **Debugging helpers** for complex agent workflows
- **Zero configuration** defaults with smart environment detection

### Risk Assessment

#### Low Risk
- ✅ **Clean Architecture**: No legacy constraints, optimal design
- ✅ **Alpha Status**: Breaking changes are expected and acceptable
- ✅ **Proven Technology**: Pino is battle-tested in production
- ✅ **Small User Base**: Easy to coordinate migration with few users

#### Medium Risk  
- ⚠️ **API Changes**: Users need to update their logging calls
- ⚠️ **Bundle Size**: Pino adds ~200KB to bundle (acceptable for Node.js)
- ⚠️ **Learning Curve**: New structured logging patterns

#### Mitigation Strategies
- **Clear Migration Guide**: Step-by-step upgrade instructions for alpha users
- **Breaking Change Communication**: Proper versioning and changelog
- **Enhanced Value**: Significantly better debugging experience justifies changes
- **Quick Migration**: Small codebase makes updates manageable

### Success Metrics

#### Performance Metrics
- **Logging Performance**: 5x improvement in log throughput
- **Memory Usage**: 30% reduction in logging-related memory allocation  
- **CPU Impact**: <1% CPU usage for logging in production loads

#### Developer Experience Metrics
- **Debug Efficiency**: 50% faster debugging with structured logs
- **Issue Resolution**: 40% faster root cause analysis
- **Development Velocity**: Maintained or improved development speed

#### Production Metrics
- **Error Detection**: 99% error capture rate with correlation
- **Log Volume**: Manageable log volume with smart sampling
- **Observability**: Full request tracing across agent boundaries

## Conclusion

The migration from the current custom logging solution to Pino represents a significant improvement in ADK's observability, performance, and production readiness. The phased approach ensures minimal disruption while delivering immediate benefits.

**Key Advantages:**
- ⚡ **Performance**: 5x faster logging with lower memory usage
- 🔍 **Observability**: Full request correlation and structured data
- 🚀 **Production Ready**: Log rotation, remote logging, monitoring integration
- 👥 **Developer Friendly**: Better debugging experience with rich context
- 🧹 **Clean Architecture**: Modern API design without legacy constraints
- 📈 **Future Proof**: Built on industry-standard structured logging

**Recommended Next Steps:**
1. Approve migration plan and breaking change approach
2. Begin Phase 1 implementation with clean Pino integration
3. Coordinate with alpha users on migration timeline
4. Update all internal usage to new API patterns
5. Document new logging patterns in examples and docs

This migration will position ADK as a production-ready agent framework with enterprise-grade logging capabilities, taking advantage of being in alpha to build the optimal solution without legacy constraints.

### Alpha-Friendly Migration Approach

Since ADK is in alpha with a small user base, we can take a much more aggressive and cleaner approach:

#### Breaking Changes Are Acceptable
- **Clean Slate Design**: Build the optimal API without legacy constraints
- **Modern Patterns**: Use structured logging as the primary paradigm
- **Agent-First Design**: Built-in patterns for agent lifecycle, LLM calls, and tool execution
- **Performance Optimized**: No compatibility layers slowing things down

#### Migration for Alpha Users
Alpha users will need to update their logging calls, but they'll get significant value in return:

**Old Pattern:**
```typescript
const logger = new Logger({ name: "MyAgent" });
logger.debug("Agent started");
logger.debugStructured("LLM Request", requestData);
```

**New Pattern:**
```typescript
const logger = new Logger({ name: "MyAgent" });
const agentLogger = logger.agent("MyAgent");
const llmLogger = logger.llm("gemini-2.5-flash");

agentLogger.started();
llmLogger.request(requestData);      // Automatically includes model in log
llmLogger.response(llmResponse, 1200); // Automatically includes model + duration
llmLogger.toolCall("calculator", { x: 5, y: 10 }); // Model context + tool info
```

#### Benefits of Breaking Changes
- **Better Performance**: No wrapper overhead
- **Cleaner API**: Purpose-built for agent frameworks
- **Rich Context**: Built-in correlation and structured data
- **Production Ready**: Enterprise logging features from day one

#### Explanation: Context-Aware Logger Factories

The `logger.llm()`, `logger.agent()`, and `logger.session()` methods are **factory methods** that create specialized loggers with built-in context. Here's how they work:

**What `logger.llm("gemini-2.5-flash")` does:**
1. Creates a child Pino logger with `{ llm: { model: "gemini-2.5-flash" } }` context
2. Returns an `LLMLogger` instance with specialized methods for LLM operations
3. All logs from this logger automatically include the model information

**Usage Example:**
```typescript
// In your LLM flow or agent
const logger = new Logger({ name: "BaseLlmFlow" });
const llmLogger = logger.llm("gemini-2.5-flash");

// Instead of manually adding context every time:
logger.debug({ model: "gemini-2.5-flash", messages: 5 }, "LLM request");
logger.debug({ model: "gemini-2.5-flash", duration: 1200 }, "LLM response");

// You use the specialized methods that automatically include context:
llmLogger.request(llmRequest);      // Automatically includes model in log
llmLogger.response(llmResponse, 1200); // Automatically includes model + duration
llmLogger.toolCall("calculator", { x: 5, y: 10 }); // Model context + tool info
```

**What gets logged:**
```json
{
  "level": "debug",
  "time": "2025-08-05T10:30:00.000Z",
  "llm": { "model": "gemini-2.5-flash" },
  "model": "gemini-2.5-flash",
  "messages": 5,
  "tools": 3,
  "stream": true,
  "msg": "LLM request"
}
```

**Benefits:**
- **Automatic Context**: No need to manually add model info to every log
- **Specialized Methods**: Purpose-built methods for common LLM operations
- **Correlation**: All LLM logs from the same instance are correlated
- **Type Safety**: TypeScript knows what fields are available
- **Performance**: Child loggers are optimized in Pino

**Real-world Usage in ADK:**
```typescript
// In BaseLlmFlow.ts
export class BaseLlmFlow {
  private logger = new Logger({ name: "BaseLlmFlow" });
  
  async *runAsync(invocationContext: InvocationContext): AsyncGenerator<Event> {
    const agentLogger = this.logger.agent(invocationContext.agent.name);
    const llmLogger = this.logger.llm(invocationContext.agent.model);
    
    agentLogger.started({ invocationId: invocationContext.invocationId });
    
    // LLM request
    const request = this.buildLlmRequest(invocationContext);
    llmLogger.request(request);
    
    const startTime = Date.now();
    const response = await this.callLlm(request);
    const duration = Date.now() - startTime;
    
    llmLogger.response(response, duration);
    
    // Tool calls
    if (response.functionCalls) {
      for (const toolCall of response.functionCalls) {
        llmLogger.toolCall(toolCall.name, toolCall.args);
        
        const toolResult = await this.executeTool(toolCall);
        llmLogger.toolResult(toolCall.name, toolResult, toolDuration);
      }
    }
    
    agentLogger.completed(Date.now() - startTime);
  }
}
```

This gives you rich, structured logs with automatic correlation without having to manually manage context in every log call.
