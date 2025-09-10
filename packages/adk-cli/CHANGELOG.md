# @iqai/adk-cli

## 0.3.0

### Minor Changes

- b6c0344: Improved adk cli experience

### Patch Changes

- Updated dependencies [b6c0344]
  - @iqai/adk@0.3.1

## 0.2.9

### Patch Changes

- Updated dependencies [c890576]
- Updated dependencies [b0fdba9]
- Updated dependencies [3561208]
  - @iqai/adk@0.3.0

## 0.2.8

### Patch Changes

- Updated dependencies [e1dc750]
  - @iqai/adk@0.2.5

## 0.2.7

### Patch Changes

- ea74fa0: Adds near shade agent template
- Updated dependencies [dc2c3eb]
  - @iqai/adk@0.2.4

## 0.2.6

### Patch Changes

- 40381d9: Enhance the loading mechanism to check for multiple environment files in a specified priority order, ensuring that environment variables are set only if they are not already defined. Additionally, provide warnings for any errors encountered while loading these files.

## 0.2.5

### Patch Changes

- 6a3a9ba: Add support for attaching media files to agent on adk-cli & adk-web

## 0.2.4

### Patch Changes

- Updated dependencies [298edf1]
  - @iqai/adk@0.2.3

## 0.2.3

### Patch Changes

- Updated dependencies [0485d51]
  - @iqai/adk@0.2.2

## 0.2.2

### Patch Changes

- Updated dependencies [765592d]
- Updated dependencies [14fdbf4]
  - @iqai/adk@0.2.1

## 0.2.1

### Patch Changes

- 8bf5d5d: Fixes template selection not working in adk new command

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

### Patch Changes

- Updated dependencies [17341fc]
- Updated dependencies [1564b7b]
  - @iqai/adk@0.2.0

## 0.1.1

### Patch Changes

- c4e642a: downgraded info level logs to debug, removed legacy starter in create-adk-project and new adk cli initial version!
- Updated dependencies [c4e642a]
  - @iqai/adk@0.1.22
