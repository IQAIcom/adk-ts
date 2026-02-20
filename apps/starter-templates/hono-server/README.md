<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS Hono Server Template</h1>
  <b>Starter template for exposing ADK-TS agents over a REST API</b>
  <br/>
  <i>Hono • REST API • Agent backend • TypeScript</i>
</div>

---

# Hono Server Template - AI Agent API Backend

A practical starter for wrapping ADK-TS agents in a [Hono server](https://hono.dev/), so your frontend or other services can call agent capabilities through HTTP endpoints.

**Built with [ADK-TS](https://adk.iqai.com/) - The TypeScript-native AI Agent Framework**

## 🎯 Features

- **Hono-powered API server** with lightweight performance.
- **Agent-backed `/ask` endpoint** for prompt/response workflows.
- **Production-friendly scripts** (`dev`, `build`, `start`).
- **Clean project structure** for routes, agents, and env config.

## 🏗️ How It Works

```text
HTTP Client
   |
   v
Hono Routes (/ask, /health)
   |
   v
ADK-TS Root Agent
   |--- delegates weather intents
   |--- delegates joke intents
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
npx @iqai/adk-cli new --template hono-server my-hono-agent
cd my-hono-agent
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

### Step 4: Run the API

```bash
pnpm dev
```

Server URL: `http://localhost:3000`

### Step 5: Build and run production

```bash
pnpm build
pnpm start
```

## 🧪 Test the endpoints

```bash
# Check server health
curl http://localhost:3000/health

# Ask a question
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the weather in Lagos?"}'
```

## 📁 Template Structure

```text
src/
├── agents/                 # Agent orchestration and specialist agents
│   ├── agent.ts            # Root agent entry
│   ├── weather-agent/      # Weather specialist agent and tools
│   └── joke-agent/         # Joke specialist agent and tools
├── routes/                 # HTTP route handlers
│   ├── ask.ts              # POST /ask endpoint
│   ├── health.ts           # GET /health endpoint
│   └── index.ts            # GET / endpoint
├── env.ts                  # Environment schema and validation
└── index.ts                # Hono server bootstrap
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
- [Hono Documentation](https://hono.dev/) - learn about Hono routing and middleware.

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/hono-server) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new route examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to build AI-powered API backends with Hono and ADK-TS.
