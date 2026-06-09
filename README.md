<div align="center">
  <img src="https://files.catbox.moe/vumztw.png" alt="ADK-TS Logo" width="80" />
  <br/>
  <h1>ADK-TS: The TypeScript-Native AI Agent Framework</h1>
  <b>An open-source framework for building production-ready AI agents in TypeScript. Type-safe, multi-LLM, with built-in tools, sessions, and agent orchestration.</b>
  <br/>
  <i>TypeScript-Native • Multi-Agent Systems • Production-Ready</i>

  <p align="center">
    <a href="https://www.npmjs.com/package/@iqai/adk">
      <img src="https://img.shields.io/npm/v/@iqai/adk" alt="NPM Version" />
    </a>
    <a href="https://www.npmjs.com/package/@iqai/adk">
      <img src="https://img.shields.io/npm/dm/@iqai/adk" alt="NPM Downloads" />
    </a>
    <a href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md">
      <img src="https://img.shields.io/npm/l/@iqai/adk" alt="License" />
    </a>
    <a href="https://github.com/IQAIcom/adk-ts">
      <img src="https://img.shields.io/github/stars/IQAIcom/adk-ts?style=social" alt="GitHub Stars" />
    </a>
  </p>
</div>

---

## 🌟 Overview

ADK-TS is the TypeScript-native framework for building production-ready AI agents. It provides multi-LLM support, advanced tool integration, memory systems, and flexible conversation flows — built from the ground up for TypeScript developers who want to ship intelligent, autonomous systems that handle complex multi-step tasks.

## 🚀 Quick Start

### Getting Started

You can get started in two ways:

- **Create a new project with our CLI:**

  ```bash
  npm install -g @iqai/adk-cli
  adk
  ```

- **Add ADK-TS to an existing project:**

  ```bash
  npm install @iqai/adk
  ```

### Simple Example

```typescript
import { AgentBuilder } from "@iqai/adk";

const response = await AgentBuilder.withModel("gemini-2.5-flash").ask(
  "What is the capital of France?",
);

console.log(response);
```

## 📚 Documentation

For detailed documentation on how to use ADK-TS, please visit our [official documentation site](https://adk.iqai.com/docs/framework/get-started).

## 🚀 Key Features

- **🤖 [Multi-Provider LLM Support](https://adk.iqai.com/docs/framework/agents/models)** - Seamlessly integrate OpenAI, Anthropic, Google, and other leading providers
- **🛠️ [Extensible Tool System](https://adk.iqai.com/docs/framework/tools)** - Define custom tools with declarative schemas for intelligent LLM integration
- **🧠 [Advanced Agent Reasoning](https://adk.iqai.com/docs/framework/agents/custom-agents)** - Complete reasoning loop implementation for complex task execution
- **⚡ [Real-Time Streaming](https://adk.iqai.com/docs/framework/events/streaming)** - Support for streaming responses and dynamic user interactions
- **🔐 [Flexible Authentication](https://adk.iqai.com/docs/framework/events/event-actions#authentication-requests)** - Secure agent API access with multiple auth mechanisms
- **💾 [Persistent Memory Systems](https://adk.iqai.com/docs/framework/sessions/state)** - Context retention and learning from past interactions
- **🔄 [Multi-Agent Orchestration](https://adk.iqai.com/docs/framework/agents/workflow-agents)** - Sequential, parallel, and loop-based agent workflows
- **🖥️ [Prebuilt MCP servers](https://adk.iqai.com/docs/mcp-servers)** - Easily deploy and manage your agents with our prebuilt MCP servers

## 🧪 Examples

For examples of how to use ADK-TS, check out the [`apps/examples`](https://github.com/IQAIcom/adk-ts/tree/main/apps/examples) directory.

You can run the examples by following these steps:

```bash
# 1. Clone and install the repository
git clone https://github.com/IQAIcom/adk-ts.git
cd adk-ts
pnpm install

# 2. Build the ADK-TS package (required for examples to work)
pnpm build

# 3. Setup API keys
cd apps/examples
echo "GOOGLE_API_KEY=your_google_api_key_here" > .env

# 4. Run examples
pnpm start
```

> ⚠️ Important: The examples require API keys from at least one LLM provider. The default LLM is Google Gemini. You can get a Google API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

## 🤝 Contributing

All contributions are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## 🌍 Community

Join our community to discuss ideas, ask questions, and share your projects:

- [GitHub Discussions](https://github.com/IQAIcom/adk-ts/discussions)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🔒 Security

If you discover a security vulnerability within this project, please report it by following our [Security Policy](SECURITY.md). We take security seriously and will respond promptly to any reports.

---

**Ready to build your first AI agent?** Visit [https://adk.iqai.com](https://adk.iqai.com) to get started!
