<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS Next.js Starter Template</h1>
  <b>Starter template for creating AI-powered web apps with ADK-TS and Next.js</b>
  <br/>
  <i>Next.js • Agent orchestration • Interactive UI • TypeScript</i>
</div>

---

# Next.js Starter Template - Full-Stack AI App Guide

A practical full-stack starter that combines ADK-TS agents with a Next.js interface, so users can interact with multi-agent workflows from the browser.

**Built with [ADK-TS](https://adk.iqai.com/) - The TypeScript-native AI Agent Framework**

## 🎯 Features

- **Interactive UI** built with Next.js App Router.
- **Root agent orchestration** for routing user requests.
- **Specialist sub-agents** for weather and jokes.
- **Server-side execution** for secure model/API usage.

## 🏗️ How It Works

```text
Browser UI (Next.js)
   |
   v
Server Actions / API Layer
   |
   v
ADK-TS Root Agent
   |--- Weather Agent + weather tools
   |--- Joke Agent + joke tools
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
npx @iqai/adk-cli new --template next-js-starter my-next-agent-app
cd my-next-agent-app
```

### Step 2: Install dependencies

```bash
pnpm install
```

### Step 3: Configure environment variables

```bash
cp .env.example .env.local
```

The `.env.example` file includes required and optional values, plus key URLs.

### Step 4: Run in development

```bash
pnpm dev
```

Open `http://localhost:3000`.

### Step 5: Build and run production

```bash
pnpm build
pnpm start
```

## 📁 Template Structure

```text
src/
├── app/                    # Next.js routes, layouts, and pages
├── agents/                 # ADK agent orchestration layer
│   ├── index.ts            # Root agent entry
│   └── sub-agents/
│       ├── weather-agent/  # Weather specialist
│       └── joke-agent/     # Joke specialist
├── components/             # Reusable UI components
└── lib/                    # Shared utilities
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
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/next-js-starter) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to start building AI-powered web applications with Next.js and ADK-TS!
