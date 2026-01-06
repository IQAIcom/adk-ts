I will merge the two cache managers into a single, generically named `ContextCacheManager` to support future extensions to other models.

### 1. Create `ContextCacheManager`
I will rename and refactor `packages/adk/src/models/gemini-context-manager.ts` to `packages/adk/src/models/context-cache-manager.ts`.
-   **Class Name**: Rename `GeminiContextCacheManager` to `ContextCacheManager`.
-   **Method Name**: Rename internal method `createGeminiCache` to `createCache`.
-   **Functionality**: It will retain the current Google-specific implementation for now but will be the single point of extension for other providers in the future.

### 2. Update Consumers
I will update the following files to use the new `ContextCacheManager`:
-   `packages/adk/src/models/ai-sdk.ts`: Switch from `AiSdkCacheManager` to `ContextCacheManager`.
-   `packages/adk/src/models/google-llm.ts`: Switch from `GeminiContextCacheManager` to `ContextCacheManager`.
-   `packages/adk/src/models/index.ts`: Export the new module.

### 3. Cleanup
I will delete `packages/adk/src/models/ai-sdk-cache-manager.ts` as it is no longer needed.
