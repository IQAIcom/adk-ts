<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS Examples</h1>
  <b>A collection of comprehensive examples that demonstrate how to utilize the Agent Development Kit (ADK) for TypeScript in real-world scenarios</b>
  <br/>
  <i>Agent Building • Tool Integration • Memory Systems • Advanced Feature</i>
</div>

---

## 🌟 Overview

This directory contains a collection of comprehensive examples that demonstrate how to utilize the Agent Development Kit (ADK) for TypeScript in real-world scenarios. You can use these examples to learn how to build AI agents, integrate tools, manage memory, and implement advanced features.

## 🚀 Quick Start

### Prerequisites

Before running the examples, here's what you need:

- **Node.js 22.0+** (or as specified in the `package.json` file)
- **API Keys** for your chosen LLM provider(s)

*Note: this project uses [**pnpm**](https://pnpm.io/) as the package manager. You can use other package managers, but to have a better experience, please install pnpm globally on your system.*

### Setup Instructions

1. **Clone the Repository and Install the Dependencies**

```bash
  git clone https://github.com/IQAIcom/adk-ts.git
  cd adk-ts
  pnpm install
```

2. **Build the ADK-TS Package**

For the examples to work correctly, you need to build the core ADK-TS package first. This step compiles the TypeScript code and prepares the necessary files.

 ```bash
   pnpm build
 ```

3. **Configure Environment Variables**

Create a `.env` file in the **examples directory** (not in the root folder) and add your API keys and optional model configuration. This file is used to set environment variables that the examples will use.

 ```bash
   # apps/examples/.env

   # Optional: Specify which model to use
   LLM_MODEL=your_model_name

   # Required: At least one API key
   GOOGLE_API_KEY=your_google_api_key
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
 ```

The default LLM is Google Gemini. You can get a Google API key from [Google AI Studio](https://makersuite.google.com/app/apikey). If you want to use a different model, you can specify it in the `.env` file using the `LLM_MODEL` variable or update it directly in the example code.

> Note: Some examples require additional configuration or dependencies. Please check the [`.env.example`](.env.example) file for specific instructions.

4. **Run Examples**

To explore the examples, you can either browse all available examples or run a specific one directly:

 ```bash
   cd apps/examples 
   
   # Interactive mode - browse and select an example
   pnpm start
   
   # Or run a specific example directly
   pnpm start --name 01-simple-agent
   pnpm start --name 11-mcp-integrations
 ```

## 📚 Explore Example Applications

We have **8 comprehensive examples** that cover the complete ADK feature set, organized in a logical learning progression from basic concepts to advanced implementations:

### 🎯 **Foundational Examples (01-03)**

| Example | Description | Key Concepts |
|---------|-------------|--------------|
| **[01-getting-started](src/01-getting-started/)** | Basic agent setup and folder structure | AgentBuilder basics, Zod schemas, structured responses |
| **[02-tools-and-state](src/02-tools-and-state/)** | Custom tools with state management | Tool creation, state persistence, system instructions |
| **[03-multi-agent-systems](src/03-multi-agent-systems/)** | Multi-agent systems and coordination | Sub-agents, agent delegation, specialized roles |

### 🔧 **Intermediate Examples (04-05)**

| Example | Description | Key Concepts |
|---------|-------------|--------------|
| **[04-persistence-and-sessions](src/04-persistence-and-sessions/)** | Database integration, artifacts, and session rewind | Session persistence, artifacts, event compaction, time-travel |
| **[05-planning-and-code-execution](src/05-planning-and-code-execution/)** | Planning and code execution capabilities | PlanReActPlanner, BuiltInCodeExecutor, Python sandbox |

### 🚀 **Advanced Examples (06-08)**

| Example | Description | Key Concepts |
|---------|-------------|--------------|
| **[06-mcp-and-integrations](src/06-mcp-and-integrations/)** | Model Context Protocol with custom and external servers | MCP servers, sampling handler, Coingecko integration |
| **[07-guardrails-and-evaluation](src/07-guardrails-and-evaluation/)** | Safety guardrails and agent evaluation | Plugins, lifecycle hooks, content filtering, AgentEvaluator |
| **[08-observability-and-plugins](src/08-observability-and-plugins/)** | Monitoring, tracing, and metrics | OpenTelemetry, Langfuse integration, observability |

## 🤝 Contributing

If you would like to add examples or improve existing ones, please check out our [Contributing Guide](../../CONTRIBUTION.md) for details on how to get started.

---

💡 **Pro Tip**: Follow the examples in order (01-16) for a structured learning path, or jump to specific examples based on your needs. Start with `01-simple-agent` to understand the basics, then explore advanced features like MCP integrations, event compaction, callbacks, and specialized agents!
