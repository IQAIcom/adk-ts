# Environment Variables - Graceful Handling Guide

This guide explains how to handle environment variables gracefully in ADK agents, allowing them to start with reduced functionality when optional variables are missing, while still requiring truly essential variables.

## Problem

Previously, ADK agents would completely fail to start if ANY environment variable was missing, even optional ones like debug flags or secondary API keys. This led to poor developer experience where agents couldn't be tested without setting up every single environment variable.

## Solution

We've enhanced the ADK environment validation to support:

1. **Required variables** - Agent fails to start if missing (e.g., primary API keys)
2. **Optional variables** - Agent starts with warnings and reduced functionality
3. **Variables with defaults** - Agent uses sensible fallbacks
4. **Graceful degradation** - Agent adapts to available resources

## Enhanced Environment Schema

### Basic Pattern

```typescript
import { z } from "zod";

// ❌ Old way - everything is required
const oldSchema = z.object({
  GOOGLE_API_KEY: z.string(),          // Fails completely if missing
  DEBUG: z.string(),                   // Fails completely if missing
  PORT: z.string(),                    // Fails completely if missing
});

// ✅ New way - graceful degradation
const newSchema = z.object({
  // Optional with default - never causes failures
  DEBUG: z.coerce.boolean().default(false),
  PORT: z.coerce.number().default(3000),
  
  // Optional API keys - agent starts but with limited functionality
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Required only if you truly can't function without it
  DATABASE_URL: z.string(), // Only use this for truly critical vars
});
```

### Complete Example

```typescript
// src/env.ts
import { config } from "dotenv";
import { z } from "zod";

config();

export const envSchema = z.object({
  // System configuration (with sensible defaults)
  ADK_DEBUG: z.coerce.boolean().default(false),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("localhost"),
  NODE_ENV: z.string().default("development"),
  
  // API Keys (optional - agent starts with reduced functionality)
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  
  // Model configuration (with defaults)
  LLM_MODEL: z.string().default("gemini-2.0-flash-exp"),
  
  // Only mark as required if agent literally cannot function
  // DATABASE_URL: z.string(), // Uncomment only if database is essential
});

// Safe parsing with graceful error handling
export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues
        .filter(issue => issue.code === "invalid_type" && issue.received === "undefined")
        .map(issue => issue.path[0])
        .filter(Boolean);
      
      console.warn(`⚠️  Missing optional environment variables: ${missing.join(", ")}`);
      console.warn(`   Agent will start with limited functionality.`);
      
      // Try to create partial config with defaults
      const result = envSchema.safeParse(process.env);
      if (result.success) {
        return result.data;
      }
    }
    throw error;
  }
}

export const env = parseEnv();

// Helper utilities for safe access
export const envHelpers = {
  hasGoogleApi: () => !!env.GOOGLE_API_KEY,
  hasOpenAiApi: () => !!env.OPENAI_API_KEY,
  hasWeatherApi: () => !!env.WEATHER_API_KEY,
  
  getAvailableLLMs: () => {
    const providers = [];
    if (env.GOOGLE_API_KEY) providers.push("google");
    if (env.OPENAI_API_KEY) providers.push("openai");
    return providers;
  },
  
  getBestApiKey: () => {
    return env.GOOGLE_API_KEY || env.OPENAI_API_KEY || null;
  }
};
```

## Agent Implementation with Graceful Degradation

```typescript
// src/agents/weather-agent.ts
import { createAgent } from "@iqai/adk";
import { env, envHelpers } from "../env";

export const weatherAgent = createAgent({
  name: "weather-agent",
  
  async onStart() {
    console.log("🚀 Weather Agent starting...");
    
    if (!envHelpers.hasWeatherApi()) {
      console.warn("⚠️  Weather API key not configured. Weather functionality disabled.");
      console.warn("   Set WEATHER_API_KEY in your .env file to enable weather features.");
    }
    
    const availableLLMs = envHelpers.getAvailableLLMs();
    if (availableLLMs.length === 0) {
      console.warn("⚠️  No LLM API keys configured. Agent will have very limited capabilities.");
      console.warn("   Set GOOGLE_API_KEY or OPENAI_API_KEY to enable AI features.");
    } else {
      console.log(`✅ Available LLM providers: ${availableLLMs.join(", ")}`);
    }
  },
  
  async handleMessage(message: string) {
    // Check if we have the necessary APIs for this request
    if (message.includes("weather") && !envHelpers.hasWeatherApi()) {
      return "Sorry, weather functionality is not available. Please configure WEATHER_API_KEY.";
    }
    
    const apiKey = envHelpers.getBestApiKey();
    if (!apiKey) {
      return "Sorry, I don't have access to any AI services. Please configure API keys.";
    }
    
    // Proceed with normal agent logic...
    return "Processing with available services...";
  }
});
```

## ADK CLI Improvements

The ADK CLI now handles environment variable errors more gracefully:

### Before (Hard Failure)
```
❌ Failed to load agent: Missing required environment variable: GOOGLE_API_KEY
[Agent completely fails to start]
```

### After (Graceful Degradation)
```
⚠️  Missing optional environment variables (GOOGLE_API_KEY). Agent will continue with limited functionality.
💡 To enable full functionality, consider setting these variables in your .env file.

🚀 ADK Agent Environment Configuration:
   Debug mode: false
   Available LLM providers: none
   Weather functionality: disabled
   Default model: gemini-2.0-flash-exp
⚠️  No LLM API keys configured. The agent will have very limited functionality.
   Consider setting GOOGLE_API_KEY or OPENAI_API_KEY in your .env file.

✅ Agent started successfully (limited mode)
```

## Migration Guide

### 1. Update Existing Environment Schemas

**Before:**
```typescript
export const envSchema = z.object({
  GOOGLE_API_KEY: z.string(),  // ❌ Hard requirement
  DEBUG: z.string(),           // ❌ Hard requirement
});
```

**After:**
```typescript
export const envSchema = z.object({
  GOOGLE_API_KEY: z.string().optional(),     // ✅ Graceful degradation
  DEBUG: z.coerce.boolean().default(false),  // ✅ Sensible default
});
```

### 2. Add Capability Checks in Your Agents

```typescript
// Add checks for optional functionality
if (envHelpers.hasGoogleApi()) {
  // Use Google LLM
} else if (envHelpers.hasOpenAiApi()) {
  // Fall back to OpenAI
} else {
  // Provide helpful error message
  return "No LLM API keys configured. Please set GOOGLE_API_KEY or OPENAI_API_KEY.";
}
```

### 3. Update Error Messages

Instead of cryptic errors, provide helpful guidance:

```typescript
// ❌ Bad error message
throw new Error("Missing API key");

// ✅ Good error message
return "Weather functionality requires WEATHER_API_KEY to be set in your .env file. " +
       "Get your API key from https://weatherapi.com and add it to enable weather features.";
```

## Environment Variable Categories

### 🔴 Required (use `z.string()`)
- Database connection strings for core functionality
- Critical API keys that the agent cannot function without
- Security keys for authentication

### 🟡 Optional with Defaults (use `z.string().default(value)`)
- Server configuration (PORT, HOST)
- Debug flags
- Feature toggles
- Model names

### 🟢 Optional Features (use `z.string().optional()`)
- Secondary API keys for additional functionality
- Third-party service integrations
- Enhancement features

## Testing Strategies

### 1. Test with Minimal Configuration

Create a `.env.minimal` for testing basic functionality:

```bash
# .env.minimal - Bare minimum to start the agent
NODE_ENV=test
PORT=3001
```

### 2. Test Feature Availability

```typescript
describe("Agent with missing API keys", () => {
  beforeAll(() => {
    // Temporarily remove API keys
    delete process.env.GOOGLE_API_KEY;
  });
  
  it("should start successfully", () => {
    expect(() => createAgent()).not.toThrow();
  });
  
  it("should report limited functionality", () => {
    const capabilities = envHelpers.getAvailableLLMs();
    expect(capabilities).toEqual([]);
  });
});
```

## Best Practices

### 1. Progressive Enhancement
Design your agent to work with minimal configuration and enhance with available APIs:

```typescript
// Base functionality always available
const baseFeatures = ["help", "status", "ping"];

// Enhanced features based on available APIs
const enhancedFeatures = [
  ...(envHelpers.hasGoogleApi() ? ["chat", "analysis"] : []),
  ...(envHelpers.hasWeatherApi() ? ["weather"] : []),
];

const allFeatures = [...baseFeatures, ...enhancedFeatures];
```

### 2. Clear User Communication

```typescript
async handleMessage(message: string) {
  const requestedFeature = parseFeatureFromMessage(message);
  
  if (requestedFeature === "weather" && !envHelpers.hasWeatherApi()) {
    return {
      error: "Weather feature not available",
      solution: "Set WEATHER_API_KEY in your .env file",
      documentation: "https://docs.example.com/weather-setup"
    };
  }
  
  // Handle available features...
}
```

### 3. Development vs Production

```typescript
// Different requirements for different environments
const requiredInProduction = env.NODE_ENV === "production" 
  ? ["DATABASE_URL", "API_KEY"] 
  : [];

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: env.NODE_ENV === "production" 
    ? z.string() 
    : z.string().optional(),
  API_KEY: env.NODE_ENV === "production" 
    ? z.string() 
    : z.string().optional(),
});
```

## Example .env Files

### Development (.env.development)
```bash
# Development environment - minimal setup for quick iteration
NODE_ENV=development
ADK_DEBUG=true
PORT=3000

# Optional: Add API keys as you need them
# GOOGLE_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here
```

### Production (.env.production)
```bash
# Production environment - all features enabled
NODE_ENV=production
ADK_DEBUG=false
PORT=3000
HOST=0.0.0.0

# Production requires all API keys
GOOGLE_API_KEY=your_production_key
WEATHER_API_KEY=your_weather_key
DATABASE_URL=your_database_connection
```

This approach allows for much better developer experience while maintaining reliability in production environments.