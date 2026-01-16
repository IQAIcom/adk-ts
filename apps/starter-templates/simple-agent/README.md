<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />
  <br/>
  <h1>ADK-TS Simple Agent Template</h1>
  <b>Starter template for creating AI Agents with ADK-TS</b>
  <br/>
  <i>Minimal • Extensible • TypeScript</i>
</div>

---

# Simple Agent Template - Getting Started with AI Agents

A minimal starter template that shows you how to build AI agents with multi-agent coordination and custom tool integration using ADK-TS.

**Built with [ADK-TS](https://adk.iqai.com/) - Agent Development Kit (ADK) for TypeScript**

## 🎯 What This Template Shows

This template demonstrates how to build **AI-powered applications** with:

1. **🤖 Multi-Agent Architecture**:

   - **Root Agent**: Orchestrates and delegates to specialist agents
   - **Weather Agent**: Provides weather information with custom tools
   - **Joke Agent**: Tells jokes with dynamic tool integration

2. **🛠️ Custom Tool Integration**:

   - Weather API integration
   - Joke API integration
   - Dynamic function tools
   - Tool-based agent capabilities

3. **⚡ Fast Development Workflow**:
   - Interactive CLI testing
   - Web-based agent interface
   - Hot reload development

## 🏗️ How It Works

```
┌─────────────────┐    ┌───────────────────┐    ┌─────────────────────┐
│   Root Agent    │    │   Weather Agent   │    │    Joke Agent       │
│                 │───▶│                   │    │                     │
│ • Orchestrates  │    │ • Weather Tools   │    │ • Joke Tools        │
│ • Delegates     │    │ • API Integration │    │ • Dynamic Content   │
└─────────────────┘    └───────────────────┘    └─────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- A Google account (for free AI API access)

## Step 1: Create Project Using ADK CLI

```bash
# Create a new project with the Simple Agent template (replace "my-agent" with your desired project name)
npx @iqai/adk-cli new --template simple-agent my-agent

# Navigate to your project and install dependencies
cd my-agent
pnpm install
```

### Step 2: Get Your API Key

#### 🔑 Google AI API Key (Required)

1. Visit [Google AI Studio](https://aistudio.google.com/api-keys)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your Google AI API key:

```env
GOOGLE_API_KEY=your_google_api_key_here
```

### Step 4: Run Your Agent

#### Production/Development Mode

To run your agent with the full application flow:

```bash
pnpm dev
```

#### Interactive Testing (Recommended for Development)

For rapid prototyping and testing, use the ADK CLI:

```bash
# Interactive CLI chat interface
npx @iqai/adk-cli run

# Web-based interface for testing
npx @iqai/adk-cli web
```

- **`run`**: Test agents directly in your terminal with interactive chat
- **`web`**: Opens a browser interface for visual agent testing

## 📁 Template Structure

```text
src/
├── agents/
│   ├── agent.ts              # Root agent orchestrator
│   ├── joke-agent/           # Joke-telling specialist
│   │   ├── agent.ts          # Agent configuration
│   │   └── tools.ts          # Custom joke tools
│   └── weather-agent/        # Weather information specialist
│       ├── agent.ts          # Agent configuration
│       └── tools.ts          # Weather API tools
├── env.ts                    # Environment validation
└── index.ts                  # Main execution entry
```

## 🔧 Customizing the Template

### Adding New Agents

1. Create a new agent directory in `src/agents/`
2. Follow the pattern from existing agents (weather-agent or joke-agent)
3. Add the agent to the root agent's `subAgents` array in `src/agents/agent.ts`

Example structure:

```text
src/agents/my-new-agent/
├── agent.ts    # Agent configuration
└── tools.ts    # Custom tools (optional)
```

## 📚 Learn More

### ADK-TS Resources

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAICOM/adk-ts)

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/simple-agent) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to start building AI agents with ADK-TS!
