# @iqai/adk-cli

## 0.3.17

### Patch Changes

- Updated dependencies [1b00e47]
  - @iqai/adk@0.4.1

## 0.3.16

### Patch Changes

- 4123905: fix cross platform (windows) adk-cli run issues (path resolution)

## 0.3.15

### Patch Changes

- 2fdd83f: Refactor graceful shutdown handling for server commands
- Updated dependencies [c538a1a]
  - @iqai/adk@0.4.0

## 0.3.14

### Patch Changes

- 9f8b3e5: Adds check for ADK web to check server compatibility
- 46cee30: Adds agent name in adk web

## 0.3.13

### Patch Changes

- Updated dependencies [737cb0f]
  - @iqai/adk@0.3.7

## 0.3.12

### Patch Changes

- b56741c: Add graph panel to sidebar component to showcase agent architecture

## 0.3.11

### Patch Changes

- 0c139d9: Defer TypeScript cache cleanup to process exit for better debugging and reliable cleanup.

## 0.3.10

### Patch Changes

- 3a848a2: Allows loading agents from different folder levels

## 0.3.9

### Patch Changes

- b2efa0b: Remove local option

## 0.3.8

### Patch Changes

- 0d9fd88: fix issues with path resolution

## 0.3.7

### Patch Changes

- aa41656: Fix TypeScript Path Resolution in Agent Loader
- Updated dependencies [edadab9]
  - @iqai/adk@0.3.6

## 0.3.6

### Patch Changes

- Updated dependencies [8ce3a6f]
  - @iqai/adk@0.3.5

## 0.3.5

### Patch Changes

- Updated dependencies [f365669]
  - @iqai/adk@0.3.4

## 0.3.4

### Patch Changes

- dd1d22e: fix: improve ADK run command exit handling
- 49ea60a: Fix session persistence in adk-cli and adk-web to prevent new sessions on refresh
- 964e4a7: Adds --version support for adk cli

## 0.3.3

### Patch Changes

- 4c0476b: Adds adk cache directory to skip from scanning avoiding session creation in loop bug

## 0.3.2

### Patch Changes

- Updated dependencies [5d19967]
  - @iqai/adk@0.3.3

## 0.3.1

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

- Updated dependencies [2da690a]
  - @iqai/adk@0.3.2

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
