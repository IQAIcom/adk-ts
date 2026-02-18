<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS Simple Agent Template</h1>
  <b>Starter template for creating AI agents with ADK-TS</b>
  <br/>
  <i>Multi-agent • Tool calling • TypeScript</i>
</div>

---

# Simple Agent Template - Practical Starter for ADK-TS

A practical starter that shows how to build a root agent that delegates to specialist agents, with tool integration and a simple local development workflow.

**Built with [ADK-TS](https://adk.iqai.com/) - The TypeScript-native AI Agent Framework**

## 🎯 Features

- **Root + sub-agent orchestration** with clear responsibilities.
- **Weather and joke specialist agents** as concrete examples.
- **Tool-driven workflows** that call external services.
- **Fast local iteration** with `pnpm dev` and ADK-TS CLI testing.

## 🏗️ How It Works

```text
User Input
   |
   v
Root Agent (src/agents/agent.ts)
   |--- delegates weather requests --> Weather Agent + tools
   |--- delegates fun requests -----> Joke Agent + tools
```

## 🚀 Quick Start

Use either approach:

- **Recommended**: scaffold a fresh project with the ADK-TS CLI.
- **Alternative**: clone the repository and copy this template folder into your own project.

### Prerequisites

- Node.js 18+
- pnpm
- Google AI API key from [Google AI Studio](https://aistudio.google.com/api-keys)

### Step 1: Create the project

```bash
npx @iqai/adk-cli new --template simple-agent my-agent
cd my-agent
```

### Step 2: Install dependencies

```bash
pnpm install
```

### Step 3: Configure environment variables

```bash
cp .env.example .env
```

Required and optional values are documented in `.env.example`.

### Step 4: Run the template

```bash
pnpm dev
```

### Step 5: Test agents with ADK-TS CLI (optional)

```bash
npx @iqai/adk-cli run
npx @iqai/adk-cli web
```

## 📁 Template Structure

```text
src/
├── agents/                 # Agent definitions and orchestration
│   ├── agent.ts            # Root agent that delegates user requests
│   ├── weather-agent/
│   │   ├── agent.ts        # Weather specialist agent
│   │   └── tools.ts        # Weather tools and API calls
│   └── joke-agent/
│       ├── agent.ts        # Joke specialist agent
│       └── tools.ts        # Joke tools
├── env.ts                  # Environment schema and validation
└── index.ts                # App entry point
```

## 📚 Learn More

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAICOM/adk-ts)
- [ADK-TS Sample Projects](https://github.com/IQAIcom/adk-ts-samples)

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/simple-agent) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to start building multi-agent applications with ADK-TS.
