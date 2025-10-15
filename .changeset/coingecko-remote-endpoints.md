---
"@iqai/adk": minor
---

Enhanced CoinGecko MCP server support with remote endpoints

- **Enhanced createMcpConfig function**: Now automatically detects URLs and uses `mcp-remote` for remote MCP endpoints while maintaining backward compatibility with npm packages
- **Updated McpCoinGecko**: Now uses the remote CoinGecko MCP API endpoint (`https://mcp.api.coingecko.com/mcp`) instead of the npm package
- **Added McpCoinGeckoPro**: New function for accessing the professional CoinGecko MCP API endpoint (`https://mcp.pro-api.coingecko.com/mcp`) with enhanced features and higher rate limits
- **Improved code maintainability**: Refactored both CoinGecko functions to use the enhanced `createMcpConfig`, eliminating code duplication
- **Added documentation**: Updated module documentation with examples showing how to use both CoinGecko functions

This change enables seamless integration with CoinGecko's remote MCP endpoints while providing a cleaner, more maintainable codebase for future remote endpoint integrations.