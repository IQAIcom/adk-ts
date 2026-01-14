I have successfully updated the `runAsync` return types in all files within `packages/adk/src/tools/defaults/` and `packages/adk/src/tools/common/` to replace `any` with specific types.

### **Changes Made:**

#### **`tools/defaults/`**

- **`BashTool`** (`bash-tool.ts`): Changed `Promise<any>` to `Promise<BashToolResult>`.
- **`EditTool`** (`edit-tool.ts`): Changed `Promise<any>` to `Promise<EditToolResult>`.
- **`GlobTool`** (`glob-tool.ts`): Changed `Promise<any>` to `Promise<GlobToolResult>`.
- **`ReadTool`** (`read-tool.ts`): Changed `Promise<any>` to `Promise<ReadToolResult>`.
- **`WebFetchTool`** (`web-fetch-tool.ts`): Changed `Promise<any>` to `Promise<WebFetchToolResult>`.
- **`WebSearchTool`** (`web-search-tool.ts`): Changed `Promise<any>` to `Promise<WebSearchToolResult>` (using `z.infer` from existing schema).
- **`WriteTool`** (`write-tool.ts`): Changed `Promise<any>` to `Promise<WriteToolResult>`.
- **`GrepTool`** (`grep-tool.ts`): Already had `Promise<GrepResult>`.

#### **`tools/common/`**

- **`AgentTool`** (`agent-tool.ts`): Changed `Promise<any>` to `Promise<unknown>`.
- **`ExitLoopTool`** (`exit-loop-tool.ts`): Changed `Promise<any>` to `Promise<void>`.
- **`FileOperationsTool`** (`file-operations-tool.ts`): Already had `Promise<FileOperationResult>`.
- **`GetUserChoiceTool`** (`get-user-choice-tool.ts`): Changed `Promise<any>` to `Promise<string | null>`.
- **`GoogleSearch`** (`google-search.ts`): Already had specific return type.
- **`HttpRequestTool`** (`http-request-tool.ts`): Already had `Promise<HttpRequestResult>`.
- **`LoadArtifactsTool`** (`load-artifacts-tool.ts`): Already had specific return type.
- **`LoadMemoryTool`** (`load-memory-tool.ts`): Changed `Promise<any>` to `Promise<LoadMemoryResult>`.
- **`TransferToAgentTool`** (`transfer-to-agent-tool.ts`): Changed `Promise<any>` to `Promise<void>`.
- **`UserInteractionTool`** (`user-interaction-tool.ts`): Already had `Promise<UserInteractionResult>`.

All files in the specified directories are now free of `Promise<any>` in their `runAsync` method signatures.
