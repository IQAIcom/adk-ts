# @iqai/adk-cli

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
