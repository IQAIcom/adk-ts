<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS Discord Bot Template</h1>
  <b>Starter template for creating AI Discord bots with ADK-TS and MCP</b>
  <br/>
  <i>Discord • MCP • Persistent conversations • TypeScript</i>
</div>

---

# Discord Bot Template - AI Assistant for Discord Servers

A practical starter for building Discord bots powered by ADK-TS agents. It includes MCP integration, multi-agent routing, and local persistence for conversation context.

**Built with [ADK-TS](https://adk.iqai.com/) - The TypeScript-native AI Agent Framework**

## 🎯 Features

- **Discord MCP integration** for message handling and actions.
- **Root + specialist agents** for modular behavior.
- **Persistent local storage** for context-aware interactions.
- **Simple scripts** for development and production workflows.

## 🏗️ How It Works

```text
Discord Message
   |
   v
Discord MCP Toolset
   |
   v
ADK-TS Root Agent
   |--- delegates weather intents
   |--- delegates joke intents
   |
   v
Response sent back to Discord
```

## 🚀 Quick Start

Use either approach:

- **Recommended**: scaffold a fresh project with the ADK-TS CLI.
- **Alternative**: clone the repository and copy this template folder into your own project.

### Prerequisites

- Node.js 18+
- pnpm
- Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)
- Google AI API key from [Google AI Studio](https://aistudio.google.com/api-keys)

### Step 1: Create the project

```bash
npx @iqai/adk-cli new --template discord-bot my-discord-bot
cd my-discord-bot
```

### Step 2: Install dependencies

```bash
pnpm install
```

### Step 3: Configure environment variables

```bash
cp .env.example .env
```

The `.env.example` file includes required and optional values, plus key URLs.

### Step 4: Run the bot

```bash
pnpm dev
```

### Step 5: Build and run production

```bash
pnpm build
pnpm start
```

## 📁 Template Structure

```text
src/
├── agents/                   # Agent orchestration and specialist agents
│   ├── agent.ts              # Root agent entry
│   ├── discord-agent/        # Discord MCP integration agent
│   ├── weather-agent/        # Weather specialist agent
│   └── joke-agent/           # Joke specialist agent
├── env.ts                    # Environment schema and validation
└── index.ts                  # Discord bot bootstrap
```

## 🧪 Test with ADK-TS CLI

From your project directory, you can test agents without writing custom test scripts.

```bash
# Option 1: Install ADK-TS CLI globally, then run
pnpm install -g @iqai/adk-cli
adk run
adk web

# Option 2: Use npx without global install
npx @iqai/adk-cli run
npx @iqai/adk-cli web
```

- `adk run`: interactive terminal chat with your agent(s).
- `adk web`: launches a local server and opens the ADK-TS web interface.

## 📚 Learn More

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAICOM/adk-ts)
- [ADK-TS Sample Projects](https://github.com/IQAIcom/adk-ts-samples)
- [MCP Discord Documentation](https://adk.iqai.com/docs/mcp-servers/discord) - Discord MCP setup and behavior.

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/discord-bot) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to build AI-powered Discord bots with ADK-TS.
