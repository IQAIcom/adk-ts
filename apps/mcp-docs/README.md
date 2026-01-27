# @iqai/mcp-docs-server

A Model Context Protocol (MCP) server that provides AI assistants with direct access to ADK-TS (Agent Development Kit for TypeScript) complete knowledge base. This includes:

- 📚 **Comprehensive documentation** with MDX support
- 💻 **Code examples** for common patterns
- 📝 **Package changelogs** for version updates
- 🔌 **MCP server catalog** for available integrations
- 🔍 **API reference** for functions, classes, and types

## Installation

### In Cursor

Create or update `.cursor/mcp.json` in your project root:

**macOS/Linux:**

```json
{
  "mcpServers": {
    "adk-docs": {
      "command": "npx",
      "args": ["-y", "@iqai/mcp-docs-server"]
    }
  }
}
```

**Windows:**

```json
{
  "mcpServers": {
    "adk-docs": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@iqai/mcp-docs-server"]
    }
  }
}
```

### In Windsurf

Create or update `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "adk-docs": {
      "command": "npx",
      "args": ["-y", "@iqai/mcp-docs-server"]
    }
  }
}
```

### In Claude Code

```sh
claude mcp add adk-docs -- npx -y @iqai/mcp-docs-server
```

### In an ADK-TS Agent

```typescript
import { MCPClient } from "@iqai/adk-core";
import { Agent } from "@iqai/adk-core";

const mcp = new MCPClient({
  servers: {
    docs: {
      command: "npx",
      args: ["-y", "@iqai/mcp-docs-server"],
    },
  },
});

const agent = new Agent({
  name: "doc-assistant",
  model: "gemini-2.0-flash",
  tools: await mcp.listTools(),
});
```

## Tools

### `adkDocs`

Get ADK-TS documentation by requesting specific paths. Supports:

- Multiple paths in a single request
- Directory exploration
- Keyword-based content suggestions

### `adkSearch`

Search documentation with TF-IDF-based ranking:

- Full-text search across all docs
- Category filtering (framework, agents, tools, etc.)
- Relevance-scored results

### `adkExamples`

Access code examples:

- List all available examples
- Get specific example source code
- Keyword matching for finding relevant examples

### `adkChanges`

Get package changelogs:

- List all package changelogs
- Fetch specific package changelog content

### `adkMcpServers`

Catalog of available MCP server integrations:

- List all MCP servers by category
- Get configuration examples
- Installation instructions

### `adkApi`

API reference lookup:

- Search for functions, classes, types
- Get signatures and examples
- Links to full TypeDoc documentation

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## License

Apache-2.0
