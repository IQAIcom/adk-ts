---
"@iqai/adk": patch
---

Adds AI-SDK integration with comprehensive tool calling support

This release introduces integration with Vercel's AI SDK, expanding the platform's capabilities to support a wider range of large language models without requiring manual maintenance of model synchronization.

## Key Features

- **AI-SDK Integration**: New `AiSdkLlm` class that integrates with Vercel AI SDK, supporting multiple providers (Google, OpenAI, Anthropic)
- **Tool Calling Support**: Robust tool calling capabilities with automatic transformation of ADK function declarations to AI SDK tool definitions using Zod schemas
- **Agent Builder Support**: Enhanced agent builder with AI-SDK model support
- **Example Implementation**: Complete weather agent example demonstrating AI-SDK usage with tool calling

## Technical Details

- Adds `ai-sdk.ts` model implementation with streaming support
- Implements message format conversion between ADK and AI SDK formats
- Supports both streaming and non-streaming model interactions
- Maintains backward compatibility with existing ADK functionality