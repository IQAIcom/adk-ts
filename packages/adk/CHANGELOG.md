# @iqai/adk

## 0.1.19

### Patch Changes

- a3956ec: Updates create tool type to make context required in callback param

## 0.1.18

### Patch Changes

- a73eee4: Update create tool to always get tool context

## 0.1.17

### Patch Changes

- 12b0f37: Resolved a critical performance issue in `createTool` that could cause the TypeScript Language Server to crash. This change is non-breaking.

## 0.1.16

### Patch Changes

- 335fa8e: Updates createTool to use zod v3 instead of v4

## 0.1.15

### Patch Changes

- d5d9750: update transfer agent tool to work

## 0.1.14

### Patch Changes

- d1935c5: Update withSesion method on agent builder to withSessionService to be more accurate to its function
- be898e3: Adds agent tool
- d4a6bd3: Adds withSession to pass session from outside the agent builder
- 55dde45: Fixes google llm redundant config translation which is causing to loose system instruction and max tokens information
- c36e159: Adds Shared memory request processor & shared memory agents example
- da0d86f: Updates session service passing to have optional check
- f846fc5: Adds better state config, now we can pass state and session id to withSessionService
- 623f375: Refactor function declarations to utilize the new type definitions from the @google/genai package, ensuring type compatibility across various tools. Adjustments made to parameter types and schema definitions enhance consistency and clarity in tool configurations.
- 01b358b: Fixes callback context to properly initalize new state
- d2591fb: Updates agent builder to properly handle session, session service, artifact service and codeExecutor

## 0.1.13

### Patch Changes

- 89db602: Update mcp server name for near intents

## 0.1.12

### Patch Changes

- 1b9f517: - Add support for withMemory and withArtifactService methods to agent builder instead of passing it from withSession

## 0.1.11

### Patch Changes

- 4a93c0a: Makes schema optional for createTool function

## 0.1.10

### Patch Changes

- 83e8a58: Add create tool function to easily create tools with zod schema

## 0.1.9

### Patch Changes

- 2711998: - adds @iqai/mcp-discord mcp definition
  - update EnhancedRunner.ask() to take in message type LlmRequest
  - update SamplingHandler response type to be LlmResponse | string for more flexibility when used with enhanced runner

## 0.1.8

### Patch Changes

- 38e6ec5: Improve type safety in AgentBuilder by removing undefined types from BuiltAgent interface

## 0.1.7

### Patch Changes

- 6e97c5a: Improve agent builder to take minimal params and improved experience with runner.ask

## 0.1.6

### Patch Changes

- 6bc189d: Adds coingecko mcp server definition

## 0.1.5

### Patch Changes

- f5962ca: Adds AI-SDK integration with comprehensive tool calling support

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

## 0.1.4

### Patch Changes

- 5e68c31: Adds sampling handler for mcp-simplified-syntax

## 0.1.3

### Patch Changes

- f1cb8d4: Allow mcp interface to allow parameters optional

## 0.1.2

### Patch Changes

- 17a5d3f: Fix MCP sampling
- 0081ed9: Adds MCP simplified syntax for well known servers

## 0.1.1

### Patch Changes

- 8b45e2b: Adds agent builder to create agents with minimal boiler plate

## 0.1.0

### Minor Changes

- 481e0da: Rewrites common interfaces to match more close to adk-python

### Patch Changes

- 1741097: Fixes openai models not getting system message
- 75309a1: postgres-session-service: new fromConnectionString() factory method. fix minor duplication bug
- 33b1887: added planners

## 0.0.15

### Patch Changes

- 033217e: google-llm: exclude exclusive min/max from tool calls

## 0.0.14

### Patch Changes

- 25c9c8c: bug-fixes: session-managers, runner
  new example: pglite

## 0.0.13

### Patch Changes

- 93b982b: Adds better sqlite3 dependency

## 0.0.12

### Patch Changes

- 948b0a1: Fixes sampling handler type to include promise

## 0.0.11

### Patch Changes

- 9c7a7a7: Adds proper input and output conversion from LLMRequest and LLMResponse types

## 0.0.10

### Patch Changes

- cb16b0c: Adds helper functions for creating sampling handlers

## 0.0.9

### Patch Changes

- b0b2f93: Adds description back to mcp config
- 6cf2ba0: Adds proper type to convertMcpMessagesToADK method

## 0.0.8

### Patch Changes

- 74ee653: Simplified sampling handler with adk message and response typings

## 0.0.7

### Patch Changes

- 35cb95d: Adds MCP Sampling request handling
