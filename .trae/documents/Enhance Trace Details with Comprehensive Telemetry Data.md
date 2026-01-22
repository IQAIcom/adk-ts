I will update `apps/adk-web/lib/trace-utils.ts` and `apps/adk-web/components/trace-details-panel.tsx` to comprehensively handle telemetry attributes.

1.  **Enhance `trace-utils.ts`**:
    - **Fallback Logic**: Update `getLlmRequest` and `getLlmResponse` to check standard OpenTelemetry attributes (`SEMCONV.GEN_AI_INPUT_MESSAGES`, `SEMCONV.GEN_AI_OUTPUT_MESSAGES`) if ADK-specific ones are missing.
    - **New Helpers**: Create helper functions to extract metadata that is currently missing:
      - `getTraceTitle(span)`: Returns a human-readable title (e.g., Agent Name, Tool Name) instead of just the Span ID.
      - `getPerformanceMetrics(span)`: Extracts token usage, TTFT, and cache hits.
      - `getErrorDetails(span)`: Extracts error category and recovery hints.
      - `getSystemInstructions(span)`: Extracts system prompts.

2.  **Upgrade `TraceDetailsPanel.tsx`**:
    - **Header**: Update the header to use `getTraceTitle` for a better description.
    - **Metadata Section**: Add a "Metadata" or "Stats" section (or incorporate into the existing layout) to display performance metrics (tokens, latency) and model information.
    - **System Instructions**: Include system instructions in the "Request" tab if available.
    - **Error Visibility**: Highlight error details if the span status indicates an error.

This will ensure all rich telemetry data captured by the backend is visible and useful in the frontend.
