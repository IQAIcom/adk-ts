<div align="center">

<img src="https://files.catbox.moe/vumztw.png" alt="ADK TypeScript Logo" width="100" />

<br/>

# @iqai/adk

**The core TypeScript library for building sophisticated AI agents with multi-LLM support, advanced tools, and flexible conversation flows.**

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

`@iqai/adk` is the core TypeScript library for the Agent Development Kit, providing the foundational tools and abstractions to build sophisticated AI agents. It enables seamless integration with multiple Large Language Models (LLMs), advanced tool usage, and persistent memory capabilities.

## 🚀 Key Features

- **🤖 Multi-Provider LLM Support** - Seamlessly integrate OpenAI, Anthropic, Google, and other leading providers
- **🛠️ Extensible Tool System** - Define custom tools with declarative schemas for intelligent LLM integration
- **🧠 Advanced Agent Reasoning** - Complete reasoning loop implementation for complex task execution
- **⚡ Real-Time Streaming** - Support for streaming responses and dynamic user interactions
- **🔐 Flexible Authentication** - Secure agent API access with multiple auth mechanisms
- **💾 Persistent Memory Systems** - Context retention and learning from past interactions
- **🔄 Multi-Agent Orchestration** - Sequential, parallel, and loop-based agent workflows
- **📊 Built-in Telemetry** - Comprehensive monitoring and analytics capabilities

## 🚀 Quick Start

### Installation

```bash
npm install @iqai/adk
```

### Simple Example

```typescript
import { AgentBuilder } from '@iqai/adk';

const response = await AgentBuilder
  .withModel("gpt-4.1")
  .ask("What is the primary function of an AI agent?");

console.log(response);
```

## ⚙️ Environment Configuration

For the library to connect to LLM providers, you need to set up API keys. Create a `.env` file in the root of your project and add your keys:

```env
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
```

The library uses `dotenv` to load these variables automatically if `dotenv.config()` is called in your application.

## 📖 Basic Usage

Here's a fundamental example of creating and running an agent:

```typescript
import { Agent } from '@iqai/adk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Instantiate the agent
const myAgent = new Agent({
  name: "simple_query_assistant",
  model: "gemini-2.5-flash", // Or "gpt-4-turbo", "claude-3-opus"
  description: "A basic assistant to answer questions.",
  instructions: "You are a helpful AI. Respond clearly and concisely."
});

// Asynchronously run the agent
async function runQuery() {
  try {
    const query = "What is the capital of France?";
    console.log(`User: ${query}`);

    const response = await myAgent.run({
      messages: [{ role: 'user', content: query }]
    });

    console.log(`Agent: ${response.content}`);
  } catch (error) {
    console.error("Error during agent execution:", error);
  }
}

runQuery();
```

## 🎯 AgentBuilder - Simplified Agent Creation

The `AgentBuilder` provides a fluent interface for creating agents with minimal boilerplate. It's perfect for rapid prototyping and reduces the complexity of agent setup.

```typescript
import { AgentBuilder } from '@iqai/adk';
import dotenv from 'dotenv';

dotenv.config();

// Simple agent creation and execution in one fluent chain
async function quickQuery() {
  const response = await AgentBuilder
    .create("query_assistant")
    .withModel("gemini-2.5-flash")
    .withInstruction("You are a helpful AI. Respond clearly and concisely.")
    .ask("What is the capital of France?");

  console.log(response);
}

// For more complex scenarios, build the agent and get full control
async function advancedSetup() {
  const { agent, runner, session } = await AgentBuilder
    .create("research_assistant")
    .withModel("gpt-4-turbo")
    .withDescription("An advanced research assistant")
    .withInstruction("You are a research assistant with access to various tools")
    .withTools(new GoogleSearchTool(), new FileOperationsTool())
    .withQuickSession("research-app", "researcher-456")
    .build();

  // Now you have full access to agent, runner, and session for advanced usage
  console.log(`Created agent: ${agent.name}`);
}

// Specialized agent types for orchestration
async function createWorkflowAgent() {
  // Sequential execution of multiple agents
  const workflow = await AgentBuilder
    .create("data_pipeline")
    .asSequential([dataCollector, dataProcessor, dataAnalyzer])
    .withQuickSession("pipeline-app", "admin")
    .build();

  // Parallel execution for concurrent tasks
  const parallelAnalysis = await AgentBuilder
    .create("multi_analysis")
    .asParallel([sentimentAnalyzer, topicExtractor, summaryGenerator])
    .build();
}
```

**Benefits of AgentBuilder:**

- **Reduced Boilerplate**: ~80% less setup code compared to manual configuration
- **Fluent Interface**: Readable, chainable method calls
- **Automatic Management**: Handles session and runner creation automatically
- **Quick Execution**: Built-in `ask()` method for immediate responses
- **Flexible**: Supports all agent types (LLM, Sequential, Parallel, Loop, LangGraph)
- **Backward Compatible**: Works alongside existing ADK patterns

## 🛠️ Using Tools with an Agent

Extend your agent's capabilities by defining and integrating custom tools.

```typescript
import { Agent, BaseTool } from '@iqai/adk';
import dotenv from 'dotenv';

dotenv.config();

// Define a simple calculator tool
class CalculatorTool extends BaseTool {
  constructor() {
    super({
      name: 'calculator',
      description: 'Performs basic arithmetic operations: add, subtract, multiply, divide.'
    });
  }

  getDeclaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'multiply', 'divide']
          },
          operand1: { type: 'number' },
          operand2: { type: 'number' }
        },
        required: ['operation', 'operand1', 'operand2']
      }
    };
  }

  async runAsync(args: { operation: string; operand1: number; operand2: number }) {
    const { operation, operand1, operand2 } = args;
    switch (operation) {
      case 'add': return { result: operand1 + operand2 };
      case 'subtract': return { result: operand1 - operand2 };
      case 'multiply': return { result: operand1 * operand2 };
      case 'divide':
        if (operand2 === 0) return { error: 'Cannot divide by zero.' };
        return { result: operand1 / operand2 };
      default: return { error: `Unknown operation: ${operation}` };
    }
  }
}

// Create an agent equipped with the calculator tool
const mathAgent = new Agent({
  name: "math_assistant_agent",
  model: "gpt-4-turbo", // Choose a model proficient with tool usage
  instructions:
    "You are a helpful assistant. Use the calculator tool for any mathematical calculations requested.",
  tools: [new CalculatorTool()]
});

async function performCalculation() {
  const response = await mathAgent.run({
    messages: [
      { role: 'user', content: 'What is 15 multiplied by 4?' }
    ]
  });
  // The response.content will likely include the thought process and the tool's output.
  console.log(JSON.stringify(response, null, 2));
}

performCalculation().catch(console.error);
```

## 🏗️ Advanced Features

### Multi-Agent Systems

```typescript
import { AgentBuilder } from '@iqai/adk';

// Sequential workflow
const workflow = await AgentBuilder
  .create("data_pipeline")
  .asSequential([dataCollector, dataProcessor, dataAnalyzer])
  .withQuickSession("pipeline-app", "admin")
  .build();

// Parallel execution
const parallelAnalysis = await AgentBuilder
  .create("multi_analysis")
  .asParallel([sentimentAnalyzer, topicExtractor, summaryGenerator])
  .build();
```

### Memory & Sessions

```typescript
import { Agent, InMemorySessionService } from '@iqai/adk';

const agent = new Agent({
  name: "persistent_assistant",
  model: "gpt-4-turbo",
  sessionService: new InMemorySessionService(),
  instructions: "Remember our conversation history."
});
```

### Custom Tools

```typescript
import { BaseTool } from '@iqai/adk';

class WeatherTool extends BaseTool {
  constructor() {
    super({
      name: 'weather',
      description: 'Get current weather information'
    });
  }

  async runAsync(args: { location: string }) {
    // Implementation here
    return { temperature: 72, condition: 'sunny' };
  }
}
```

## 📚 Documentation

For comprehensive guides, API reference, and advanced examples:

**[https://adk.iqai.com](https://adk.iqai.com)**

## 🧪 Examples

Explore comprehensive examples in the main repository:

```bash
git clone https://github.com/IQAIcom/adk-ts
cd adk-ts/apps/examples
pnpm install && pnpm dev
```

## 🤝 Contributing

Contributions are welcome! See our [Contributing Guide](https://github.com/IQAIcom/adk-ts/blob/main/CONTRIBUTION.md) for details.

## 📜 License

MIT License - see [LICENSE](https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md) for details.

---

**Ready to build your first AI agent?** Visit [https://adk.iqai.com](https://adk.iqai.com) to get started!
