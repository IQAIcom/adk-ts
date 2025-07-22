<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>

# ADK Starter Templates

**Ready-to-use project templates for building AI agents with the Agent Development Kit (ADK) for TypeScript**

*Quick Start • Multiple Frameworks • Production Ready*

---

</div>

This directory contains starter templates for ADK projects. These templates are **not published to npm** and are excluded from the main workspace to prevent build issues during the release process.

## Available Templates

- `discord-bot` - Discord bot starter template
- `hono-server` - Hono server starter template  
- `mcp-starter` - MCP (Model Context Protocol) starter template
- `simple-agent` - Simple agent starter template
- `telegram-bot` - Telegram bot starter template

## Development

To work with these templates:

1. Navigate to the specific template directory
2. Install dependencies: `pnpm install`
3. Build: `pnpm build`
4. Run: `pnpm dev` or `pnpm start`

## Note

These templates have their own `pnpm-workspace.yaml` configuration and are isolated from the main monorepo workspace to prevent them from being included in the CI/CD pipeline and npm publishing process.
