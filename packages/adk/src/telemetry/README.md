# ADK Telemetry System

Comprehensive OpenTelemetry integration for the Agent Development Kit (ADK), providing distributed tracing, metrics, and observability for AI agents, tools, and LLM interactions.

## Features

✨ **Distributed Tracing**

- Agent invocation tracing with lifecycle tracking
- Tool execution tracing with arguments and results
- LLM call tracing with token usage and model parameters
- Context propagation across async operations
- Standard OpenTelemetry GenAI semantic conventions

📊 **Metrics Collection**

- Agent invocation counters and duration histograms
- Tool execution counters and duration histograms
- LLM call counters and duration histograms
- Token usage tracking (input, output, total)
- Error counters with detailed context

🔒 **Privacy Controls**

- Environment variable to disable content capture
- Configurable via initialization options
- Sensitive data filtering

🌐 **Resource Auto-Detection**

- Service name and version from environment
- Deployment environment detection
- Process and host metadata
- Custom resource attributes

🎯 **Auto-Instrumentation**

- HTTP/HTTPS calls
- Database queries
- File system operations
- DNS lookups

## Quick Start

### Installation

The telemetry dependencies are already included in `@iqai/adk`:

```json
{
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/sdk-metrics": "^2.1.0",
  "@opentelemetry/exporter-metrics-otlp-http": "^0.205.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.205.0"
}
```

### Basic Initialization

```typescript
import { telemetryService } from "@iqai/adk";

await telemetryService.initialize({
  appName: "my-agent-app",
  appVersion: "1.0.0",
  otlpEndpoint: "http://localhost:4318/v1/traces",
  enableMetrics: true,
  enableTracing: true,
  enableAutoInstrumentation: true,
});
```

### Running with Jaeger (Local Development)

```bash
# Start Jaeger all-in-one (includes OTLP receiver)
docker run -d \
  --name jaeger \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# Your ADK app will send traces to http://localhost:4318/v1/traces
# View traces at http://localhost:16686
```

### Running with OpenTelemetry Collector

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  logging:
    loglevel: debug
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [logging, jaeger]
    metrics:
      receivers: [otlp]
      exporters: [logging]
```

```bash
# Run collector
docker run -d \
  -v $(pwd)/otel-collector-config.yaml:/etc/otel-collector-config.yaml \
  -p 4318:4318 \
  otel/opentelemetry-collector:latest \
  --config=/etc/otel-collector-config.yaml
```

## Configuration

### Full Configuration Options

```typescript
import { telemetryService, TelemetryConfig } from "@iqai/adk";

const config: TelemetryConfig = {
  // Required
  appName: "my-agent-app",
  otlpEndpoint: "http://localhost:4318/v1/traces",

  // Optional
  appVersion: "1.0.0",
  environment: "production", // or process.env.NODE_ENV

  // OTLP configuration
  otlpHeaders: {
    "api-key": "your-api-key",
  },

  // Feature flags
  enableTracing: true,
  enableMetrics: true,
  enableAutoInstrumentation: true,

  // Privacy controls
  captureMessageContent: true, // Set false for production

  // Performance tuning
  samplingRatio: 1.0, // 1.0 = 100% sampling
  metricExportIntervalMs: 60000, // 1 minute

  // Custom resource attributes
  resourceAttributes: {
    "deployment.name": "us-east-1",
    team: "platform",
  },
};

await telemetryService.initialize(config);
```

### Environment Variables

The telemetry system respects standard OpenTelemetry environment variables:

```bash
# Service identification
export OTEL_SERVICE_NAME=my-agent-app

# Resource attributes (comma-separated key=value pairs)
export OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,team=platform

# Privacy control (disable content capture)
export ADK_CAPTURE_MESSAGE_CONTENT=false

# Node environment
export NODE_ENV=production
```

## Privacy & Security

### Content Capture Control

By default, the telemetry system captures LLM request/response content for debugging. For production environments with sensitive data:

**Option 1: Environment Variable**

```bash
export ADK_CAPTURE_MESSAGE_CONTENT=false
```

**Option 2: Configuration**

```typescript
await telemetryService.initialize({
  appName: "my-app",
  otlpEndpoint: "http://localhost:4318/v1/traces",
  captureMessageContent: false, // Disable content capture
});
```

When disabled:

- Tool arguments and responses show as `{}`
- LLM prompts and completions show as `{}`
- Metadata (model, tokens, duration) still captured

## Traces

### What Gets Traced

#### Agent Invocations

```
agent_run [my-agent] #1
├─ Attributes:
│  ├─ gen_ai.system: iqai-adk
│  ├─ gen_ai.operation.name: invoke_agent
│  ├─ gen_ai.agent.name: my-agent
│  ├─ gen_ai.conversation.id: session-123
│  ├─ adk.session.id: session-123
│  ├─ adk.user.id: user-456
│  └─ adk.environment: production
└─ Duration: 2.5s
```

#### Tool Executions

```
execute_tool [search_web] #1
├─ Attributes:
│  ├─ gen_ai.system: iqai-adk
│  ├─ gen_ai.operation.name: execute_tool
│  ├─ gen_ai.tool.name: search_web
│  ├─ gen_ai.tool.type: SearchTool
│  ├─ adk.tool.args: {"query": "OpenTelemetry"}
│  └─ adk.tool.response: {"results": [...]}
└─ Duration: 450ms
```

Langfuse labels tool spans using `gen_ai.tool.name`, so the UI may show
`search_web #1` even though the span name is `execute_tool [search_web] #1`.

#### LLM Calls

```
llm_generate [gpt-4] #1
├─ Attributes:
│  ├─ gen_ai.system: iqai-adk
│  ├─ gen_ai.operation.name: chat
│  ├─ gen_ai.request.model: gpt-4
│  ├─ gen_ai.request.max_tokens: 1024
│  ├─ gen_ai.request.temperature: 0.7
│  ├─ gen_ai.usage.input_tokens: 150
│  ├─ gen_ai.usage.output_tokens: 75
│  └─ gen_ai.usage.total_tokens: 225
├─ Events:
│  ├─ gen_ai.content.prompt: [...]
│  └─ gen_ai.content.completion: [...]
└─ Duration: 1.8s
```

### Viewing Traces

#### Jaeger UI

1. Open http://localhost:16686
2. Select service: `my-agent-app`
3. Click "Find Traces"
4. Explore agent hierarchies, tool calls, and LLM interactions

#### Trace Hierarchy Example

```
agent_run [research-agent] #1 (5.2s)
├─ llm_generate [gpt-4] #1 (1.8s)
│  └─ HTTP POST to api.openai.com (1.7s) [auto-instrumented]
├─ execute_tool [search_web] #1 (450ms)
│  └─ HTTP GET to google.com (420ms) [auto-instrumented]
├─ execute_tool [summarize_text] #2 (320ms)
└─ llm_generate [gpt-4] #2 (1.5s)
   └─ HTTP POST to api.openai.com (1.4s) [auto-instrumented]
```

## Metrics

### Available Metrics

#### Counters

| Metric                  | Description             | Labels                                             |
| ----------------------- | ----------------------- | -------------------------------------------------- |
| `adk.agent.invocations` | Total agent invocations | `agent.name`, `environment`, `status`              |
| `adk.tool.executions`   | Total tool executions   | `tool.name`, `agent.name`, `environment`, `status` |
| `adk.llm.calls`         | Total LLM calls         | `model`, `agent.name`, `environment`, `status`     |
| `adk.errors`            | Total errors            | `error_type`, `context`                            |

#### Histograms

| Metric                  | Description                | Labels                                             | Unit  |
| ----------------------- | -------------------------- | -------------------------------------------------- | ----- |
| `adk.agent.duration`    | Agent execution duration   | `agent.name`, `environment`, `status`              | ms    |
| `adk.tool.duration`     | Tool execution duration    | `tool.name`, `agent.name`, `environment`, `status` | ms    |
| `adk.llm.duration`      | LLM call duration          | `model`, `agent.name`, `environment`, `status`     | ms    |
| `adk.llm.tokens`        | Total tokens per LLM call  | `model`, `agent.name`, `environment`, `status`     | count |
| `adk.llm.tokens.input`  | Input tokens per LLM call  | `model`, `agent.name`, `environment`, `status`     | count |
| `adk.llm.tokens.output` | Output tokens per LLM call | `model`, `agent.name`, `environment`, `status`     | count |

### Recording Custom Metrics

```typescript
import { telemetryService } from "@iqai/adk";

// Record agent invocation
telemetryService.recordAgentInvocation({
  agentName: "my-agent",
  environment: "production",
  status: "success",
});

// Record agent duration
telemetryService.recordAgentDuration(1500, {
  agentName: "my-agent",
  environment: "production",
  status: "success",
});

// Record tool execution
telemetryService.recordToolExecution({
  toolName: "search_web",
  agentName: "my-agent",
  environment: "production",
  status: "success",
});

// Record LLM tokens
telemetryService.recordLlmTokens(150, 75, {
  model: "gpt-4",
  agentName: "my-agent",
  environment: "production",
  status: "success",
});
```

## Advanced Usage

### Custom Spans

```typescript
import { telemetryService } from "@iqai/adk";

// Execute function within a traced span
const result = await telemetryService.withSpan(
  "custom_operation",
  async span => {
    span.setAttribute("custom.attribute", "value");

    // Your work here
    const result = await doSomething();

    return result;
  },
  {
    "operation.type": "data_processing",
    "operation.version": "2.0",
  },
);
```

### Async Generator Tracing

```typescript
async function* myGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

// Wrap with tracing
const tracedGenerator = telemetryService.traceAsyncGenerator(
  "my_operation",
  myGenerator(),
  {
    "generator.type": "number_stream",
  },
);

for await (const value of tracedGenerator) {
  console.log(value); // Traced within span
}
```

### Adding Events to Active Span

```typescript
telemetryService.addEvent("user_action", {
  "action.type": "button_click",
  "action.target": "submit",
});
```

### Recording Exceptions

```typescript
try {
  await riskyOperation();
} catch (error) {
  telemetryService.recordException(error as Error, {
    "error.context": "data_validation",
    "error.severity": "high",
  });
  throw error;
}
```

## Semantic Conventions

The telemetry system follows OpenTelemetry GenAI semantic conventions:

### Standard Attributes (gen_ai.\*)

```typescript
import { SEMCONV } from "@iqai/adk";

// System identification
SEMCONV.GEN_AI_SYSTEM; // "gen_ai.system"

// Operations
SEMCONV.GEN_AI_OPERATION_NAME; // "gen_ai.operation.name"

// Agents
SEMCONV.GEN_AI_AGENT_NAME; // "gen_ai.agent.name"
SEMCONV.GEN_AI_CONVERSATION_ID; // "gen_ai.conversation.id"

// Tools
SEMCONV.GEN_AI_TOOL_NAME; // "gen_ai.tool.name"
SEMCONV.GEN_AI_TOOL_TYPE; // "gen_ai.tool.type"

// LLM Requests
SEMCONV.GEN_AI_REQUEST_MODEL; // "gen_ai.request.model"
SEMCONV.GEN_AI_REQUEST_MAX_TOKENS; // "gen_ai.request.max_tokens"

// Token Usage
SEMCONV.GEN_AI_USAGE_INPUT_TOKENS; // "gen_ai.usage.input_tokens"
SEMCONV.GEN_AI_USAGE_OUTPUT_TOKENS; // "gen_ai.usage.output_tokens"
```

### ADK-Specific Attributes (adk.\*)

```typescript
import { ADK_ATTRS } from "@iqai/adk";

// Session and context
ADK_ATTRS.SESSION_ID; // "adk.session.id"
ADK_ATTRS.USER_ID; // "adk.user.id"
ADK_ATTRS.INVOCATION_ID; // "adk.invocation.id"

// Content
ADK_ATTRS.TOOL_ARGS; // "adk.tool.args"
ADK_ATTRS.TOOL_RESPONSE; // "adk.tool.response"
ADK_ATTRS.LLM_REQUEST; // "adk.llm.request"
ADK_ATTRS.LLM_RESPONSE; // "adk.llm.response"
```

## Integration with Observability Platforms

### Jaeger

Already covered above - works out of the box!

### Grafana + Tempo

```yaml
# docker-compose.yml
services:
  tempo:
    image: grafana/tempo:latest
    ports:
      - "4318:4318" # OTLP HTTP
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
    command: ["-config.file=/etc/tempo.yaml"]

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
```

### Datadog

```typescript
await telemetryService.initialize({
  appName: "my-app",
  otlpEndpoint: "https://api.datadoghq.com/v1/traces",
  otlpHeaders: {
    "DD-API-KEY": process.env.DD_API_KEY,
  },
});
```

### New Relic

```typescript
await telemetryService.initialize({
  appName: "my-app",
  otlpEndpoint: "https://otlp.nr-data.net:4318/v1/traces",
  otlpHeaders: {
    "api-key": process.env.NEW_RELIC_LICENSE_KEY,
  },
});
```

### Honeycomb

```typescript
await telemetryService.initialize({
  appName: "my-app",
  otlpEndpoint: "https://api.honeycomb.io/v1/traces",
  otlpHeaders: {
    "x-honeycomb-team": process.env.HONEYCOMB_API_KEY,
    "x-honeycomb-dataset": "my-dataset",
  },
});
```

## Shutdown

Always shutdown gracefully to ensure all telemetry is flushed:

```typescript
// At application exit
process.on("SIGTERM", async () => {
  await telemetryService.shutdown(5000); // 5 second timeout
  process.exit(0);
});

// Or manually
await telemetryService.shutdown();
```

## Troubleshooting

### No traces appearing?

1. Check OTLP endpoint is correct
2. Verify collector/backend is running
3. Check network connectivity
4. Enable debug logging:

```typescript
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

### High overhead?

1. Reduce sampling ratio:

```typescript
samplingRatio: 0.1; // Sample 10% of traces
```

2. Disable auto-instrumentation:

```typescript
enableAutoInstrumentation: false;
```

3. Increase metric export interval:

```typescript
metricExportIntervalMs: 300000; // 5 minutes
```

### Content not captured?

Check privacy settings:

```bash
echo $ADK_CAPTURE_MESSAGE_CONTENT
# Should be 'true' or unset
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Application                        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              TelemetryService                        │
│  ┌──────────┬──────────┬──────────┬──────────┐     │
│  │  Setup   │ Tracing  │ Metrics  │  Utils   │     │
│  └──────────┴──────────┴──────────┴──────────┘     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│         OpenTelemetry SDK Layer                      │
│  ┌─────────────────┬─────────────────────────┐     │
│  │ TracerProvider  │   MeterProvider         │     │
│  └─────────────────┴─────────────────────────┘     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              OTLP Exporters                          │
│  ┌─────────────────┬─────────────────────────┐     │
│  │ Trace Exporter  │   Metric Exporter       │     │
│  └─────────────────┴─────────────────────────┘     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              Backend (Jaeger, Tempo, etc.)
```

## Best Practices

1. **Always initialize early**: Before any agent operations
2. **Graceful shutdown**: Ensure telemetry is flushed on exit
3. **Privacy-first**: Disable content capture in production
4. **Use standard attributes**: Follow GenAI semantic conventions
5. **Monitor overhead**: Adjust sampling and export intervals
6. **Test locally**: Use Jaeger for development
7. **Structured logging**: Correlate logs with traces
8. **Custom attributes**: Add business context to spans

## Examples

See the `/examples` directory for complete examples:

- Basic agent with telemetry
- Multi-agent system tracing
- Custom metrics and spans
- Production configuration

## API Reference

Full API documentation available at: [adk-api-docs](../../apps/adk-api-docs)

## License

MIT License - see LICENSE file for details
