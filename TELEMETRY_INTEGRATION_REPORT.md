# Telemetry Integration Report: ADK-JS

**Date:** December 30, 2025  
**Framework:** Agent Development Kit (ADK) for JavaScript  
**Version:** 0.2.1

---

## Executive Summary

This document provides a comprehensive, crystal-clear guide to how OpenTelemetry-based telemetry is integrated into the ADK-JS framework. If all telemetry code were removed, this report would serve as the complete blueprint to rebuild it from scratch.

The telemetry system follows OpenTelemetry (OTel) standards and provides distributed tracing, metrics, and logging capabilities with both generic OTLP exporters and Google Cloud-specific exporters.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Dependencies](#core-dependencies)
3. [File Structure](#file-structure)
4. [Telemetry Components](#telemetry-components)
5. [Integration Points](#integration-points)
6. [Configuration & Initialization](#configuration--initialization)
7. [Semantic Conventions](#semantic-conventions)
8. [Environment Variables](#environment-variables)
9. [Implementation Status](#implementation-status)
10. [Complete Rebuild Guide](#complete-rebuild-guide)

---

## Architecture Overview

### High-Level Design

The telemetry system is built on three layers:

1. **Setup Layer** (`telemetry/setup.ts`) - Provider initialization and OTLP exporters
2. **Cloud Layer** (`telemetry/google_cloud.ts`) - Google Cloud-specific exporters
3. **Instrumentation Layer** (`telemetry/tracing.ts`) - Application-level tracing utilities

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Code                          │
│         (Agents, Tools, LLM Connections)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├──► tracing.ts (Instrumentation)
                     │    - traceAgentInvocation()
                     │    - traceToolCall()
                     │    - traceCallLlm()
                     │    - traceSendData()
                     │
┌────────────────────┴────────────────────────────────────────┐
│                   OpenTelemetry SDK                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Tracer       │  │ Meter        │  │ Logger       │     │
│  │ Provider     │  │ Provider     │  │ Provider     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐     │
│  │ Span         │  │ Metric       │  │ Log Record   │     │
│  │ Processors   │  │ Readers      │  │ Processors   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ├──────────────────┴──────────────────┤
          │                                     │
┌─────────▼─────────┐           ┌──────────────▼─────────────┐
│ OTLP Exporters    │           │ Google Cloud Exporters     │
│ (setup.ts)        │           │ (google_cloud.ts)          │
│                   │           │                            │
│ - Traces          │           │ - Cloud Trace Exporter     │
│ - Metrics         │           │ - Cloud Monitoring Export  │
│ - Logs            │           │                            │
└───────────────────┘           └────────────────────────────┘
```

---

## Core Dependencies

### Required Packages (Peer Dependencies)

All OpenTelemetry dependencies are peer dependencies, meaning consumers must install them explicitly:

```json
{
  "@opentelemetry/api": "1.9.0",
  "@opentelemetry/api-logs": "^0.205.0",
  "@opentelemetry/resources": "^2.1.0",
  "@opentelemetry/sdk-trace-base": "^2.1.0",
  "@opentelemetry/sdk-trace-node": "^2.1.0",
  "@opentelemetry/sdk-metrics": "^2.1.0",
  "@opentelemetry/sdk-logs": "^0.205.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.205.0",
  "@opentelemetry/exporter-metrics-otlp-http": "^0.205.0",
  "@opentelemetry/exporter-logs-otlp-http": "^0.205.0",
  "@google-cloud/opentelemetry-cloud-trace-exporter": "^3.0.0",
  "@google-cloud/opentelemetry-cloud-monitoring-exporter": "^0.21.0",
  "@opentelemetry/resource-detector-gcp": "^0.40.0"
}
```

### Import Statement Pattern

```typescript
// From @opentelemetry/api (core API, never changes)
import {trace, context, Context} from '@opentelemetry/api';
import {logs} from '@opentelemetry/api-logs';
import {metrics} from '@opentelemetry/api';

// From SDK packages (implementation details)
import {NodeTracerProvider} from '@opentelemetry/sdk-trace-node';
import {LoggerProvider, BatchLogRecordProcessor} from '@opentelemetry/sdk-logs';
import {MeterProvider, PeriodicExportingMetricReader} from '@opentelemetry/sdk-metrics';
import {detectResources, Resource} from '@opentelemetry/resources';
import {BatchSpanProcessor, SpanProcessor} from '@opentelemetry/sdk-trace-base';

// From exporters
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {OTLPMetricExporter} from '@opentelemetry/exporter-metrics-otlp-http';
import {OTLPLogExporter} from '@opentelemetry/exporter-logs-otlp-http';
import {TraceExporter} from '@google-cloud/opentelemetry-cloud-trace-exporter';
import {MetricExporter} from '@google-cloud/opentelemetry-cloud-monitoring-exporter';
import {gcpDetector} from '@opentelemetry/resource-detector-gcp';
```

---

## File Structure

### Telemetry Module Files

```
core/src/telemetry/
├── setup.ts           # Generic OTel provider setup with OTLP exporters
├── google_cloud.ts    # Google Cloud-specific exporters (Trace & Monitoring)
└── tracing.ts         # Instrumentation helpers for agents, tools, and LLMs

core/test/telemetry/
├── google_cloud_test.ts
└── tracing_test.ts
```

### Exported from Core Package

From `core/src/index.ts`:
```typescript
export * from './telemetry/setup.js';
export * from './telemetry/google_cloud.js';
// Note: tracing.ts is NOT exported - it's internal only
```

---

## Telemetry Components

### 1. Setup Module (`telemetry/setup.ts`)

**Purpose:** Initialize OpenTelemetry providers with OTLP exporters.

#### Key Interfaces

```typescript
export interface OtelExportersConfig {
  enableTracing?: boolean;
  enableMetrics?: boolean;
  enableLogging?: boolean;
}

export interface OTelHooks {
  spanProcessors?: SpanProcessor[];
  metricReaders?: MetricReader[];
  logRecordProcessors?: LogRecordProcessor[];
}
```

#### Main Function: `maybeSetOtelProviders()`

**Signature:**
```typescript
export function maybeSetOtelProviders(
  otelHooksToSetup: OTelHooks[] = [],
  otelResource?: Resource
): void
```

**Purpose:** Sets up OpenTelemetry providers conditionally based on provided hooks.

**Behavior:**
1. Takes an array of `OTelHooks` objects
2. Automatically adds OTLP exporters based on environment variables
3. Aggregates all span processors, metric readers, and log processors
4. Only creates providers if there are hooks for that telemetry type
5. Sets global providers using `trace.setGlobalTracerProvider()`, etc.

**Implementation Details:**

```typescript
export function maybeSetOtelProviders(
  otelHooksToSetup: OTelHooks[] = [],
  otelResource?: Resource
): void {
  // Get resource (default detection or provided)
  const resource = otelResource || getOtelResource();
  
  // Combine user hooks with auto-detected OTLP exporters
  const allHooks = [...otelHooksToSetup, getOtelExporters()];
  
  // Flatten all hooks
  const spanProcessors = allHooks.flatMap(hooks => hooks.spanProcessors || []);
  const metricReaders = allHooks.flatMap(hooks => hooks.metricReaders || []);
  const logRecordProcessors = allHooks.flatMap(hooks => hooks.logRecordProcessors || []);

  // Only set up providers if there are processors/readers
  if (spanProcessors.length > 0) {
    const tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors
    });
    tracerProvider.register();
    trace.setGlobalTracerProvider(tracerProvider);
  }

  if (metricReaders.length > 0) {
    const meterProvider = new MeterProvider({
      readers: metricReaders,
      resource,
    });
    metrics.setGlobalMeterProvider(meterProvider);
  }

  if (logRecordProcessors.length > 0) {
    const loggerProvider = new LoggerProvider({
      resource,
      processors: logRecordProcessors,
    });
    logs.setGlobalLoggerProvider(loggerProvider);
  }
}
```

#### OTLP Exporter Auto-Detection

**Function:** `getOtelExporters()`

Checks environment variables and creates OTLP exporters:

```typescript
function getOtelExportersConfig(): OtelExportersConfig {
  return {
    enableTracing: !!(
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
    ),
    enableMetrics: !!(
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
    ),
    enableLogging: !!(
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
    ),
  };
}

function getOtelExporters(config = getOtelExportersConfig()): OTelHooks {
  const { enableTracing, enableMetrics, enableLogging } = config;
  return {
    spanProcessors: enableTracing 
      ? [new BatchSpanProcessor(new OTLPTraceExporter())] 
      : [],
    metricReaders: enableMetrics 
      ? [new PeriodicExportingMetricReader({ 
          exporter: new OTLPMetricExporter() 
        })] 
      : [],
    logRecordProcessors: enableLogging 
      ? [new BatchLogRecordProcessor(new OTLPLogExporter())] 
      : [],
  };
}
```

#### Resource Detection

```typescript
function getOtelResource(): Resource {
  return detectResources({
    detectors: [], // Empty array - relies on default env var detection
  });
}
```

This detects resources from environment variables like:
- `OTEL_SERVICE_NAME`
- `OTEL_RESOURCE_ATTRIBUTES`

---

### 2. Google Cloud Module (`telemetry/google_cloud.ts`)

**Purpose:** Provide Google Cloud-specific exporters for Cloud Trace and Cloud Monitoring.

#### Main Functions

##### `getGcpExporters()`

**Signature:**
```typescript
export async function getGcpExporters(
  config: OtelExportersConfig = {}
): Promise<OTelHooks>
```

**Implementation:**

```typescript
export async function getGcpExporters(
  config: OtelExportersConfig = {}
): Promise<OTelHooks> {
  const {
    enableTracing = false,
    enableMetrics = false,
    // enableCloudLogging = false, // Not yet implemented
  } = config;

  // Get GCP project ID using Application Default Credentials
  const projectId = await getGcpProjectId();
  if (!projectId) {
    logger.warn(
      'Cannot determine GCP Project. OTel GCP Exporters cannot be set up. ' +
      'Please make sure to log into correct GCP Project.'
    );
    return {};
  }

  return {
    spanProcessors: enableTracing ? [
      new BatchSpanProcessor(new TraceExporter({ projectId })),
    ] : [],
    metricReaders: enableMetrics ? [
      new PeriodicExportingMetricReader({
        exporter: new MetricExporter({ projectId }),
        exportIntervalMillis: 5000,
      }),
    ] : [],
    logRecordProcessors: [], // Cloud Logging not yet implemented
  };
}
```

##### `getGcpProjectId()`

**Implementation:**

```typescript
import {GoogleAuth} from 'google-auth-library';

async function getGcpProjectId(): Promise<string | undefined> {
  try {
    const auth = new GoogleAuth();
    const projectId = await auth.getProjectId();
    return projectId || undefined;
  } catch (error) {
    return undefined;
  }
}
```

Uses Application Default Credentials to detect GCP project.

##### `getGcpResource()`

**Signature:**
```typescript
export function getGcpResource(): Resource
```

**Implementation:**

```typescript
import {gcpDetector} from '@opentelemetry/resource-detector-gcp';

export function getGcpResource(): Resource {
  return detectResources({ detectors: [gcpDetector] });
}
```

Detects GCP-specific resource attributes like:
- `cloud.provider` = "gcp"
- `cloud.platform` = "gcp_compute_engine" / "gcp_cloud_run" / etc.
- `cloud.region`
- `cloud.availability_zone`
- `host.id` (instance ID)

---

### 3. Tracing Module (`telemetry/tracing.ts`)

**Purpose:** Provide instrumentation helpers for recording ADK-specific span attributes.

**Important:** This module is **NOT exported** from the package - it's internal only.

#### Global Tracer Instance

```typescript
import {trace} from '@opentelemetry/api';
import {version} from '../version.js';

export const tracer = trace.getTracer(
  'gcp.vertex.agent',
  version,
);
```

#### Semantic Convention Constants

```typescript
const GEN_AI_AGENT_DESCRIPTION = 'gen_ai.agent.description';
const GEN_AI_AGENT_NAME = 'gen_ai.agent.name';
const GEN_AI_CONVERSATION_ID = 'gen_ai.conversation.id';
const GEN_AI_OPERATION_NAME = 'gen_ai.operation.name';
const GEN_AI_TOOL_CALL_ID = 'gen_ai.tool.call.id';
const GEN_AI_TOOL_DESCRIPTION = 'gen_ai.tool.description';
const GEN_AI_TOOL_NAME = 'gen_ai.tool.name';
const GEN_AI_TOOL_TYPE = 'gen_ai.tool.type';
```

#### Tracing Functions

##### `traceAgentInvocation()`

**Purpose:** Record agent invocation metadata on the current span.

**Signature:**
```typescript
export interface TraceAgentInvocationParams {
  agent: BaseAgent;
  invocationContext: InvocationContext;
}

export function traceAgentInvocation({
  agent,
  invocationContext,
}: TraceAgentInvocationParams): void
```

**Implementation:**

```typescript
export function traceAgentInvocation({
  agent,
  invocationContext,
}: TraceAgentInvocationParams): void {
  const span = trace.getActiveSpan();
  if (!span) return;
  
  span.setAttributes({
    [GEN_AI_OPERATION_NAME]: 'invoke_agent',
    [GEN_AI_AGENT_DESCRIPTION]: agent.description,
    [GEN_AI_AGENT_NAME]: agent.name,
    [GEN_AI_CONVERSATION_ID]: invocationContext.session.id,
  });
}
```

**Attributes Set:**
- `gen_ai.operation.name` = "invoke_agent"
- `gen_ai.agent.description` = agent description
- `gen_ai.agent.name` = agent name
- `gen_ai.conversation.id` = session ID

**Notes:**
- Based on [OpenTelemetry GenAI Semantic Conventions v1.37](https://github.com/open-telemetry/semantic-conventions)
- `gen_ai.agent.id` is NOT set due to unclear uniqueness scope requirements
- `gen_ai.data_source.id` is NOT set as it's not available in the data structures
- Inference-related fields removed per [issue #2632](https://github.com/open-telemetry/semantic-conventions/issues/2632)

##### `traceToolCall()`

**Purpose:** Record tool execution metadata.

**Signature:**
```typescript
export interface TraceToolCallParams {
  tool: BaseTool;
  args: Record<string, unknown>;
  functionResponseEvent: Event;
}

export function traceToolCall({
  tool,
  args,
  functionResponseEvent,
}: TraceToolCallParams): void
```

**Implementation:**

```typescript
export function traceToolCall({
  tool,
  args,
  functionResponseEvent,
}: TraceToolCallParams): void {
  const span = trace.getActiveSpan();
  if (!span) return;
  
  span.setAttributes({
    [GEN_AI_OPERATION_NAME]: 'execute_tool',
    [GEN_AI_TOOL_DESCRIPTION]: tool.description || '',
    [GEN_AI_TOOL_NAME]: tool.name,
    [GEN_AI_TOOL_TYPE]: tool.constructor.name,
    'gcp.vertex.agent.llm_request': '{}',
    'gcp.vertex.agent.llm_response': '{}',
    'gcp.vertex.agent.tool_call_args': shouldAddRequestResponseToSpans() 
      ? safeJsonSerialize(args)
      : '{}'
  });

  // Extract tool response
  let toolCallId = '<not specified>';
  let toolResponse: unknown = '<not specified>';
  
  if (functionResponseEvent.content?.parts) {
    const responseParts = functionResponseEvent.content.parts;
    const functionResponse = responseParts[0]?.functionResponse;
    if (functionResponse?.id) {
      toolCallId = functionResponse.id;
    }
    if (functionResponse?.response) {
      toolResponse = functionResponse.response;
    }
  }
  if (typeof toolResponse !== 'object' || toolResponse === null) {
    toolResponse = { result: toolResponse };
  }

  span.setAttributes({
    [GEN_AI_TOOL_CALL_ID]: toolCallId,
    'gcp.vertex.agent.event_id': functionResponseEvent.id,
    'gcp.vertex.agent.tool_response': shouldAddRequestResponseToSpans()
      ? safeJsonSerialize(toolResponse)
      : '{}'
  });
}
```

**Attributes Set:**
- `gen_ai.operation.name` = "execute_tool"
- `gen_ai.tool.description`
- `gen_ai.tool.name`
- `gen_ai.tool.type` (class name, e.g., "FunctionTool")
- `gen_ai.tool.call.id`
- `gcp.vertex.agent.event_id`
- `gcp.vertex.agent.tool_call_args` (JSON, if enabled)
- `gcp.vertex.agent.tool_response` (JSON, if enabled)
- `gcp.vertex.agent.llm_request` = "{}" (empty, for UI compatibility)
- `gcp.vertex.agent.llm_response` = "{}" (empty, for UI compatibility)

##### `traceMergedToolCalls()`

**Purpose:** Record metadata for merged tool calls (used for batched tool executions).

**Signature:**
```typescript
export interface TraceMergedToolCallsParams {
  responseEventId: string;
  functionResponseEvent: Event;
}

export function traceMergedToolCalls({
  responseEventId,
  functionResponseEvent,
}: TraceMergedToolCallsParams): void
```

**Implementation:**

```typescript
export function traceMergedToolCalls({
  responseEventId,
  functionResponseEvent,
}: TraceMergedToolCallsParams): void {
  const span = trace.getActiveSpan();
  if (!span) return;

  span.setAttributes({
    [GEN_AI_OPERATION_NAME]: 'execute_tool',
    [GEN_AI_TOOL_NAME]: '(merged tools)',
    [GEN_AI_TOOL_DESCRIPTION]: '(merged tools)',
    [GEN_AI_TOOL_CALL_ID]: responseEventId,
    'gcp.vertex.agent.tool_call_args': 'N/A',
    'gcp.vertex.agent.event_id': responseEventId,
    'gcp.vertex.agent.llm_request': '{}',
    'gcp.vertex.agent.llm_response': '{}',
  });

  span.setAttribute(
    'gcp.vertex.agent.tool_response', 
    shouldAddRequestResponseToSpans()
      ? safeJsonSerialize(functionResponseEvent)
      : '{}'
  );
}
```

**Note:** This is used to prevent `/debug/trace` request failures in web UI when multiple tools are called together.

##### `traceCallLlm()`

**Purpose:** Record LLM request/response metadata.

**Signature:**
```typescript
export interface TraceCallLlmParams {
  invocationContext: InvocationContext;
  eventId: string;
  llmRequest: LlmRequest;
  llmResponse: LlmResponse;
}

export function traceCallLlm({
  invocationContext,
  eventId,
  llmRequest,
  llmResponse,
}: TraceCallLlmParams): void
```

**Implementation:**

```typescript
export function traceCallLlm({
  invocationContext,
  eventId,
  llmRequest,
  llmResponse,
}: TraceCallLlmParams): void {
  const span = trace.getActiveSpan();
  if (!span) return;
  
  span.setAttributes({
    'gen_ai.system': 'gcp.vertex.agent',
    'gen_ai.request.model': llmRequest.model,
    'gcp.vertex.agent.invocation_id': invocationContext.invocationId,
    'gcp.vertex.agent.session_id': invocationContext.session.id,
    'gcp.vertex.agent.event_id': eventId,
    'gcp.vertex.agent.llm_request': shouldAddRequestResponseToSpans()
      ? safeJsonSerialize(buildLlmRequestForTrace(llmRequest))
      : '{}',
  });

  // Optional config attributes
  if (llmRequest.config?.topP) {
    span.setAttribute('gen_ai.request.top_p', llmRequest.config.topP);
  }

  if (llmRequest.config?.maxOutputTokens !== undefined) {
    span.setAttribute('gen_ai.request.max_tokens', llmRequest.config.maxOutputTokens);
  }

  span.setAttribute(
    'gcp.vertex.agent.llm_response', 
    shouldAddRequestResponseToSpans()
      ? safeJsonSerialize(llmResponse)
      : '{}'
  );

  // Usage metadata
  if (llmResponse.usageMetadata) {
    span.setAttribute(
      'gen_ai.usage.input_tokens', 
      llmResponse.usageMetadata.promptTokenCount || 0
    );
  }
  
  if (llmResponse.usageMetadata?.candidatesTokenCount) {
    span.setAttribute(
      'gen_ai.usage.output_tokens', 
      llmResponse.usageMetadata.candidatesTokenCount
    );
  }

  // Finish reason
  if (llmResponse.finishReason) {
    const finishReasonValue = typeof llmResponse.finishReason === 'string' 
      ? llmResponse.finishReason.toLowerCase()
      : String(llmResponse.finishReason).toLowerCase();
    span.setAttribute('gen_ai.response.finish_reasons', [finishReasonValue]);
  }
}
```

**Attributes Set:**
- `gen_ai.system` = "gcp.vertex.agent"
- `gen_ai.request.model` (model name)
- `gen_ai.request.top_p` (if set)
- `gen_ai.request.max_tokens` (if set)
- `gen_ai.usage.input_tokens`
- `gen_ai.usage.output_tokens`
- `gen_ai.response.finish_reasons` (array)
- `gcp.vertex.agent.invocation_id`
- `gcp.vertex.agent.session_id`
- `gcp.vertex.agent.event_id`
- `gcp.vertex.agent.llm_request` (JSON, if enabled)
- `gcp.vertex.agent.llm_response` (JSON, if enabled)

**Helper:** `buildLlmRequestForTrace()`

```typescript
function buildLlmRequestForTrace(llmRequest: LlmRequest): Record<string, unknown> {
  const result: Record<string, unknown> = {
    model: llmRequest.model,
    contents: [],
  };

  if (llmRequest.config) {
    // Prune responseSchema to reduce noise
    const { responseSchema, ...cleanConfig } = llmRequest.config;
    result.config = cleanConfig;
  }

  // Filter out bytes data
  result.contents = llmRequest.contents.map(content => ({
    role: content.role,
    parts: content.parts?.filter(part => !part.inlineData) || [],
  }));

  return result;
}
```

##### `traceSendData()`

**Purpose:** Record when data is sent to the agent.

**Signature:**
```typescript
export interface TraceSendDataParams {
  invocationContext: InvocationContext;
  eventId: string;
  data: Content[];
}

export function traceSendData({
  invocationContext,
  eventId,
  data,
}: TraceSendDataParams): void
```

**Implementation:**

```typescript
export function traceSendData({
  invocationContext,
  eventId,
  data,
}: TraceSendDataParams): void {
  const span = trace.getActiveSpan();
  if (!span) return;
  
  span.setAttributes({
    'gcp.vertex.agent.invocation_id': invocationContext.invocationId,
    'gcp.vertex.agent.event_id': eventId,
  });

  span.setAttribute(
    'gcp.vertex.agent.data', 
    shouldAddRequestResponseToSpans()
      ? safeJsonSerialize(data)
      : '{}'
  );
}
```

#### Utility Functions

##### `safeJsonSerialize()`

```typescript
function safeJsonSerialize(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return '<not serializable>';
  }
}
```

##### `shouldAddRequestResponseToSpans()`

```typescript
function shouldAddRequestResponseToSpans(): boolean {
  const envValue = process.env.ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS || 'true';
  return envValue === 'true' || envValue === '1';
}
```

**Environment Variable:** `ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS`
- Default: `true`
- Set to `'false'` or `'0'` to exclude request/response content from spans
- Used to comply with privacy/security requirements

##### `bindAsyncGenerator()`

**Purpose:** Bind async generators to OpenTelemetry context for trace propagation.

**Signature:**
```typescript
export function bindAsyncGenerator<T = unknown, TReturn = any, TNext = unknown>(
  ctx: Context,
  generator: AsyncGenerator<T, TReturn, TNext>,
): AsyncGenerator<T, TReturn, TNext>
```

**Implementation:**

```typescript
export function bindAsyncGenerator<T = unknown, TReturn = any, TNext = unknown>(
  ctx: Context,
  generator: AsyncGenerator<T, TReturn, TNext>,
): AsyncGenerator<T, TReturn, TNext> {
  return {
    next: context.bind(ctx, generator.next.bind(generator)),
    return: context.bind(ctx, generator.return.bind(generator)),
    throw: context.bind(ctx, generator.throw.bind(generator)),
    [Symbol.asyncIterator]() {
      return bindAsyncGenerator(ctx, generator[Symbol.asyncIterator]());
    },
  };
}
```

**Why Needed:** Async generators in JavaScript don't automatically propagate context. This ensures spans created inside async generator callbacks are properly nested.

---

## Integration Points

### 1. Agent Execution (`agents/base_agent.ts`)

**Location:** `BaseAgent.runAsync()` and `BaseAgent.runLive()`

**Integration Pattern:**

```typescript
import {trace} from '@opentelemetry/api';

async *runAsync(parentContext: InvocationContext): AsyncGenerator<Event, void, void> {
  const span = trace.getTracer('gcp.vertex.agent')
                   .startSpan(`agent_run [${this.name}]`);
  try {
    const context = this.createInvocationContext(parentContext);

    const beforeAgentCallbackEvent =
        await this.handleBeforeAgentCallback(context);
    if (beforeAgentCallbackEvent) {
      yield beforeAgentCallbackEvent;
    }

    if (context.endInvocation) {
      return;
    }

    for await (const event of this.runAsyncImpl(context)) {
      yield event;
    }

    if (context.endInvocation) {
      return;
    }

    const afterAgentCallbackEvent =
        await this.handleAfterAgentCallback(context);
    if (afterAgentCallbackEvent) {
      yield afterAgentCallbackEvent;
    }
  } finally {
    span.end();
  }
}
```

**Span Created:**
- Name: `agent_run [<agent-name>]`
- Duration: Entire agent execution
- Parent: Previous agent in call stack (if any)

**Status:** ✅ **IMPLEMENTED**

### 2. LLM Agent (`agents/llm_agent.ts`)

**Integration:** Label injection for billing reports

```typescript
const ADK_AGENT_NAME_LABEL_KEY = 'adk_agent_name';

// In callLlmAsync() method:
llmRequest.config ??= {};
llmRequest.config.labels ??= {};

if (!llmRequest.config.labels[ADK_AGENT_NAME_LABEL_KEY]) {
  llmRequest.config.labels[ADK_AGENT_NAME_LABEL_KEY] = this.name;
}
```

**Purpose:** Add agent name as a label to LLM requests for billing segmentation.

**Note:** Actual call to `traceCallLlm()` is marked as TODO:
```typescript
// TODO - b/436079721: Add tracer.start_as_current_span('call_llm')
// TODO - b/436079721: Add trace_call_llm
```

**Status:** ⏳ **PARTIALLY IMPLEMENTED** (labels yes, tracing no)

### 3. Tool Execution (`agents/functions.ts`)

**Status:** ❌ **NOT IMPLEMENTED**

Multiple TODOs exist:

```typescript
// Line 7
// TODO - b/436079721: implement traceMergedToolCalls, traceToolCall, tracer.

// Line 194
// TODO - b/436079721: implement [tracer.start_as_current_span]

// Line 284
// TODO - b/436079721: implement [tracer.start_as_current_span]

// Line 412
// TODO - b/436079721: implement [traceToolCall]
logger.debug('traceToolCall', {...});

// Line 428
// TODO - b/436079721: implement [tracer.start_as_current_span]

// Line 430
// TODO - b/436079721: implement [traceMergedToolCalls]
logger.debug('traceMergedToolCalls', {...});
```

**Expected Integration Pattern (not yet implemented):**

```typescript
import {tracer} from '../telemetry/tracing.js';
import {traceToolCall, traceMergedToolCalls} from '../telemetry/tracing.js';

// In tool execution:
tracer.startActiveSpan(`execute_tool [${tool.name}]`, async (span) => {
  try {
    // Execute tool
    const result = await tool.call(args, context);
    
    // Record telemetry
    traceToolCall({
      tool,
      args,
      functionResponseEvent,
    });
    
    return result;
  } finally {
    span.end();
  }
});
```

### 4. Plugins (`plugins/`)

**Status:** ❌ **NO TELEMETRY INTEGRATION**

Plugins do not currently have any telemetry integration.

**Potential Integration:** Plugins could add their own span processors via hooks.

### 5. Tools (`tools/`)

**Status:** ❌ **NO TELEMETRY INTEGRATION**

Individual tool implementations don't directly integrate with telemetry. Tracing happens at the framework level in `functions.ts` (when implemented).

---

## Configuration & Initialization

### Usage Pattern

#### Option 1: Generic OTLP Exporters (Any Backend)

```typescript
import {maybeSetOtelProviders} from '@google/adk';

// Set environment variables
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
process.env.OTEL_SERVICE_NAME = 'my-agent-app';

// Initialize (will auto-detect OTLP exporters from env vars)
maybeSetOtelProviders();

// Now create and run agents
const agent = new LlmAgent({...});
```

#### Option 2: Google Cloud Exporters

```typescript
import {maybeSetOtelProviders, getGcpExporters, getGcpResource} from '@google/adk';

// Initialize with GCP exporters
const gcpHooks = await getGcpExporters({
  enableTracing: true,
  enableMetrics: true,
});

maybeSetOtelProviders(
  [gcpHooks],
  getGcpResource()
);

// Now create and run agents
const agent = new LlmAgent({...});
```

#### Option 3: Custom Exporters

```typescript
import {maybeSetOtelProviders} from '@google/adk';
import {BatchSpanProcessor} from '@opentelemetry/sdk-trace-base';
import {MyCustomExporter} from './my-custom-exporter';

const customHooks = {
  spanProcessors: [
    new BatchSpanProcessor(new MyCustomExporter())
  ],
  metricReaders: [],
  logRecordProcessors: [],
};

maybeSetOtelProviders([customHooks]);
```

#### Option 4: Multiple Exporters

```typescript
import {maybeSetOtelProviders, getGcpExporters} from '@google/adk';

// Set OTLP env var for Jaeger/etc
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

// Get GCP exporters
const gcpHooks = await getGcpExporters({ enableTracing: true });

// Both will be used!
maybeSetOtelProviders([gcpHooks]); // OTLP auto-added
```

### No Initialization

If `maybeSetOtelProviders()` is never called:
- Tracer/meter/logger calls become no-ops
- `trace.getActiveSpan()` returns `undefined`
- No data is exported
- **Application continues to work normally** (graceful degradation)

---

## Semantic Conventions

### OpenTelemetry GenAI Conventions (v1.37)

The implementation follows [OpenTelemetry GenAI Semantic Conventions](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/README.md).

#### Standard Attributes Used

**Agent Attributes:**
- `gen_ai.operation.name` - Type of operation (e.g., "invoke_agent", "execute_tool")
- `gen_ai.agent.name` - Agent identifier
- `gen_ai.agent.description` - Agent description
- `gen_ai.conversation.id` - Session/conversation ID

**Tool Attributes:**
- `gen_ai.tool.name` - Tool identifier
- `gen_ai.tool.description` - Tool description
- `gen_ai.tool.type` - Tool implementation class
- `gen_ai.tool.call.id` - Unique tool invocation ID

**LLM Request Attributes:**
- `gen_ai.system` - "gcp.vertex.agent"
- `gen_ai.request.model` - Model identifier
- `gen_ai.request.top_p` - Top-p sampling parameter
- `gen_ai.request.max_tokens` - Max output tokens

**LLM Response Attributes:**
- `gen_ai.response.finish_reasons` - Array of finish reasons
- `gen_ai.usage.input_tokens` - Prompt token count
- `gen_ai.usage.output_tokens` - Completion token count

#### Custom GCP/Vertex Attributes

**Namespace:** `gcp.vertex.agent.*`

- `gcp.vertex.agent.invocation_id` - Unique invocation identifier
- `gcp.vertex.agent.session_id` - Session identifier
- `gcp.vertex.agent.event_id` - Event identifier
- `gcp.vertex.agent.llm_request` - Full LLM request (JSON)
- `gcp.vertex.agent.llm_response` - Full LLM response (JSON)
- `gcp.vertex.agent.tool_call_args` - Tool arguments (JSON)
- `gcp.vertex.agent.tool_response` - Tool result (JSON)
- `gcp.vertex.agent.data` - Data sent to agent (JSON)

### Attribute Design Decisions

#### Not Implemented

**`gen_ai.agent.id`:** Unclear uniqueness scope
- Should it be globally unique?
- Per-project unique?
- Per-deployment unique?
- How to maintain across deployments?

**`gen_ai.data_source.id`:** Not available in data structures
- Closest type is `GroundingMetadata` which lacks ID

**`server.*` attributes:** Pending confirmation

**Inference fields:** Being removed per [semantic conventions issue #2632](https://github.com/open-telemetry/semantic-conventions/issues/2632)

---

## Environment Variables

### OpenTelemetry Standard Variables

#### Service Information
```bash
OTEL_SERVICE_NAME=my-agent-service
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.version=1.0.0
```

#### OTLP Exporter Configuration

**All Signals:**
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**Per-Signal:**
```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
```

**Headers (for authentication):**
```bash
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer YOUR_TOKEN
OTEL_EXPORTER_OTLP_TRACES_HEADERS=X-Custom-Header=value
```

### ADK-Specific Variables

#### `ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS`

**Purpose:** Control whether request/response content is included in spans.

**Values:**
- `"true"` or `"1"` - Include content (default)
- `"false"` or `"0"` - Exclude content (privacy mode)

**Usage:**
```bash
# Disable content capture for production
export ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS=false
```

**Affects:**
- `gcp.vertex.agent.llm_request`
- `gcp.vertex.agent.llm_response`
- `gcp.vertex.agent.tool_call_args`
- `gcp.vertex.agent.tool_response`
- `gcp.vertex.agent.data`

When disabled, these attributes are set to `"{}"` instead of the actual JSON content.

### Google Cloud Authentication

For `getGcpExporters()` to work:

**Option 1: Application Default Credentials**
```bash
gcloud auth application-default login
```

**Option 2: Service Account Key**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Option 3: Automatic (GCP Environment)**
- Runs on GCE, GKE, Cloud Run, Cloud Functions
- Credentials automatically provided

---

## Implementation Status

### ✅ Fully Implemented

1. **Setup Infrastructure**
   - `maybeSetOtelProviders()` - Provider initialization
   - OTLP exporter auto-detection
   - Resource detection

2. **Google Cloud Integration**
   - `getGcpExporters()` - Cloud Trace & Monitoring exporters
   - `getGcpResource()` - GCP resource detection
   - Project ID auto-detection

3. **Tracing Utilities**
   - `traceAgentInvocation()` - Agent metadata recording
   - `traceToolCall()` - Tool execution recording
   - `traceMergedToolCalls()` - Merged tool recording
   - `traceCallLlm()` - LLM request/response recording
   - `traceSendData()` - Data send recording
   - `bindAsyncGenerator()` - Context propagation

4. **Agent Integration**
   - `BaseAgent.runAsync()` - Span creation for agent execution
   - `BaseAgent.runLive()` - Span creation (not fully implemented yet)
   - Label injection in `LlmAgent` for billing

### ⏳ Partially Implemented

1. **LLM Agent Tracing**
   - ✅ Billing labels added
   - ❌ `traceCallLlm()` not called
   - ❌ No span created for LLM calls

### ❌ Not Implemented

1. **Tool Call Tracing** (`agents/functions.ts`)
   - 6 TODOs for `tracer.startActiveSpan()`
   - 2 TODOs for `traceToolCall()` and `traceMergedToolCalls()`
   - Currently only has debug logging

2. **Plugin Telemetry**
   - No telemetry integration in plugin system

3. **Individual Tool Telemetry**
   - No per-tool telemetry (expected to be handled by framework)

4. **Cloud Logging**
   - Not implemented in `getGcpExporters()`
   - `enableCloudLogging` option exists but unused

5. **Metrics**
   - No custom metrics defined
   - Infrastructure exists but no metrics recorded

6. **Live Mode Tracing**
   - `runLive()` has span but throws "not implemented"

---

## Complete Rebuild Guide

If all telemetry code were deleted, follow this guide to rebuild it from scratch.

### Step 1: Install Dependencies

Add to `package.json` peer dependencies:

```json
{
  "peerDependencies": {
    "@opentelemetry/api": "1.9.0",
    "@opentelemetry/api-logs": "^0.205.0",
    "@opentelemetry/resources": "^2.1.0",
    "@opentelemetry/sdk-trace-base": "^2.1.0",
    "@opentelemetry/sdk-trace-node": "^2.1.0",
    "@opentelemetry/sdk-metrics": "^2.1.0",
    "@opentelemetry/sdk-logs": "^0.205.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.205.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.205.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.205.0",
    "@google-cloud/opentelemetry-cloud-trace-exporter": "^3.0.0",
    "@google-cloud/opentelemetry-cloud-monitoring-exporter": "^0.21.0",
    "@opentelemetry/resource-detector-gcp": "^0.40.0"
  }
}
```

### Step 2: Create Directory Structure

```bash
mkdir -p core/src/telemetry
mkdir -p core/test/telemetry
```

### Step 3: Create `setup.ts`

Create `core/src/telemetry/setup.ts` with:

1. Import statements
2. Define `OtelExportersConfig` interface
3. Define `OTelHooks` interface
4. Implement `maybeSetOtelProviders()` function
5. Implement `getOtelResource()` helper
6. Implement `getOtelExportersConfig()` helper
7. Implement `getOtelExporters()` helper

**Full implementation:** See [Setup Module](#1-setup-module-telemetrysetupts) above.

### Step 4: Create `google_cloud.ts`

Create `core/src/telemetry/google_cloud.ts` with:

1. Import statements (including `google-auth-library`)
2. Implement `getGcpProjectId()` helper
3. Implement `getGcpExporters()` function
4. Implement `getGcpResource()` function

**Full implementation:** See [Google Cloud Module](#2-google-cloud-module-telemetrygoogle_cloudts) above.

### Step 5: Create `tracing.ts`

Create `core/src/telemetry/tracing.ts` with:

1. Import statements
2. Define semantic convention constants
3. Create global tracer instance
4. Implement `safeJsonSerialize()` helper
5. Implement `shouldAddRequestResponseToSpans()` helper
6. Implement `buildLlmRequestForTrace()` helper
7. Implement `traceAgentInvocation()` function
8. Implement `traceToolCall()` function
9. Implement `traceMergedToolCalls()` function
10. Implement `traceCallLlm()` function
11. Implement `traceSendData()` function
12. Implement `bindAsyncGenerator()` utility

**Full implementation:** See [Tracing Module](#3-tracing-module-telemetrytracingts) above.

**Important:** Do NOT export this module from `index.ts` - it's internal only.

### Step 6: Export Public API

Update `core/src/index.ts`:

```typescript
export * from './telemetry/setup.js';
export * from './telemetry/google_cloud.js';
// Note: tracing.ts is NOT exported
```

### Step 7: Integrate into BaseAgent

Modify `core/src/agents/base_agent.ts`:

1. Add import:
```typescript
import {trace} from '@opentelemetry/api';
```

2. Wrap `runAsync()` method:
```typescript
async *runAsync(parentContext: InvocationContext): AsyncGenerator<Event, void, void> {
  const span = trace.getTracer('gcp.vertex.agent')
                   .startSpan(`agent_run [${this.name}]`);
  try {
    // ... existing code ...
  } finally {
    span.end();
  }
}
```

3. Do the same for `runLive()` method.

### Step 8: Integrate into LlmAgent

Modify `core/src/agents/llm_agent.ts`:

1. Add constant:
```typescript
const ADK_AGENT_NAME_LABEL_KEY = 'adk_agent_name';
```

2. In `callLlmAsync()` method, add label injection:
```typescript
llmRequest.config ??= {};
llmRequest.config.labels ??= {};
if (!llmRequest.config.labels[ADK_AGENT_NAME_LABEL_KEY]) {
  llmRequest.config.labels[ADK_AGENT_NAME_LABEL_KEY] = this.name;
}
```

### Step 9: Integrate into Tool Execution

Modify `core/src/agents/functions.ts`:

1. Add imports:
```typescript
import {tracer, traceToolCall, traceMergedToolCalls} from '../telemetry/tracing.js';
```

2. Find tool execution points (search for TODOs)

3. Wrap with spans:
```typescript
await tracer.startActiveSpan(`execute_tool [${tool.name}]`, async (span) => {
  try {
    // Execute tool
    const result = await tool.call(args, context);
    
    // Record telemetry
    traceToolCall({tool, args, functionResponseEvent});
    
    return result;
  } finally {
    span.end();
  }
});
```

4. Do similar for merged tool calls.

### Step 10: Integrate LLM Call Tracing

Modify `core/src/agents/llm_agent.ts`:

Find the location where LLM responses are processed (around line 1753):

```typescript
await tracer.startActiveSpan('call_llm', async (span) => {
  try {
    for await (const llmResponse of this.runAndHandleError(...)) {
      // Record telemetry
      traceCallLlm({
        invocationContext,
        eventId: modelResponseEvent.id,
        llmRequest,
        llmResponse,
      });
      
      // ... rest of existing code ...
    }
  } finally {
    span.end();
  }
});
```

### Step 11: Create Tests

Create `core/test/telemetry/setup_test.ts`, `google_cloud_test.ts`, and `tracing_test.ts` following the patterns in existing test files.

### Step 12: Update Documentation

Create README or documentation explaining:
- How to initialize telemetry
- Environment variables
- How to use with different backends
- Privacy considerations

### Step 13: Test Integration

Create a sample application:

```typescript
import {
  maybeSetOtelProviders,
  getGcpExporters,
  getGcpResource,
  LlmAgent,
  Gemini,
} from '@google/adk';

async function main() {
  // Initialize telemetry
  const gcpHooks = await getGcpExporters({
    enableTracing: true,
    enableMetrics: true,
  });
  maybeSetOtelProviders([gcpHooks], getGcpResource());
  
  // Create and run agent
  const agent = new LlmAgent({
    name: 'test-agent',
    model: new Gemini({ model: 'gemini-2.0-flash-exp' }),
  });
  
  for await (const event of agent.runAsync(invocationContext)) {
    console.log(event);
  }
}

main();
```

Verify traces appear in:
- Google Cloud Trace (if using GCP exporters)
- Your OTLP backend (if using OTLP exporters)

---

## Advanced Topics

### Multi-Exporter Setup

You can send telemetry to multiple backends simultaneously:

```typescript
import {
  maybeSetOtelProviders,
  getGcpExporters,
} from '@google/adk';
import {BatchSpanProcessor} from '@opentelemetry/sdk-trace-base';
import {JaegerExporter} from '@opentelemetry/exporter-jaeger';

// GCP exporters
const gcpHooks = await getGcpExporters({ enableTracing: true });

// Jaeger exporter
const jaegerHooks = {
  spanProcessors: [
    new BatchSpanProcessor(
      new JaegerExporter({
        endpoint: 'http://localhost:14268/api/traces',
      })
    )
  ],
};

// Both will receive traces
maybeSetOtelProviders([gcpHooks, jaegerHooks]);
```

### Custom Span Processors

Add custom processing logic:

```typescript
import {SpanProcessor, Span, Context} from '@opentelemetry/sdk-trace-base';

class MyCustomProcessor implements SpanProcessor {
  onStart(span: Span, parentContext: Context): void {
    // Add custom attributes
    span.setAttribute('custom.attribute', 'value');
  }
  
  onEnd(span: Span): void {
    // Log span data
    console.log(`Span ended: ${span.name}`);
  }
  
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

maybeSetOtelProviders([
  {
    spanProcessors: [new MyCustomProcessor()],
  }
]);
```

### Context Propagation in Async Generators

The `bindAsyncGenerator()` utility is crucial for maintaining trace context:

```typescript
import {bindAsyncGenerator} from '../telemetry/tracing.js';
import {context} from '@opentelemetry/api';

async function* myGenerator() {
  yield 1;
  yield 2;
}

const ctx = context.active();
const boundGen = bindAsyncGenerator(ctx, myGenerator());

// Now spans created inside the generator will be properly nested
```

### Sampling

Configure sampling in the provider:

```typescript
import {TraceIdRatioBasedSampler} from '@opentelemetry/sdk-trace-base';

const tracerProvider = new NodeTracerProvider({
  resource,
  spanProcessors,
  sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10% of traces
});
```

### Span Links

Link related spans:

```typescript
const span = tracer.startSpan('my-span', {
  links: [
    {
      context: previousSpan.spanContext(),
      attributes: { 'link.type': 'follows_from' }
    }
  ]
});
```

---

## Testing Telemetry

### Unit Tests

Use mocks to verify telemetry calls:

```typescript
import {trace} from '@opentelemetry/api';
import {vi} from 'vitest';

vi.mock('@opentelemetry/api');

describe('My Component', () => {
  it('should create spans', () => {
    const mockSpan = {
      setAttributes: vi.fn(),
      end: vi.fn(),
    };
    
    vi.mocked(trace.getActiveSpan).mockReturnValue(mockSpan);
    
    // Run your code
    myFunction();
    
    // Verify
    expect(mockSpan.setAttributes).toHaveBeenCalledWith({
      'gen_ai.operation.name': 'invoke_agent',
    });
  });
});
```

### Integration Tests

Use in-memory exporters:

```typescript
import {InMemorySpanExporter} from '@opentelemetry/sdk-trace-base';
import {NodeTracerProvider} from '@opentelemetry/sdk-trace-node';
import {BatchSpanProcessor} from '@opentelemetry/sdk-trace-base';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new BatchSpanProcessor(exporter)],
});

provider.register();

// Run your code
await myAgentRun();

// Get captured spans
const spans = exporter.getFinishedSpans();
expect(spans).toHaveLength(3);
expect(spans[0].name).toBe('agent_run [test-agent]');
```

---

## Troubleshooting

### Spans Not Appearing

1. **Check initialization:**
   ```typescript
   maybeSetOtelProviders([...]); // Must be called before agent creation
   ```

2. **Check environment variables:**
   ```bash
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   ```

3. **Check logs:**
   ```typescript
   import {setLogLevel, LogLevel} from '@google/adk';
   setLogLevel(LogLevel.DEBUG);
   ```

### GCP Exporters Not Working

1. **Check authentication:**
   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Check project ID detection:**
   ```typescript
   const hooks = await getGcpExporters({enableTracing: true});
   console.log(hooks); // Should have spanProcessors
   ```

3. **Check API enablement:**
   - Cloud Trace API must be enabled
   - Cloud Monitoring API must be enabled

### Content Not in Spans

Check `ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS`:
```bash
export ADK_CAPTURE_MESSAGE_CONTENT_IN_SPANS=true
```

### Performance Impact

Telemetry adds minimal overhead:
- Spans are batched (default batch size: 512)
- Async export doesn't block
- Sampling can reduce volume

If experiencing issues:
1. Reduce batch size
2. Increase export interval
3. Enable sampling
4. Disable content capture

---

## Future Enhancements

### Planned (TODOs in Code)

1. **Tool Call Tracing** (b/436079721)
   - Complete implementation in `functions.ts`
   - Add span creation for all tool calls
   - Call `traceToolCall()` and `traceMergedToolCalls()`

2. **LLM Call Tracing** (b/436079721)
   - Add span creation in `llm_agent.ts`
   - Call `traceCallLlm()` for all LLM requests

3. **Live Mode** (b/425992518)
   - Implement `runLive()` properly
   - Add appropriate tracing

### Potential Additions

1. **Metrics:**
   - Agent invocation count
   - LLM call latency histogram
   - Tool call success/failure rates
   - Token usage metrics

2. **Logs:**
   - Structured logging integration
   - Log correlation with traces

3. **Plugin Telemetry:**
   - Allow plugins to add custom processors
   - Plugin-specific span attributes

4. **Error Recording:**
   - Span status for failures
   - Exception events

5. **Distributed Context:**
   - W3C Trace Context propagation
   - Baggage for cross-service metadata

---

## Summary

The ADK-JS telemetry system is a well-architected, standards-based implementation using OpenTelemetry. The core infrastructure is complete and functional, with:

✅ **Complete:**
- Provider setup with OTLP and GCP exporters
- Resource detection
- Instrumentation utilities
- Agent-level span creation
- Billing label injection

⏳ **Partially Complete:**
- LLM call tracing (utilities exist, not called)

❌ **Incomplete:**
- Tool call tracing (utilities exist, not called)
- Metrics recording
- Log integration
- Plugin telemetry

The system is designed for:
- **Flexibility:** Multiple exporters, custom processors
- **Privacy:** Content capture can be disabled
- **Standards:** OpenTelemetry GenAI semantic conventions
- **Performance:** Batching, async export, optional sampling
- **Reliability:** Graceful degradation if not initialized

This report provides everything needed to understand, maintain, extend, or completely rebuild the telemetry integration from scratch.

---

**End of Report**
