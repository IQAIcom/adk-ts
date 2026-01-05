# Context Cache Logging Implementation

## Summary
Added comprehensive logging to track context caching activity in the ADK framework, making it easy to verify cache functionality and debug caching behavior.

## Changes Made

### 1. Cache Status Logs (`gemini-context-manager.ts`)

Added three key console logs to show cache activity:

#### ✓ Cache CREATED
- **When**: A new cache is successfully created
- **Shows**: Number of messages being cached
- **Location**: After successful cache creation
```typescript
console.log(`✓ Cache CREATED: New cache established (${cacheContentsCount} messages)`);
```

#### ✓ Cache HIT
- **When**: Existing cache is reused for a request
- **Shows**: Number of messages retrieved from cache
- **Location**: When applying cached content to request
```typescript
console.log(`✓ Cache HIT: Using cached context (${cacheContentsCount} messages)`);
```

#### ⊘ Cache SKIP
- **When**: Request is too small to benefit from caching
- **Shows**: Token count comparison (actual < minimum)
- **Location**: Before cache creation when below threshold
```typescript
console.log(`⊘ Cache SKIP: Context too small (${tokenCount} < ${minTokens} tokens)`);
```

### 2. Debug Logs (`context-cache-processor.ts`)

Added debug-level logs for development:
- Logs when previous cache metadata is found
- Logs when attempting fresh cache creation
- Uses Logger class (not console.log) for debug builds

### 3. Simplified Example (`apps/examples/src/18-context-cache-config/index.ts`)

#### Key Changes:
- **Model**: Using `gemini-2.5-flash` (latest, supports caching)
- **No Schema**: Removed structured output to avoid API compatibility issues
- **minTokens**: Set to `0` to allow caching with small contexts for demo purposes
- **Instruction**: Added longer, detailed system instruction to ensure sufficient content for caching
- **Output**: Ultra-minimal, numbered results showing only timing

#### Example Flow:
1. Build conversation history (3 exchanges) - silent
2. Test with cached context (3 queries) - shows timing and cache status
3. Display improvement summary

## How Context Caching Works

### Cache Flow:
```
AgentBuilder
  ↓ withContextCacheConfig()
Runner
  ↓ creates InvocationContext
ContextCacheRequestProcessor
  ↓ sets cacheConfig on LlmRequest
GoogleLlm
  ↓ creates GeminiContextCacheManager
GeminiContextCacheManager
  ↓ handleContextCaching()
  ├─→ First call: Creates cache → "✓ Cache CREATED"
  └─→ Subsequent: Reuses cache → "✓ Cache HIT"
```

### Cache Validation:
1. **Fingerprint Check**: Hash of system instruction + tools + message history
2. **TTL Check**: Cache hasn't expired
3. **Interval Check**: Within max reuse count
4. **Token Check**: Meets minimum token threshold

## Expected Output

When running the example, you should see:

```
🚀 Context Caching Demo

Building conversation history (3 exchanges)...

[conversation runs silently]

Testing with cached context:

✓ Cache CREATED: New cache established (6 messages)

1. Italy (2500ms)

✓ Cache HIT: Using cached context (6 messages)

2. Portugal (800ms)

✓ Cache HIT: Using cached context (6 messages)

3. Greece (750ms)

💡 Cache improved by 68% (2500ms → 775ms avg)
```

Note: You may also see debug logs (in development mode) showing the cache flow details.

## Configuration Options

### ContextCacheConfig Parameters:

- **minTokens**: Minimum tokens required to enable caching
  - Set to `0` for demos (always cache)
  - Production: `1000-4096` (balance overhead vs benefit)

- **ttlSeconds**: Cache lifetime in seconds
  - Example: `600` (10 minutes)
  - Max depends on provider

- **cacheIntervals**: Max reuses before refresh
  - Example: `3` (reuse up to 3 times)
  - Prevents stale cache buildup

## Verification

To verify caching is working:

1. **Check Logs**: Look for "Cache CREATED" and "Cache HIT" messages
2. **Check Timing**: Cached requests should be 40-70% faster
3. **Check Token Usage**: Provider dashboard should show cached token usage

## Troubleshooting

### Cache SKIP appearing?
- Check `minTokens` setting (lower it for testing)
- Verify conversation has enough content
- Check system instruction is being included

### No Cache HIT?
- Verify `cacheIntervals` not exceeded
- Check TTL hasn't expired
- Ensure fingerprint matches (same instruction, tools, history)

### Cache not improving speed?
- First request always creates cache (slower)
- Small contexts may not benefit much
- Network latency may dominate for simple queries

## Testing

Run the example:
```bash
cd apps/examples
pnpm tsx src/18-context-cache-config/index.ts
```

Expected behavior:
- First 3 queries build history (may create cache)
- Query 4 creates or reuses cache
- Queries 5-6 should show "Cache HIT"
- Timing should improve for cached queries
