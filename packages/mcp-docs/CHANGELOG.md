# @iqai/mcp-docs

## 0.1.7

### Patch Changes

- Updated dependencies [d25219b]
- Updated dependencies [2336621]
- Updated dependencies [b4b6887]
- Updated dependencies [751b3e9]
- Updated dependencies [800239b]
- Updated dependencies [d35873a]
- Updated dependencies [c6ff7ef]
- Updated dependencies [fbb3c30]
- Updated dependencies [7c9ddf6]
  - @iqai/adk@0.8.5

## 0.1.6

### Patch Changes

- Updated dependencies [621aa3f]
  - @iqai/adk@0.8.4

## 0.1.5

### Patch Changes

- Updated dependencies [0c189c7]
  - @iqai/adk@0.8.3

## 0.1.4

### Patch Changes

- Updated dependencies [c1093ed]
- Updated dependencies [deb7ec5]
  - @iqai/adk@0.8.2

## 0.1.3

### Patch Changes

- Updated dependencies [58eeac4]
  - @iqai/adk@0.8.1

## 0.1.2

### Patch Changes

- Updated dependencies [d7d8b78]
  - @iqai/adk@0.8.0

## 0.1.1

### Patch Changes

- d671e06: Add `ToolOutputFilterPlugin` to intelligently reduce large tool outputs before downstream processing.

  The plugin dynamically generates safe `jq` filters using an LLM to extract only relevant data, applying adaptive and iterative filtering until configurable size or key-count targets are met. This improves performance, prevents context window overflows, and supports per-tool enablement, schema-aware filtering, and strict security checks against unsafe filters.

- Updated dependencies [6e3eddc]
- Updated dependencies [df81392]
- Updated dependencies [7066213]
- Updated dependencies [d671e06]
- Updated dependencies [8bf7a31]
  - @iqai/adk@0.7.0

## 0.1.0

### Minor Changes

- e0d20c0: Initial release of MCP Docs server - an MCP server for accessing ADK-TS documentation, examples, API reference, and MCP server integrations. Features include:
  - Documentation fetching and caching from ADK-TS docs site
  - Code example retrieval and search
  - API reference access
  - MCP server integration examples
  - Built on FastMCP with support for resources and tools
