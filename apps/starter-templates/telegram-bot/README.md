<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS Telegram Bot Template</h1>
  <b>Starter template for creating AI Telegram bots with ADK-TS and MCP</b>
  <br/>
  <i>Telegram • MCP • Persistent conversations • TypeScript</i>
</div>

---

# Telegram Bot Template - AI Assistant for Telegram

A practical starter for building Telegram bots powered by ADK-TS agents. It includes MCP integration, multi-agent routing, and local persistence for conversation context.

**Built with [ADK-TS](https://adk.iqai.com/) - The TypeScript-native AI Agent Framework**

## 🎯 Features

- **Telegram MCP integration** for bot actions and message handling.
- **Root + specialist agents** for flexible response behavior.
- **Persistent local storage** for bot conversation context.
- **Simple scripts** for development and production use.

## 🏗️ How It Works

```text
Telegram Message
   |
   v
Telegram MCP Toolset
   |
   v
ADK-TS Root Agent
   |--- delegates weather intents
   |--- delegates joke intents
   |
   v
Response sent back to Telegram
```

## 🚀 Quick Start

Use either approach:

- **Recommended**: scaffold a fresh project with the ADK-TS CLI.
- **Alternative**: clone the repository and copy this template folder into your own project.

### Prerequisites

- Node.js 18+
- pnpm
- Telegram bot token from [@BotFather](https://t.me/botfather)
- Google AI API key from [Google AI Studio](https://aistudio.google.com/api-keys)

### Step 1: Create the project

```bash
npx @iqai/adk-cli new --template telegram-bot my-telegram-bot
cd my-telegram-bot
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
│   ├── telegram-agent/       # Telegram MCP integration agent
│   ├── weather-agent/        # Weather specialist agent
│   └── joke-agent/           # Joke specialist agent
├── env.ts                    # Environment schema and validation
└── index.ts                  # Telegram bot bootstrap
```

## 📚 Learn More

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAICOM/adk-ts)
- [ADK-TS Sample Projects](https://github.com/IQAIcom/adk-ts-samples)
- [MCP Telegram Documentation](https://adk.iqai.com/docs/mcp-servers/telegram) - Telegram MCP setup and behavior.

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/telegram-bot) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to build AI-powered Telegram bots with ADK-TS.
