I will make `otlpEndpoint` optional in the telemetry configuration and ensure the system handles its absence gracefully.

### 1. Update Telemetry Configuration Interface
**File:** `packages/adk/src/telemetry/types.ts`
- Change `otlpEndpoint` from required to optional (`?`).

### 2. Update Configuration Validation
**File:** `packages/adk/src/telemetry/utils.ts`
- Remove the validation check that requires `otlpEndpoint` to be present.

### 3. Update Telemetry Setup Logic
**File:** `packages/adk/src/telemetry/setup.ts`
- **Tracing Initialization (`initializeTracing`)**:
  - Only create `OTLPTraceExporter` and add it to the span processor if `otlpEndpoint` is provided.
  - The `InMemorySpanExporter` will still be configured to ensure local tracing works.
- **Metrics Initialization (`initializeMetrics`)**:
  - Check if `otlpEndpoint` is provided before attempting to configure OTLP metrics.
  - If missing, skip OTLP metrics setup (or log a debug message) to avoid runtime errors.
- **Auto-Instrumentation (`initializeAutoInstrumentation`)**:
  - Conditionally create trace and metric exporters only when `otlpEndpoint` is available.
  - Ensure `NodeSDK` is initialized with valid configurations even when OTLP is disabled.
