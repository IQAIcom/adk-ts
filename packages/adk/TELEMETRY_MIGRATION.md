# Telemetry Migration Guide: OpenTelemetry GenAI Semantic Conventions v1.38.0

This guide helps you migrate to the updated telemetry implementation that aligns with OpenTelemetry GenAI Semantic Conventions v1.38.0.

## Overview

The ADK telemetry has been updated to follow the latest OpenTelemetry GenAI semantic conventions (v1.38.0). This ensures better interoperability with observability platforms and alignment with industry standards.

## Breaking Changes

### 1. Deprecated Attribute: `gen_ai.system` → `gen_ai.provider.name`

**What changed:**
- The `gen_ai.system` attribute has been deprecated in favor of `gen_ai.provider.name`
- Provider detection is now automatic based on model names

**Before:**
```typescript
// Old constant (now deprecated)
SEMCONV.GEN_AI_SYSTEM = "gen_ai.system"
// Value was always "iqai-adk"
```

**After:**
```typescript
// New constant (required by spec)
SEMCONV.GEN_AI_PROVIDER_NAME = "gen_ai.provider.name"
// Value is automatically detected from model:
// - "gpt-4" → "openai"
// - "claude-3" → "anthropic"
// - "gemini-pro" → "gcp.gemini"
// - For framework operations → "iqai-adk"
```

**Action required:**
- If you're manually adding custom attributes using `SEMCONV.GEN_AI_SYSTEM`, update to use `SEMCONV.GEN_AI_PROVIDER_NAME`
- The framework now automatically detects providers, so most users don't need to change anything

### 2. Removed: `gen_ai.usage.total_tokens`

**What changed:**
- The `GEN_AI_USAGE_TOTAL_TOKENS` constant has been deprecated
- Total tokens should be computed client-side from input + output tokens

**Before:**
```typescript
attributes[SEMCONV.GEN_AI_USAGE_TOTAL_TOKENS] = inputTokens + outputTokens
```

**After:**
```typescript
// No longer set on spans - compute in your analysis/dashboards:
const totalTokens = inputTokens + outputTokens
```

**Action required:**
- Update any custom queries or dashboards that rely on `gen_ai.usage.total_tokens`
- Use `gen_ai.usage.input_tokens + gen_ai.usage.output_tokens` instead

### 3. Operation Name Change: `call_llm` → `chat`

**What changed:**
- The `CALL_LLM` operation has been deprecated in favor of standard names
- New standard operations: `chat`, `text_completion`, `generate_content`

**Before:**
```typescript
OPERATIONS.CALL_LLM // "call_llm" (non-standard)
```

**After:**
```typescript
OPERATIONS.CHAT // "chat" (standard)
OPERATIONS.TEXT_COMPLETION // "text_completion" (standard)
OPERATIONS.GENERATE_CONTENT // "generate_content" (standard)
OPERATIONS.CALL_LLM // Still available but deprecated
```

**Action required:**
- Update any custom filters or queries that match `operation.name = "call_llm"`
- Use `operation.name = "chat"` instead

### 4. Updated `traceCallback` Signature

**What changed:**
- Removed unused `targetName` parameter

**Before:**
```typescript
telemetryService.traceCallback(
  "before_agent",
  callback.name,
  0,
  agentName, // ← This parameter removed
  invocationContext
);
```

**After:**
```typescript
telemetryService.traceCallback(
  "before_agent",
  callback.name,
  0,
  invocationContext // targetName parameter removed
);
```

**Action required:**
- If you're manually calling `traceCallback`, remove the `targetName` parameter

## New Features

### 1. Automatic Provider Detection

The framework now automatically detects the GenAI provider from model names:

```typescript
// Automatically detected:
"gpt-4" → provider: "openai"
"gpt-4-turbo" → provider: "openai"
"claude-3-opus" → provider: "anthropic"
"gemini-pro" → provider: "gcp.gemini"
"llama-3.1" → provider: "meta"
"mistral-large" → provider: "mistral_ai"
// ... and many more
```

### 2. Enhanced LLM Attributes

New attributes are now captured for LLM calls:

```typescript
// Response metadata
gen_ai.response.id       // Completion ID from provider
gen_ai.response.model    // Actual model used (may differ from request)
gen_ai.output.type       // "text", "json", "image", etc.

// Additional request parameters
gen_ai.request.top_k
gen_ai.request.frequency_penalty
gen_ai.request.presence_penalty
gen_ai.request.stop_sequences
gen_ai.request.choice.count  // When != 1
gen_ai.request.seed
```

### 3. Structured Content Attributes

When `ADK_CAPTURE_MESSAGE_CONTENT=true`, structured content is now captured:

```typescript
// New structured attributes:
gen_ai.system_instructions  // System prompt
gen_ai.input.messages       // Full chat history (structured)
gen_ai.output.messages      // Model output (structured)
gen_ai.tool.definitions     // Tool schemas provided to model

// Tool-specific:
gen_ai.tool.call.arguments  // Structured tool input
gen_ai.tool.call.result     // Structured tool output
```

### 4. Standard Metrics

New OpenTelemetry-compliant metrics alongside existing ADK metrics:

```typescript
// Required: Operation duration (Histogram, seconds)
gen_ai.client.operation.duration

// Recommended: Token usage (Histogram, tokens)
gen_ai.client.token.usage  // With gen_ai.token.type: "input" | "output"

// Server-side metrics (if applicable)
gen_ai.server.request.duration
gen_ai.server.time_to_first_token
gen_ai.server.time_per_output_token
```

### 5. Agent ID Tracking

Agents now have unique identifiers:

```typescript
gen_ai.agent.id = `${agentName}-${sessionId}`
```

## Migration Checklist

- [ ] Review custom telemetry queries for `gen_ai.system` → update to `gen_ai.provider.name`
- [ ] Update dashboards that calculate `gen_ai.usage.total_tokens` to use input + output
- [ ] Update filters matching `operation.name = "call_llm"` to use `"chat"`
- [ ] If calling `traceCallback` directly, remove `targetName` parameter
- [ ] Test telemetry export to your observability platform
- [ ] Update any custom instrumentation to use new attributes
- [ ] Consider enabling structured content capture for richer telemetry

## Backward Compatibility

### Deprecated Constants (Still Available)

The following constants are deprecated but still available for backward compatibility:

```typescript
// ⚠️ Deprecated - will be removed in v1.0.0
SEMCONV.GEN_AI_SYSTEM
SEMCONV.GEN_AI_USAGE_TOTAL_TOKENS
SEMCONV.GEN_AI_CONTENT_PROMPT      // Use GEN_AI_INPUT_MESSAGES
SEMCONV.GEN_AI_CONTENT_COMPLETION   // Use GEN_AI_OUTPUT_MESSAGES
OPERATIONS.CALL_LLM                 // Use CHAT, TEXT_COMPLETION, or GENERATE_CONTENT
```

### ADK-Specific Attributes

All `adk.*` namespace attributes remain unchanged and continue to work:

```typescript
adk.system.name
adk.system.version
adk.session.id
adk.user.id
adk.agent.name
adk.tool.name
// ... all other adk.* attributes preserved
```

## Testing Your Migration

1. **Enable verbose telemetry logging:**
   ```typescript
   process.env.OTEL_LOG_LEVEL = "debug";
   ```

2. **Verify provider detection:**
   ```typescript
   // Check that provider is correctly detected in your traces
   // Should see gen_ai.provider.name = "openai" (not "iqai-adk") for LLM calls
   ```

3. **Check your observability platform:**
   - Ensure traces are being exported correctly
   - Verify new attributes appear in your spans
   - Update saved queries/dashboards

## Support

For questions or issues:
- GitHub Issues: https://github.com/IQAIcom/adk-ts/issues
- Documentation: [Link to docs]
- Semantic Conventions Reference: https://opentelemetry.io/docs/specs/semconv/gen-ai/

## Next Steps

This migration implements **Phase 1** of the SEMCONV alignment. Future updates will include:
- **Phase 2**: Additional content attributes and improved content capture
- **Phase 3**: Metrics implementation (histogram recording)
- **Phase 4**: Provider-specific attributes and embeddings support

Stay tuned for updates!
