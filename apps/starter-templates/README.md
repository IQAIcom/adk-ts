
<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>

# ADK Starter Templates

**Ready-to-use project templates for building AI agents with the Agent Development Kit (ADK) for TypeScript**

_Quick Start • Multiple Frameworks • Production Ready_

---

</div>

This directory contains starter templates for ADK projects. These templates are **not published to npm** and are excluded from the main workspace to prevent build issues during the release process.

## Available Templates

- `discord-bot` - Discord bot starter template
- `hono-server` - Hono server starter template  
- `mcp-starter` - MCP (Model Context Protocol) starter template
- `simple-agent` - Simple agent starter template
- `telegram-bot` - Telegram bot starter template

## Usage

Each starter template now includes an `agents/` folder with `agent.ts` files containing agent definitions, making them compatible with the ADK CLI for easy testing and interaction.

### Option 1: Direct Development
1. Navigate to the specific template directory
2. Install dependencies: `pnpm install`
3. Build: `pnpm build`
4. Run: `pnpm dev` or `pnpm start`

### Option 2: ADK CLI (Recommended for Testing)
First, install the ADK CLI globally:
```bash
npm install -g @iqai/adk-cli
```

Then navigate to any template directory and use:

**Interactive CLI Chat:**
```bash
adk run
```
Opens a command-line interface to chat with agents defined in `agents/agent.ts`

**Web Interface:**
```bash
adk web
```
Opens a web interface in your browser to chat with your agents - perfect for easy testing and demonstration

## Note

These templates have their own `pnpm-workspace.yaml` configuration and are isolated from the main monorepo workspace to prevent them from being included in the CI/CD pipeline and npm publishing process.
