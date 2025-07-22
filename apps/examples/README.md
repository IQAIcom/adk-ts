<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>

# ADK Examples

**A collection of comprehensive examples that demonstrate how to utilize the Agent Development Kit (ADK) for TypeScript in real-world scenarios**

*Agent Building • Tool Integration • Memory Systems • Advanced Features*

---

</div>

This directory contains a collection of comprehensive examples that demonstrate how to utilize the Agent Development Kit (ADK) for TypeScript in real-world scenarios. You can use these examples to learn how to build AI agents, integrate tools, manage memory, and implement advanced features.

## 🚀 Quick Start

### Prerequisites

Before running the examples, here's what you need:

- **Node.js 22.0+** (or as specified in the `package.json` file)
- **API Keys** for your chosen LLM provider(s)

Note: this project uses [**pnpm**](https://pnpm.io/) as the package manager. You can use other package managers, but to have a better experience, please install pnpm globally on your system.

### Setup Instructions

1. **Clone the Repository and Install the Dependencies**

 ```bash
   git clone https://github.com/IQAIcom/adk-ts.git
   cd adk-ts
   pnpm install
 ```

2. **Build the ADK Package**

For the examples to work correctly, you need to build the core ADK package first. This step compiles the TypeScript code and prepares the necessary files.

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
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_API_KEY=your_google_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
 ```

The default model is set to `gemini-2.5-flash`, `gemini-2.0-flash` or `gemini-2.5-pro` depending on the example. If you want to use a different model, you can specify it in the `.env` file using the `LLM_MODEL` variable or update it directly in the example code.

4. **Run Examples**

To explore the examples, run the following command:

 ```bash
   cd apps/examples 
   pnpm start
 ```

## 📚 Explore Example Applications

There are over 20 examples available, covering a wide range of use cases from basic agent setups to advanced multi-agent systems. Here are some of them organized by category to help you get started:

### 🎯 **Getting Started Examples**

| Example | Description | Best For |
|---------|-------------|----------|
| **[simple-agent](src/simple-agent/)** | Basic agent setup and conversation | First-time users |
| **[agent-builder-example](src/agent-builder-example/)** | Comprehensive AgentBuilder patterns | Understanding core concepts |

### 🛠️ **Tool Integration Examples**

| Example | Description | Features |
|---------|-------------|----------|
| **[tool-usage](src/tool-usage/)** | Custom tools with calculator and weather APIs | Function calling, API integration |
| **[create-tool](src/create-tool/)** | Converting regular functions to agent tools using createTool | Simple tool creation |
| **[http-request-tool](src/http-request-tool/)** | HTTP requests and API interactions | External service integration |

### 🧠 **Memory & State Examples**

| Example | Description | Features |
|---------|-------------|----------|
| **[memory-usage](src/memory-usage/)** | Persistent memory across conversations | Context preservation |
| **[database-session-example](src/database-session-example/)** | Database-backed session management | Persistent storage |
| **[artifact-example](src/artifact-example/)** | File creation and management | Document handling, versioning |

### 🤝 **Multi-Agent Examples**

| Example | Description | Features |
|---------|-------------|----------|
| **[specialized-agents](src/specialized-agents/)** | Multiple specialized agents working together | Agent coordination |
| **[transfer-to-agent-tool](src/transfer-to-agent-tool/)** | Agent delegation and transfers | Conversation handoffs |

### 🧩 **Advanced Examples**

| Example | Description | Features |
|---------|-------------|----------|
| **[planner-usage](src/planner-usage/)** | Step-by-step task planning and execution | Task decomposition |
| **[flows-example](src/flows-example/)** | Custom flow processors and pipeline extensions | Request/response processing |
| **[telemetry-agent](src/telemetry-agent/)** | Observability and monitoring integration | Performance tracking |

### 🔌 **Integration Examples**

| Example | Description | Features |
|---------|-------------|----------|
| **[mcp-filesystem](src/mcp-filesystem/)** | Model Context Protocol file system integration | MCP tools |
| **[mcp-sampling](src/mcp-sampling/)** | MCP sampling and data processing | Data handling |
| **[mcp-atp-agent](src/mcp-atp-agent/)** | Advanced MCP agent patterns | Complex integrations |

## 🤝 Contributing

We welcome contributions! The following are ways you can help:

### 📝 **Documentation**

- Improve existing example documentation
- Add new example scenarios
- Fix typos or unclear instructions

### 🛠️ **Code Contributions**

- Add new example applications
- Improve existing examples
- Fix bugs or performance issues

For a comprehensive guide on how to contribute to this project, visit the [Contributing Guide](../../CONTRIBUTION.md).

### 📚 **Resources**

- **[Main Documentation (WIP)](https://adk.iqai.com/docs)** - Core ADK documentation
- **[Contributing Guide](../../CONTRIBUTION.md)** - Detailed contribution guidelines
- **[Code of Conduct](../../CODE_OF_CONDUCT.md)** - Community standards
- **[Security Policy](../../SECURITY.md)** - Security reporting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](../../LICENSE.md) file for details.

---

💡 **Pro Tip**: Start with `simple-agent` or `agent-builder-example` to understand the basics, then explore more advanced examples based on your use case!
