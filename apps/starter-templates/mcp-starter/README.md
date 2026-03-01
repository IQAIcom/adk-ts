<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS MCP Server Template</h1>
  <b>Starter template for building MCP servers with FastMCP and TypeScript</b>
  <br/>
  <i>MCP • FastMCP • Tool servers • TypeScript</i>
</div>

---

# MCP Server Template - Practical Guide for Custom Tool Servers

A practical starter for building Model Context Protocol (MCP) servers with FastMCP. It includes a weather tool example and a clean structure for scaling to additional tools.

**Built with [ADK-TS](https://adk.iqai.com/) ecosystem tools**

## 🎯 Features

- **FastMCP server foundation** with TypeScript.
- **Weather tool example** using OpenWeather API.
- **Separated folders** for config, services, and tools.
- **Build + runtime scripts** for local development and deployment.

## 🏗️ How It Works

```text
MCP Client (Agent/App)
   |
   v
FastMCP Server (src/index.ts)
   |
   v
Registered Tools (src/tools/*)
   |
   v
Services + External APIs (src/services/*)
```

## 🚀 Quick Start

Use either approach:

- **Recommended**: scaffold a fresh project with the ADK-TS CLI.
- **Alternative**: clone the repository and copy this template folder into your own project.

### Prerequisites

- Node.js 18+
- pnpm
- OpenWeather API key from [OpenWeather](https://openweathermap.org/api)

### Step 1: Create the project

```bash
npx @iqai/adk-cli new --template mcp-starter my-mcp-server
cd my-mcp-server
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

### Step 4: Run the MCP server

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
├── index.ts                # MCP server bootstrap and tool registration
├── constants.ts            # App constants
├── lib/
│   ├── config.ts           # Env and runtime config helpers
│   └── http.ts             # HTTP utility functions
├── services/
│   └── weather-service.ts  # OpenWeather integration service
└── tools/
    └── weather.ts          # MCP weather tool definition
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
- [MCP Tools Docs](https://adk.iqai.com/docs/framework/tools/mcp-tools) - integration patterns for MCP with ADK-TS.

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/mcp-starter) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new MCP tool examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to build MCP servers with TypeScript and FastMCP.
