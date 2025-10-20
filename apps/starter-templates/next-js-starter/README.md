<div align="center">
 <img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />
 <br/>
 <h1>ADK-TS Next.js Starter Template</h1>
 <b>Starter template for creating AI Agents with ADK-TS and Next.js</b>
 <br/>
  <i>LLM-powered • Agent Orchestration • Interactive UI • TypeScript</i>
</div>

---

# Next.js AI Agent Template - Build Interactive AI Applications

A template for building modern AI-powered web applications using ADK-TS agents with a Next.js frontend. This template demonstrates best practices for integrating AI agents into a full-stack web application.

**Built with [ADK-TS](https://adk.iqai.com/) - Agent Development Kit (ADK) for TypeScript**

## 🎯 What This Template Shows

This template demonstrates how to build **AI-powered web applications** that:

1. **🤖 Uses AI Agents** (built with ADK-TS) with specialized sub-agents:
   - **Joke Agent**: Generates creative jokes on demand
   - **Weather Agent**: Provides real-time weather information

2. **🌐 Provides Modern UI** with Next.js and React for interactive agent interaction

3. **🔄 Orchestrates Agents** through a root agent that routes requests to appropriate sub-agents

4. **⚡ Server-Side Rendering** for optimal performance and SEO

## 🏗️ How It Works

```
┌─────────────────┐    ┌──────────────────┐
│   Next.js UI    │    │   AI Agents      │
│   (React)       │───▶│   (ADK-TS)       │
│ • Interactive   │    │ • Root Agent     │
│ • Real-time     │    │ • Joke Agent     │
│                 │    │ • Weather Agent  │
└─────────────────┘    └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- A Google account (for free AI API access)

### Step 1: Create Project Using ADK CLI

```bash
# Create a new project with the Next.js starter template (replace "my-next-app" with your desired project name)
npx @iqai/adk-cli new --template next-js-starter my-next-app

# Navigate to your project and install dependencies
cd my-next-app
pnpm install
```

### Step 2: Get Your API Keys

#### 🔑 Google AI API Key (Required)

1. Visit [Google AI Studio](https://aistudio.google.com/api-keys)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
GOOGLE_API_KEY=your_google_api_key_here
LLM_MODEL=gemini-1.5-flash
```

### Step 4: Run the Development Server

```bash
# Start the Next.js development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing Your Template

### Interactive Agent Chat

1. Open your browser to [http://localhost:3000](http://localhost:3000)
2. Use the UI to interact with the agents:
   - Ask for a joke: "Tell me a funny joke"
   - Get weather info: "What's the weather in New York?"
3. Watch as the root agent routes your request to the appropriate sub-agent

### Test AI Agents Locally

For development and debugging, you have several options:

```bash
# Run agents in the terminal (CLI interface)
npx @iqai/adk-cli run

# Open a web interface to chat and interact with agents
npx @iqai/adk-cli web
```

- `run`: Test agents directly in your terminal.
- `web`: Opens a browser-based interface for interactive agent testing.

## 📁 Template Structure

```
src/
├── agents/
│   ├── index.ts                 # Root agent orchestrator
│   └── sub-agents/
│       ├── joke-agent/          # Joke generation agent
│       └── weather-agent/       # Weather information agent
├── components/                  # React UI components
├── app/                         # Next.js app directory
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
└── lib/                        # Utility functions
```

## 🔧 Customizing the Template

### Adding New Sub-Agents

1. Create a new directory in `src/agents/sub-agents/`
2. Follow the pattern from existing agents (joke-agent, weather-agent)
3. Add the new agent to the root agent in `src/agents/index.ts`

### Adding New UI Components

1. Create components in `src/components/`
2. Import and use them in `src/app/page.tsx`
3. Style using Tailwind CSS (pre-configured)

## 🐛 Troubleshooting

### "Google API key invalid"

- Ensure the API key is from [Google AI Studio](https://aistudio.google.com/api-keys)
- Make sure there are no extra spaces in your `.env.local` file
- Verify the key hasn't been revoked in the Google Cloud console

### "Cannot find agents"

- Ensure all dependencies are installed: `pnpm install`
- Check that environment variables are properly set
- Verify the `.env.local` file exists and has the correct values

### "Port 3000 is already in use"

```bash
# Run on a different port
pnpm dev -- -p 3001
```

## 📚 Learn More

- [ADK-TS Documentation](https://adk.iqai.com/)
- [ADK-TS CLI Documentation](https://adk.iqai.com/docs/cli)
- [GitHub Repository](https://github.com/IQAICOM/adk-ts)
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

## 🤝 Contributing

This [template](https://github.com/IQAIcom/adk-ts/tree/main/apps/starter-templates/next-js-starter) is open source and contributions are welcome! Feel free to:

- Report bugs or suggest improvements
- Add new agent examples
- Improve documentation
- Share your customizations

---

**🎉 Ready to build?** This template gives you everything you need to start building AI-powered web applications with Next.js and ADK-TS!
