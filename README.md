# ADK TypeScript: Agent Development Kit

The Agent Development Kit (ADK) for TypeScript provides a comprehensive framework for building sophisticated AI agents with multi-LLM support, advanced tool integration, memory systems, and flexible conversation flows. Built from the ground up for production use, ADK enables developers to create intelligent, autonomous systems that can handle complex multi-step tasks.

This project is structured as a **Turborepo** monorepo, containing the core ADK package and comprehensive example applications demonstrating real-world usage patterns.

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

## 🚀 Core Capabilities

ADK TypeScript provides a production-ready foundation for building sophisticated AI agents:

*   **Multi-LLM Provider Support:** Seamlessly integrate with OpenAI, Google (Gemini), Anthropic, and more through a unified interface with automatic model routing via the LLM Registry system.
*   **Hierarchical Agent System:** Build complex multi-agent architectures with agent transfers, sub-agent coordination, and conversation delegation between specialized agents.
*   **Advanced Flow System:** Modular request/response processing pipeline with extensible processors for custom logic injection, planning, and tool orchestration.
*   **Comprehensive Tool Integration:** Create custom tools with automatic schema generation, validation, and seamless LLM function calling integration. Supports both class-based tools and simple functions.
*   **Session & State Management:** Persistent conversation handling with delta-aware state management, enabling long-running conversations and context preservation.
*   **Memory Services:** Pluggable memory system for knowledge storage, retrieval, and context enhancement across conversations.
*   **Real-Time Streaming:** Full streaming support for responsive user experiences with event-driven architecture.
*   **Artifact Management:** Built-in file and document handling with versioning, enabling agents to create, modify, and share content.
*   **Planning & Reasoning:** Integrated planning system for step-by-step task decomposition and execution with built-in and custom planner support.

## 🔧 Repository Structure

This repository leverages Turborepo for streamlined monorepo management. The primary components include:

*   `packages/adk`: Contains the core `@iqai/adk` library, which is the fundamental package for building agents.
*   `apps/examples`: Provides a suite of practical example applications demonstrating various ADK features and best practices.

## 🚦 Getting Started

Begin developing AI agents with ADK TypeScript by following these steps:

### 1. Prerequisites
*   Node.js (LTS version recommended; refer to `package.json` `engines` for specific version requirements).
*   Valid API keys for your selected LLM provider(s) (e.g., OpenAI, Anthropic, Google).

### 2. Package Installation
Integrate the `@iqai/adk` package into your project using your preferred package manager:

```bash
# Using npm
npm install @iqai/adk

# Using yarn
yarn add @iqai/adk

# Using pnpm
pnpm add @iqai/adk
```

### 3. Environment Configuration
Create a `.env` file in your project's root directory. Add your API keys to this file; ADK will automatically load these environment variables.

```env
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
```

### 4. Your First Agent Implementation

ADK provides **AgentBuilder**, a fluent interface that simplifies agent creation and eliminates boilerplate code. Here's the simplest way to get started:

#### Simple One-Line Agent
```typescript
import { AgentBuilder } from '@iqai/adk';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

async function main() {
  // Simplest possible usage - one line to create and run an agent
  const response = await AgentBuilder
    .withModel("gemini-2.5-flash") // Supports gpt-4, claude-3-5-sonnet, gemini-pro, etc.
    .ask("What is the primary function of an AI agent?");
  
  console.log(`Agent Response: ${response}`);
}

main().catch(console.error);
```

#### Agent with Instructions and Session Management
```typescript
import { AgentBuilder, InMemorySessionService } from '@iqai/adk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Create an agent with custom instructions and session persistence
  const { agent, runner, session } = await AgentBuilder
    .create("my_assistant")
    .withModel("gemini-2.5-flash")
    .withDescription("A helpful AI assistant")
    .withInstruction("You are an AI assistant. Provide concise and accurate responses.")
    .withSession(new InMemorySessionService(), "user-123", "my-first-app")
    .build();

  if (!runner || !session) {
    throw new Error("Failed to create runner and session");
  }

  // Run conversation with the agent
  for await (const event of runner.runAsync({
    userId: "user-123",
    sessionId: session.id,
    newMessage: {
      parts: [{ text: "What is the primary function of an AI agent?" }]
    }
  })) {
    if (event.content?.parts?.[0]?.text && !event.partial) {
      console.log(`Agent: ${event.content.parts[0].text}`);
    }
  }
}

main().catch(console.error);
```

## 🛠️ Advanced Usage Examples

AgentBuilder makes it easy to create sophisticated agents with tools, memory, and multi-agent workflows.

### Agent with Custom Tools
Enable agents to perform specific actions or interact with external services using custom-defined tools.

```typescript
import { AgentBuilder, BaseTool, GoogleSearch, HttpRequestTool } from '@iqai/adk';
import type { ToolContext } from '@iqai/adk';
import dotenv from 'dotenv';

dotenv.config();

// Define a custom tool for currency conversion
class CurrencyConverterTool extends BaseTool {
  constructor() {
    super();
  }

  getDeclaration() {
    return {
      name: 'currency_converter',
      description: 'Converts an amount from one currency to another',
      parameters: {
        type: 'object',
        properties: {
          amount: { 
            type: 'number',
            description: 'The amount to convert'
          },
          fromCurrency: { 
            type: 'string', 
            description: 'Source currency code (e.g., USD)' 
          },
          toCurrency: { 
            type: 'string', 
            description: 'Target currency code (e.g., EUR)' 
          }
        },
        required: ['amount', 'fromCurrency', 'toCurrency']
      }
    };
  }

  async runAsync(
    args: { amount: number; fromCurrency: string; toCurrency: string },
    context: ToolContext
  ) {
    // Placeholder for actual conversion logic (e.g., API call to a finance service)
    if (args.fromCurrency === 'USD' && args.toCurrency === 'EUR') {
      const converted = args.amount * 0.92;
      return `${args.amount} ${args.fromCurrency} = ${converted.toFixed(2)} ${args.toCurrency}`;
    }
    return `Conversion rate not available for ${args.fromCurrency} to ${args.toCurrency}`;
  }
}

async function main() {
  // Simple agent with tools using AgentBuilder
  const response = await AgentBuilder
    .create("financial_assistant")
    .withModel("gpt-4")
    .withDescription("A financial assistant that can convert currencies and search for information")
    .withInstruction("You are a financial assistant. Use your tools to help with currency conversions and research.")
    .withTools(
      new CurrencyConverterTool(),
      new GoogleSearch(),
      new HttpRequestTool()
    )
    .ask("Convert 100 USD to EUR and find the latest EUR exchange rates");

  console.log(`Financial Agent: ${response}`);
}

main().catch(console.error);
```

### Multi-Agent System
Create specialized agents that can work together in sequential or parallel workflows.

```typescript
import { AgentBuilder } from '@iqai/adk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Create specialized agents using AgentBuilder
  const researchAgent = await AgentBuilder
    .create("researcher")
    .withModel("gpt-4")
    .withDescription("Specializes in research and fact-finding")
    .withInstruction("You are a research specialist. Gather accurate, detailed information about topics.")
    .build();

  const summaryAgent = await AgentBuilder
    .create("summarizer")
    .withModel("gemini-2.5-flash")
    .withDescription("Specializes in creating concise summaries")
    .withInstruction("You are a summary specialist. Create clear, well-structured summaries from research findings.")
    .build();

  // Sequential workflow: Research → Summarize
  const { runner, session } = await AgentBuilder
    .create("research_workflow")
    .withDescription("A workflow that researches and then summarizes")
    .asSequential([researchAgent.agent, summaryAgent.agent])
    .withQuickSession("research-app", "user-123")
    .build();

  if (!runner || !session) {
    throw new Error("Failed to create workflow");
  }

  // Execute sequential workflow
  for await (const event of runner.runAsync({
    userId: "user-123",
    sessionId: session.id,
    newMessage: {
      parts: [{ text: "Research the latest developments in TypeScript 5.0 and provide a summary" }]
    }
  })) {
    if (event.content?.parts?.[0]?.text && !event.partial) {
      console.log(`[${event.author}]: ${event.content.parts[0].text}`);
    }
  }

  // Parallel execution example
  console.log("\n--- Parallel Analysis ---");
  
  const [technicalAnalysis, businessAnalysis] = await Promise.all([
    AgentBuilder
      .create("tech_analyst")
      .withModel("gpt-4")
      .withInstruction("Analyze technical aspects: algorithms, implementation, performance.")
      .ask("Analyze the technical aspects of AI in healthcare"),
    
    AgentBuilder
      .create("business_analyst")
      .withModel("gemini-2.5-flash")
      .withInstruction("Analyze business aspects: market impact, ROI, adoption barriers.")
      .ask("Analyze the business aspects of AI in healthcare")
  ]);

  console.log("Technical Analysis:", technicalAnalysis);
  console.log("Business Analysis:", businessAnalysis);
}

main().catch(console.error);
```

### Traditional Agent Creation (Advanced)
For users who need fine-grained control over agent configuration, ADK also supports traditional agent creation:

```typescript
import { LlmAgent, Runner, InMemorySessionService } from '@iqai/adk';

// Traditional approach with explicit configuration
const agent = new LlmAgent({
  name: "custom_agent",
  model: "gpt-4",
  description: "A custom agent",
  instruction: "You are a helpful assistant."
});

const sessionService = new InMemorySessionService();
const runner = new Runner({
  appName: "my-app",
  agent,
  sessionService
});

// Use with explicit session management...
```

This approach provides maximum flexibility for complex use cases but requires more boilerplate code.

## 🧪 Running Example Applications

The `apps/examples` directory contains comprehensive examples demonstrating ADK's features in real-world scenarios.

### Available Examples

- **Agent Builder** - Comprehensive AgentBuilder usage patterns (recommended starting point)
- **Simple Agent** - Basic agent setup and conversation
- **Tool Usage** - Custom tools with calculator and weather APIs
- **Memory Usage** - Persistent memory across conversations  
- **Multi-Agent Systems** - Specialized agents and transfers
- **Planner Usage** - Step-by-step task planning and execution
- **MCP Integration** - Model Context Protocol tool integration
- **Flow Examples** - Custom flow processors and pipeline extensions
- **Artifact Management** - File creation and management
- **Function Tools** - Converting regular functions to agent tools
- **Telemetry Agent** - Observability and monitoring integration

### Running Examples

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd adk-ts
   pnpm install
   ```

2. **Configure environment**:
   Create `.env` in the root directory:
   ```bash
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_API_KEY=your_google_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

3. **Run examples**:
   ```bash
   cd apps/examples
   pnpm install
   
   # Interactive menu to select examples
   pnpm dev
   
   # Or
   pnpm --filter @iqai/examples dev
   ```

The examples demonstrate production-ready patterns and can serve as templates for your implementations.

## 📈 Project Status and Roadmap

ADK TypeScript is actively developed and ready for production use. The framework provides a complete foundation for building sophisticated AI agents with comprehensive feature support.

**Current Features (✅ Production Ready):**
*   ✅ **Multi-LLM Provider Support** - OpenAI, Google (Gemini), Anthropic with unified interface
*   ✅ **Advanced Agent Architecture** - Hierarchical agents, sub-agents, and agent transfers  
*   ✅ **Comprehensive Tool System** - Custom tools, function integration, automatic schema generation
*   ✅ **Flow & Processor System** - Modular request/response pipeline with extensible processors
*   ✅ **Session Management** - Persistent conversations with delta-aware state management
*   ✅ **Memory Services** - Pluggable memory system for knowledge storage and retrieval
*   ✅ **Real-time Streaming** - Full streaming support with event-driven architecture
*   ✅ **Artifact Management** - File handling with versioning and multi-agent collaboration
*   ✅ **Planning System** - Integrated planning for complex task decomposition

**Active Development (🚧 In Progress):**
*   🚧 **Enhanced Memory Providers** - Vector database integrations and advanced retrieval
*   🚧 **Code Execution** - Safe code execution environments for agent programming tasks
*   🚧 **CLI Tools** - Development and deployment utilities for agent applications
*   🚧 **Evaluation Framework** - Agent performance testing and benchmarking tools

**Future Roadmap (⬜ Planned):**
*   ⬜ **Multi-modal Support** - Image, audio, and video processing capabilities
*   ⬜ **Advanced Planners** - Chain-of-thought, tree-of-thought, and custom reasoning patterns
*   ⬜ **Production Deployment** - Containerization, scaling, and monitoring solutions
*   ⬜ **Enterprise Features** - Advanced security, audit logging, and compliance tools

We encourage users to report issues, suggest features, and contribute to the project via the [GitHub issues page](https://github.com/IQAIcom/adk-ts/issues).

## 🤝 Contributing to ADK TypeScript

Contributions from the open-source community are highly welcome! Whether you're reporting bugs, proposing new features, enhancing documentation, or submitting code improvements, your input helps make ADK better for everyone.

### Ways to Contribute

*   **🐛 Bug Reports** - Help us identify and fix issues
*   **💡 Feature Requests** - Suggest new capabilities and improvements  
*   **📚 Documentation** - Improve guides, examples, and API documentation
*   **🛠️ Code Contributions** - Implement new features, tools, or LLM providers
*   **🧪 Testing** - Add test coverage and improve reliability
*   **📝 Examples** - Create new example applications and use cases

### Getting Started

1. **Review Open Issues** - Check the [GitHub issues page](https://github.com/IQAIcom/adk-ts/issues) for existing tasks or ideas
2. **Read the Contributing Guide** - See our comprehensive [Contributing Guide](CONTRIBUTION.md) for:
   - Framework architecture and components
   - Development setup and workflow
   - Implementation examples and patterns
   - Coding standards and best practices
3. **Join the Community** - Engage with other contributors and maintainers

### Quick Start Workflow

1. **Fork** the repository to your GitHub account
2. **Clone** your fork and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Develop** your changes following our architecture patterns
4. **Test** your implementation with existing examples
5. **Submit** a Pull Request with a clear description

Our [Contributing Guide](CONTRIBUTION.md) provides detailed information about the framework's architecture, extension points, and implementation patterns to help you contribute effectively.

## 📜 Licensing

ADK TypeScript is distributed under the [MIT License](LICENSE). Users are permitted to use, modify, and distribute the software in accordance with the license terms.

## 🌟 Support the Project

If ADK TypeScript has been helpful in your AI agent development, consider:

- ⭐ **Star the repository** to show your support and help others discover the project
- 🐛 **Report issues** to help improve stability and usability  
- 💬 **Share your use cases** and success stories with the community
- 🤝 **Contribute** code, documentation, or examples
- 📢 **Spread the word** about ADK in your networks and communities

Your support and engagement help make ADK TypeScript a better framework for everyone building AI agents!

---

**Ready to build your first AI agent?** Check out our [examples](apps/examples) and [contributing guide](CONTRIBUTION.md) to get started!
