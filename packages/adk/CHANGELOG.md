# @iqai/adk

## 0.5.6

### Patch Changes

- 8d5ba1e: ADK WEB now supports voice input

## 0.5.5

### Patch Changes

- 05bb1b8: Fix state variable injection: serialize objects to JSON and parse nested properties

## 0.5.4

### Patch Changes

- 2167a47: Adds polymarket mcp wrapper

## 0.5.3

### Patch Changes

- 1ec769a: fix: improve type safety across cli and adk package
- 9ba699c: fix: state persistence
- 4fbb724: Fix: state management
- edfe628: Add artifact parsing and rewind functionality

## 0.5.2

### Patch Changes

- ae81c74: Add event compaction feature with configurable summarization

## 0.5.1

### Patch Changes

- d8fd6e8: feat(agent-builder): add static withAgent method for cleaner API usage

## 0.5.0

### Minor Changes

- 9c8441c: Enhanced CoinGecko MCP server support with remote endpoints

  - **Enhanced createMcpConfig function**: Now automatically detects URLs and uses `mcp-remote` for remote MCP endpoints while maintaining backward compatibility with npm packages
  - **Updated McpCoinGecko**: Now uses the remote CoinGecko MCP API endpoint (`https://mcp.api.coingecko.com/mcp`) instead of the npm package
  - **Added McpCoinGeckoPro**: New function for accessing the professional CoinGecko MCP API endpoint (`https://mcp.pro-api.coingecko.com/mcp`) with enhanced features and higher rate limits
  - **Improved code maintainability**: Refactored both CoinGecko functions to use the enhanced `createMcpConfig`, eliminating code duplication
  - **Added documentation**: Updated module documentation with examples showing how to use both CoinGecko functions

  This change enables seamless integration with CoinGecko's remote MCP endpoints while providing a cleaner, more maintainable codebase for future remote endpoint integrations.

## 0.4.1

### Patch Changes

- 1b00e47: Add export to VertexAiRagMemoryService

## 0.4.0

### Minor Changes

- c538a1a: feat(adk): align before/after model callback signatures with runtime (single object arg) and wire before/after tool callbacks into tool execution.

  - beforeModelCallback/afterModelCallback now receive `{ callbackContext, llmRequest|llmResponse }` to match runtime invocation; removes need for casts in examples.
  - beforeToolCallback/afterToolCallback are now invoked around tool execution; allow argument mutation and result override.
  - tracing updated to include final args and the produced event.
  - minor lint/style cleanups in flows.

## 0.3.7

### Patch Changes

- 737cb0f: Adds support for gpt 5 models

## 0.3.6

### Patch Changes

- edadab9: added withRunConfig option on AgentBuilder

## 0.3.5

### Patch Changes

- 8ce3a6f: Fixes ai sdk tool response converstion issue

## 0.3.4

### Patch Changes

- f365669: Fixes ai sdk tool response converstion

## 0.3.3

### Patch Changes

- 5d19967: Disables triming on errors for logger

## 0.3.2

### Patch Changes

- 2da690a: - **Dependency Updates:**

  - Upgraded dependencies and devDependencies across multiple packages ensuring compatibility with the latest library versions.

  - **Schema Handling:**

    - Transitioned schema conversion to use `z.toJSONSchema`, reducing dependencies.
    - Enhanced type safety in the workflow tool's schema handling.

  - **Error Reporting and Validation:**

    - Improved error messages in `AgentBuilder` for better debugging.
    - Enhanced output validation for LLM.

  - **AI SDK and Model Integration:**

    - Refined model ID handling in `AiSdkLlm`.
    - Updated field references to align with AI SDK changes.

  - **Code Quality Enhancements:**
    - Improved import order and code formatting for consistency.

  This changeset ensures improved stability, security, and developer experience across the updated packages.

## 0.3.1

### Patch Changes

- b6c0344: Improved adk cli experience

## 0.3.0

### Minor Changes

- 3561208: ## Features

  - Introduced conditional typing for multi-agent responses in `EnhancedRunner`, `BuiltAgent`, and `AgentBuilderWithSchema`. The ask() method now returns appropriate response type based on agent configuration.
  - Improved `AgentBuilder` methods (asSequential, asParallel, and related build methods) for better type propagation and correct return types for multi-agent aggregators.
  - Output schemas can no longer be set directly on multi-agent aggregators. Schemas must now be defined on individual sub-agents.

  ## Fixes

  - Bugfix in mergeAgentRun that caused incorrect removal of resolved promises.

  ## Changes

  - `ask()` implementation tailored to aggregate and return per-agent responses for multi-agent setups while maintaining schema validation for single-agent cases.
  - Now, `AgentBuilder` and `BuiltAgent` are being re-exported explicitly from the ADK entrypoint for type preservation in bundled declarations.

### Patch Changes

- c890576: Enhance structured logging and error handling in the AgentBuilder. Unify logger styles and improve warning messages for better clarity.
- b0fdba9: Fixes string concatination for output schema validation error

## 0.2.5

### Patch Changes

- e1dc750: - Implements output schema to work with tools and agent transfers

## 0.2.4

### Patch Changes

- dc2c3eb: Fix database session service to use consistent state prefixes with in-memory service

  The database session service was using hardcoded prefix strings ("app*", "user*", "temp\_") instead of the proper State constants (State.APP_PREFIX, State.USER_PREFIX, State.TEMP_PREFIX) that are used by the in-memory session service. This inconsistency could cause state handling issues when switching between session service implementations.

## 0.2.3

### Patch Changes

- 298edf1: `convertMcpToolToBaseTool` now takes in a optional toolHandler for more modularity

## 0.2.2

### Patch Changes

- 0485d51: export convertMcpToolToBaseTool to convert Tool -> BaseTool

## 0.2.1

### Patch Changes

- 765592d: export McpClientService
- 14fdbf4: added mcp-upbit to servers file

## 0.2.0

### Minor Changes

- 17341fc: Refactor agent loading and resolution logic with enhanced flexibility and reliability

  This major enhancement improves the ADK CLI server's agent loading capabilities and adds new features to the core framework:

  **CLI Server Improvements:**

  - **Modular Architecture**: Refactored monolithic server file into organized modules (`server/index.ts`, `server/routes.ts`, `server/services.ts`, `server/types.ts`)
  - **Enhanced Agent Resolution**: New `resolveAgentExport` method supports multiple export patterns:
    - Direct agent exports: `export const agent = new LlmAgent(...)`
    - Function factories: `export function agent() { return new LlmAgent(...) }`
    - Async factories: `export async function agent() { return new LlmAgent(...) }`
    - Container objects: `export default { agent: ... }`
    - Primitive exports with fallback scanning
  - **Improved TypeScript Import Handling**: Better project root detection and module resolution for TypeScript files

  **Core Framework Enhancements:**

  - **New AgentBuilder Method**: Added `withAgent()` method to directly provide existing agent instances with definition locking to prevent accidental configuration overwrites
  - **Two-Tier Tool Deduplication**: Implemented robust deduplication logic to prevent duplicate function declarations that cause errors with LLM providers (especially Google)
  - **Better Type Safety**: Improved type definitions and replaced `any[]` usage with proper typed interfaces

  **Testing & Reliability:**

  - **Comprehensive Test Coverage**: New `agent-resolution.test.ts` with extensive fixtures testing various agent export patterns
  - **Multiple Test Fixtures**: Added 6 different agent export pattern examples for validation
  - **Edge Case Handling**: Improved error handling and logging throughout the agent loading pipeline

  These changes provide a more flexible, reliable, and maintainable foundation for agent development and deployment while maintaining backward compatibility.

- 1564b7b: Port Python evaluation framework to TypeScript

  This change introduces a comprehensive evaluation framework for testing AI agent performance. Key features include:

  - **Core evaluation engine** with agent-evaluator and local evaluation service
  - **Built-in evaluators** for response matching, trajectory analysis, LLM-as-judge, and safety checks
  - **Metrics system** with ROUGE scoring and tool trajectory analysis
  - **Vertex AI integration** for cloud-based evaluation
  - **Pluggable registry system** for custom metric evaluators
  - **Structured evaluation cases and test sets** for organized testing

  The framework is marked as experimental and provides essential tooling for evaluating agent responses, tool usage, and overall performance across different scenarios.

## 0.1.22

### Patch Changes

- c4e642a: downgraded info level logs to debug, removed legacy starter in create-adk-project and new adk cli initial version!

## 0.1.21

### Patch Changes

- 22c1cc6: Adds support for input and output schemas for agents, now output schema would update the instruction with the given schema to ristrict model into giving the desired output and validates it before producing output. Agent builder is wired to provide better type inference of the schema given by withOutputSchema
- f141bc0: Improves error handling for missing models in workflows

## 0.1.20

### Patch Changes

- 85473c7: Fix OpenAI and AI SDK LLMs not taking in the schema from MCP tools

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
