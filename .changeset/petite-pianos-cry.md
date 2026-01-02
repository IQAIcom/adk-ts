---
"@iqai/adk": minor
---

## Comprehensive Telemetry System Overhaul

This release introduces a complete redesign of the telemetry system with extensive features for observability and monitoring.

### ✨ New Features

**Modular Architecture**
- Refactored from monolithic to service-based design
- Separate modules for tracing, metrics, setup, and utilities
- Clean `telemetryService` API replacing low-level functions

**Metrics Support**
- Full metrics collection with OpenTelemetry SDK
- Counters: agent invocations, tool executions, LLM calls
- Histograms: duration tracking, token usage (input/output/total)
- OTLP HTTP exporter for metrics

**Privacy Controls**
- `ADK_CAPTURE_MESSAGE_CONTENT` environment variable
- Fine-grained control over sensitive data capture
- Disable prompt/completion logging for production

**Semantic Conventions**
- OpenTelemetry GenAI conventions (v1.37+)
- ADK-specific namespace (`adk.*`) for custom attributes
- Standardized attribute names across all spans

**Enhanced Tracing**
- Automatic agent invocation tracing with status tracking
- Tool execution spans with arguments and results
- LLM call tracing with token usage metrics
- Async generator support for streaming responses

**Resource Auto-Detection**
- Automatic detection of host, OS, and process information
- Custom resource attributes support
- Service instance identification

**Configuration**
- Comprehensive initialization options
- Sampling ratio control for production
- Configurable metric export intervals
- Custom OTLP headers for authentication

### 🔧 Breaking Changes

- `initializeTelemetry()` → `telemetryService.initialize()`
- `shutdownTelemetry()` → `telemetryService.shutdown()`
- Legacy `telemetry.ts` now wraps new service for backward compatibility

### 📊 Integration

All core components now automatically report metrics:
- `BaseAgent.runAsyncInternal()`: Agent metrics
- `functions.ts`: Tool execution metrics  
- `base-llm-flow.ts`: LLM token and duration metrics

### 📚 Documentation

- Comprehensive README in `src/telemetry/`
- Updated observability example with Jaeger + Langfuse
- Practical examples demonstrating all features

### 🛠️ Technical Details

**Dependencies Added**:
- `@opentelemetry/sdk-metrics@^2.1.0`
- `@opentelemetry/exporter-metrics-otlp-http@^0.205.0`

**Supported Backends**:
- Jaeger (local development)
- Langfuse
- Datadog
- New Relic
- Any OTLP-compatible backend

This release provides a production-ready observability foundation for AI applications built with ADK.
