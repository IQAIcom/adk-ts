---
"@iqai/adk": minor
---

Add popular third-party MCP server wrappers and fix tool name handling

- Add `McpNotion`, `McpSequentialThinking`, and `McpPlaywright` server wrapper functions
- Fix MCP tool name sanitization: hyphens in tool names (e.g. `notion-search`) are now replaced with underscores to pass BaseTool validation, while preserving the original name for MCP server calls
