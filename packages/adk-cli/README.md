<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>

# @iqai/adk-cli

**Command-line interface for the ADK (Agent Development Kit) - a comprehensive toolkit for creating, running, and testing AI agents.**

*Interactive Development • Agent Management • Production Ready*

<p align="center">
  <a href="https://www.npmjs.com/package/@iqai/adk-cli">
    <img src="https://img.shields.io/npm/v/@iqai/adk-cli" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/@iqai/adk-cli">
    <img src="https://img.shields.io/npm/dm/@iqai/adk-cli" alt="NPM Downloads" />
  </a>
  <a href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md">
    <img src="https://img.shields.io/npm/l/@iqai/adk-cli" alt="License" />
  </a>
  <a href="https://github.com/IQAIcom/adk-ts">
    <img src="https://img.shields.io/github/stars/IQAIcom/adk-ts?style=social" alt="GitHub Stars" />
  </a>
</p>

---

</div>

## 🌟 Overview

The ADK CLI provides a complete toolkit for developing, testing, and deploying AI agents. It streamlines the development workflow from project creation to production deployment with powerful features like interactive testing interfaces and intelligent agent discovery.

## 🚀 Key Features

- **🏗️ Project Scaffolding** - Create projects from professional templates with one command
- **🌐 Web Interface** - React-based UI for visual agent testing and management
- **🤖 Interactive Chat** - Terminal-based chat interface for quick agent testing
- **📡 API Server** - RESTful API for agent management and messaging
- **🔍 Smart Discovery** - Automatically finds and loads agents from your project
- **📦 Multi-Template Support** - Templates for Discord bots, web servers, MCP servers, and more

## 🚀 Quick Start

### Installation

```bash
npm install -g @iqai/adk-cli
```

### Create Your First Agent

```bash
# Interactive project creation
adk new

# Or create with specific template
adk new my-agent --template simple-agent
cd my-agent

# Start developing
adk run

# Test with web interface
adk web
```

## 📚 Commands

### `adk new`

Create a new ADK project from professionally maintained templates.

```bash
# Interactive project creation with guided setup
adk new

# Create with specific name and template
adk new my-agent --template simple-agent
```

**Available Templates:**
- `simple-agent` - Basic agent with chat capabilities and examples
- `discord-bot` - Agent integrated with Discord bot framework
- `telegram-bot` - Agent integrated with Telegram bot API  
- `hono-server` - Web server with RESTful agent endpoints
- `shade-agent` – Agent with Near Shade Agents
- `mcp-starter` - Model Context Protocol server integration

### `adk run`

Run agents with intelligent discovery and interactive chat interface.

```bash
# Auto-discover and run agent from current directory
adk run

# Run specific agent with path
adk run path/to/agent.ts

# Server-only mode (no chat interface)
adk run --server

# Custom host for server mode
adk run --server --host 0.0.0.0
```

**Agent Discovery:**
- Scans current directory recursively for `agent.ts` or `agent.js` files
- Skips common directories: `node_modules`, `.git`, `dist`, `build`, `.next`, `.turbo`, `coverage`, `.vscode`, `.idea`
- Shows interactive selector when multiple agents found

### `adk web`

Launch a React-based web interface for visual agent testing and management.

```bash
# Start web interface with default settings
adk web

# Use specific API server port
adk web --port 8080

# Scan custom directory for agents
adk web --dir ./my-agents

# Run local development version
adk web --local --web-port 3000

# Custom web application URL
adk web --web-url https://custom-web-app.com
```

**Web Interface Features:**
- 🎯 **Visual Agent Browser** - Browse and select from discovered agents
- 💬 **Interactive Chat** - Real-time chat interface with message history
- 📊 **Agent Status Monitoring** - Live status updates and health checks
-  **Responsive Design** - Works seamlessly on desktop and mobile

### `adk serve`

Start a standalone API server for agent management without the chat interface.

```bash
# Start API server on default port 8042
adk serve

# Custom host and port configuration
adk serve --host 0.0.0.0 --port 9000

# Scan specific directory for agents
adk serve --dir ./production-agents
```

**API Endpoints:**
- `GET /api/agents` - List all discovered agents
- `POST /api/agents/refresh` - Refresh agent discovery scan
- `POST /api/agents/:id/start` - Start a specific agent
- `POST /api/agents/:id/stop` - Stop a specific agent
- `GET /api/agents/running` - Get status of running agents
- `POST /api/agents/:id/message` - Send message to specific agent
- `GET /api/agents/:id/messages` - Get conversation history
- `GET /health` - Server health check



## 💡 Usage Examples

### Development Workflow

```bash
# 1. Create new project
adk new my-ai-assistant --template simple-agent
cd my-ai-assistant

# 2. Install dependencies (if not auto-installed)
npm install

# 3. Start development
adk run

# 4. In another terminal, start web interface
adk web --local
```

### Multi-Agent Development

```bash
# Create multiple agent files
mkdir -p agents
echo 'import { LlmAgent } from "@iqai/adk"; export const agent = new LlmAgent({ name: "chatbot" });' > agents/chatbot.ts
echo 'import { LlmAgent } from "@iqai/adk"; export const agent = new LlmAgent({ name: "assistant" });' > agents/assistant.ts

# Web interface will discover all agents automatically
adk web
```

### Production Deployment

```bash
# Start API server in production mode
adk serve --host 0.0.0.0 --port 8042

# Health check endpoint available at
curl http://localhost:8042/health
```

### Testing and Integration

```bash
# Quick agent testing
adk run my-agent.ts

# API testing with curl
curl -X POST http://localhost:8042/api/agents/my-agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, agent!"}'

# Get conversation history
curl http://localhost:8042/api/agents/my-agent/messages
```

## ⚙️ Configuration

### Agent File Requirements

Each agent file must export an agent instance:

```typescript
// agent.ts
import { LlmAgent } from '@iqai/adk';

export const agent = new LlmAgent({
  name: "my_agent",
  model: "gpt-4-turbo",
  description: "A helpful assistant agent",
  instruction: "You are a helpful AI assistant."
});
```



## 📚 Documentation

For comprehensive guides, API reference, and advanced examples:

**[https://adk.iqai.com](https://adk.iqai.com)**

The documentation includes:
- Getting started tutorials
- CLI command reference
- Agent development patterns
- Deployment strategies
- Troubleshooting guides

## 🧪 Examples

Explore comprehensive examples in the main repository:

```bash
# Clone the repository
git clone https://github.com/IQAIcom/adk-ts
cd adk-ts/apps/examples

# Install dependencies
pnpm install

# Run examples with the CLI
adk run
```

## 🔧 Requirements

- **Node.js** v22.0 or higher
- **npm**, **yarn**, **pnpm**, or **bun** (for project creation)
 - **TypeScript** support (handled automatically)

## 🤝 Contributing

Contributions are welcome! See our [Contributing Guide](https://github.com/IQAIcom/adk-ts/blob/main/CONTRIBUTION.md) for details.

## 📜 License

MIT License - see [LICENSE](https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md) for details.

---

**Ready to build your first AI agent?** Visit [https://adk.iqai.com](https://adk.iqai.com) to get started!
