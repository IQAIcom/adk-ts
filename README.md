<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>

# ADK TS: Agent Development Kit

**A comprehensive TypeScript framework for building sophisticated AI agents with multi-LLM support, advanced tools, and flexible conversation flows.**

*Production-ready • Multi-Agent Systems • Extensible Architecture*

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

---

</div>

## 🌟 Overview

The Agent Development Kit (ADK) for TypeScript provides a comprehensive framework for building sophisticated AI agents with multi-LLM support, advanced tool integration, memory systems, and flexible conversation flows. Built from the ground up for production use, ADK enables developers to create intelligent, autonomous systems that can handle complex multi-step tasks.

## 🚀 Quick Start

### Getting Started

You can get started in two ways:

- **Create a new project with our CLI:**

  ```bash
  npx create-adk-project
  ```

- **Add ADK-TS to an existing project:**

  ```bash
  npm install @iqai/adk dotenv
  ```

### Simple Example

```typescript
import { AgentBuilder } from '@iqai/adk';
import * as dotenv from "dotenv";

dotenv.config();

const response = await AgentBuilder
  .withModel("gemini-2.5-flash")
  .ask("What is the capital of France?");

console.log(response);
```

## 📚 Documentation

Visit our comprehensive [documentation](https://adk.iqai.com) to learn more about:

- [How to get started](https://adk.iqai.com/docs/framework/get-started)
- [Building multi-agent systems](https://adk.iqai.com/docs/framework/agents/multi-agents)
- [Extending Agents with Tools](https://adk.iqai.com/docs/framework/tools)
- [Context Management](https://adk.iqai.com/docs/framework/sessions)
- [Prebuilt MCP Servers](https://adk.iqai.com/docs/mcp-servers)

## 🧪 Examples

For examples of how to use ADK-TS, check out the [`apps/examples`](https://github.com/IQAIcom/adk-ts/tree/main/apps/examples) directory:

```bash
# 1. Clone and install the repository
git clone https://github.com/IQAIcom/adk-ts.git
cd adk-ts
pnpm install

# 2. Build the ADK package (required for examples to work)
pnpm build

# 3. Setup API keys
cd apps/examples
echo "GOOGLE_API_KEY=your_google_api_key_here" > .env

# 4. Run examples
pnpm start
```

> ⚠️ Important: The examples require API keys from at least one LLM provider. The default LLM is Google Gemini. You can get a Google API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTION.md) for details on:

- Framework architecture
- Development setup
- Implementation patterns
- Coding standards

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🔒 Security

If you discover a security vulnerability within this project, please report it by following our [Security Policy](SECURITY.md). We take security seriously and will respond promptly to any reports.

---

**Ready to build your first AI agent?** Visit [https://adk.iqai.com](https://adk.iqai.com) to get started!
