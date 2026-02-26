# @iqai/mcp-docs

A Model Context Protocol (MCP) server that provides AI assistants with direct access to the complete ADK-TS knowledge base. Documentation is fetched directly from the live site at [adk.iqai.com](https://adk.iqai.com) and includes:

- 📚 **Comprehensive documentation** with MDX support
- 💻 **Code examples** for common patterns
- 📝 **Package changelogs** for version updates
- 🔌 **MCP server catalog** for available integrations
- 🔍 **API reference** for functions, classes, and types

Documentation is indexed and persistently cached on disk for up to 24 hours. On startup, the server automatically loads all documentation sections, ensuring lightning-fast search and immediate availability of all knowledge.

## Installation

### In Cursor

Create or update `.cursor/mcp.json` in your project root:

**macOS/Linux:**

```json
{
  "mcpServers": {
    "adk-docs": {
      "command": "npx",
      "args": ["-y", "@iqai/mcp-docs"]
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
      "args": ["/c", "npx", "-y", "@iqai/mcp-docs"]
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
      "args": ["-y", "@iqai/mcp-docs"]
    }
  }
}
```

### In Claude Code

```sh
claude mcp add adk-docs -- npx -y @iqai/mcp-docs
```

### In an ADK-TS Agent

```typescript
import { AgentBuilder, McpToolset } from "@iqai/adk";

// Create MCP toolset for ADK docs
const toolset = new McpToolset({
  name: "ADK Documentation",
  description: "Access ADK-TS documentation and examples",
  transport: {
    mode: "stdio",
    command: "npx",
    args: ["-y", "@iqai/mcp-docs"],
  },
});

// Create agent with MCP tools
const { runner } = await AgentBuilder.create("doc-assistant")
  .withModel("gemini-2.0-flash")
  .withTools(...(await toolset.getTools()))
  .build();

// Use the agent
const response = await runner.ask("How do I create a custom tool?");
```

## Tools

### `adkDocs`

Read the full content of a specific ADK-TS documentation file or directory.

**Features:**

- Access complete documentation pages by path
- Directory exploration with section summaries
- Supports paths with or without file extensions
- Returns suggestions for similar paths when not found

**Example paths:**

- `framework/agents/llm-agents`
- `tools/built-in-tools/google-search`
- `mcp-servers/telegram`

### `adkSearch`

Search ADK-TS documentation by keyword or concept with TF-IDF-based ranking.

**Features:**

- Full-text search across all documentation
- Category filtering (framework, agents, tools, mcp-servers, cli, examples, api, etc.)
- Relevance-scored results with snippets
- Configurable result limits (1-20)
- Exact phrase matching prioritization

### `adkNavigate`

Explore the hierarchical structure of ADK-TS documentation.

**Features:**

- Discover available documentation sections and pages
- Browse documentation organization
- Find exact paths for use with `adkDocs`
- List top-level sections when no path provided

**Use this to:**

- Understand the documentation structure
- Find the right path before reading with `adkDocs`
- Browse available topics and sections

### `adkMcpServers`

List and get details about available MCP server integrations for ADK-TS.

**Features:**

- List all available MCP servers with descriptions
- Get full documentation for specific servers
- Installation and configuration examples
- Integration code samples

**Available servers include:**

- **abi**: Smart contract ABI interactions
- **atp**: IQ AI Agent Tokenization Platform
- **bamm**: Borrow Automated Market Maker on Fraxtal
- **coingecko**: Free cryptocurrency market data
- **coingecko-pro**: Premium crypto market data
- **discord**: Discord bot messaging
- **fraxlend**: Fraxlend lending platform
- **iqwiki**: IQ.wiki data access
- **near-agent**: NEAR Protocol blockchain operations
- **near-intents**: NEAR cross-chain swaps
- **odos**: DEX aggregation
- **polymarket**: Prediction markets
- **telegram**: Telegram bot messaging
- **upbit**: Upbit exchange integration

### `adkInfo`

Get general information about the ADK-TS framework.

**Returns:**

- Framework name and version
- Description and key features
- Homepage and documentation links
- GitHub repository
- List of available MCP servers

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

MIT
