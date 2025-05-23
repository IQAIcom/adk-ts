<div align="center">
  <img src="adk-typescript.jpg" alt="ADK TypeScript Logo" width="100%"/>

  <p align="center">
    A robust framework for building AI agents with multi-provider LLM support
  </p>

  <p align="center">
    <a href="https://www.npmjs.com/package/@iqai/adk">
      <img src="https://img.shields.io/npm/v/@iqai/adk" alt="npm version" />
    </a>
    <a href="https://www.npmjs.com/package/@iqai/adk">
      <img src="https://img.shields.io/npm/dm/@iqai/adk" alt="npm downloads" />
    </a>
    <a href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE">
      <img src="https://img.shields.io/npm/l/@iqai/adk" alt="license" />
    </a>
    <a href="https://github.com/IQAIcom/adk-ts">
      <img src="https://img.shields.io/github/stars/IQAIcom/adk-ts?style=social" alt="github stars" />
    </a>
  </p>
  
  <p align="center">
    <a href="https://pontus-devoteam.github.io/adk-typescript/" target="_blank">
      <img src="https://img.shields.io/badge/Docs-View_Documentation-blue?style=for-the-badge&logo=readthedocs" alt="View Documentation" />
    </a>
  </p>
</div>

## 🚀 Features

- **🤖 Multi-provider Support**: Seamlessly switch between OpenAI, Anthropic, or Google LLMs
- **🛠️ Tool System**: Create and use custom tools with declarative schemas
- **🔄 Agent Loop**: Complete implementation of the agent reasoning loop with tool execution
- **📡 Streaming Support**: Real-time streaming responses from LLMs
- **🔒 Authentication**: Flexible auth system for secure API access
- **💾 Memory Systems**: Persistent memory capabilities for stateful agents

## 📚 Quick Start

### 1. Installation

```bash
# Using npm
npm install @iqai/adk

# Using yarn
yarn add @iqai/adk

# Using pnpm
pnpm add @iqai/adk
```

### 2. Configure Environment

Create a `.env` file in your project root with your API keys:

```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

### 3. Create Your First Agent

```typescript
import { Agent } from '@iqai/adk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a basic agent
const agent = new Agent({
  name: "simple_assistant",
// Create a basic agent
const agent = new Agent({
  name: "simple_assistant",
  model: "gemini-2.0-flash", // Or "gpt-4-turbo" or "claude-3-opus"
  description: "A simple assistant",
  instructions: "You are a helpful assistant. Answer questions concisely."
});

// Run the agent
async function main() {
  const response = await agent.run({
    messages: [{ role: 'user', content: 'Hello, who are you?' }]
  });

  console.log(response.content);
}

main().catch(console.error);
```

## 📖 Documentation

**[View Full Documentation](https://pontus-devoteam.github.io/adk-typescript/)**

Our comprehensive documentation includes:

- Complete API reference
- Architecture overview
- Integration guides
- Advanced usage examples
- Provider-specific configurations

## 🏗️ Project Status

⚠️ **Early Development Stage**

This project is currently in early development and should be considered alpha software. While it's functional and can be used in projects, you may encounter:

- Breaking changes between versions
- APIs that may evolve based on user feedback
- Features that are still being stabilized

Current development status:

- ✅ Core agent framework
- ✅ Basic OpenAI implementation
- ✅ Initial Anthropic integration
- ✅ Initial Google/Gemini integration
- ✅ Tool system foundation
- ✅ Basic memory system
- 🚧 Enhanced error handling
- 🚧 Improved type safety
- 🚧 Extended provider features
- 🚧 Advanced memory capabilities
- ⬜ Comprehensive testing suite
- ⬜ Performance optimizations
- ⬜ Advanced streaming features

We welcome feedback, bug reports, and contributions! Please check the [issues page](https://github.com/IQAIcom/adk-ts/issues) for known issues or to report new ones.

## 📚 Usage Examples

### Agent with Tools

```typescript
import { Agent, BaseTool } from '@iqai/adk';

// Create a custom calculator tool
class CalculatorTool extends BaseTool {
  constructor() {
    super({
      name: 'calculator',
      description: 'Perform basic calculations'
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
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['operation', 'a', 'b']
      }
    };
  }

  async runAsync(args) {
    const { operation, a, b } = args;
    
    switch(operation) {
      case 'add': return { result: a + b };
      case 'subtract': return { result: a - b };
      case 'multiply': return { result: a * b };
      case 'divide': return { result: a / b };
      default: throw new Error(`Unknown operation: ${operation}`);
    }
  }
}

// Create an agent with the tool
const agent = new Agent({
  name: "calculator_assistant",
  model: "gpt-4-turbo",
  instructions: "You can perform calculations. Use the calculator tool when asked about math.",
  tools: [new CalculatorTool()]
});

// Run the agent
const response = await agent.run({
  messages: [{ role: 'user', content: 'What is 24 * 7?' }]
});
```

### Agent with Memory

```typescript
import { Agent, PersistentMemoryService } from '@iqai/adk';
import path from 'path';

// Create a memory service
const memoryService = new PersistentMemoryService({
  storageDir: path.join(__dirname, '.memory'),
  createDir: true
});

// Create an agent with memory
const agent = new Agent({
  name: "memory_assistant",
  model: "gemini-2.0-flash",
  instructions: "You have persistent memory. Remember user preferences.",
  memoryService,
  userId: 'user-123'
});

// Run the agent with a session ID for persistence
const response = await agent.run({
  messages: [{ role: 'user', content: 'Remember that I like blue.' }],
  sessionId: 'persistent-session-1'
});
```

## 🧪 Example Projects

The `examples/` directory contains several example implementations:

```bash
# Run simple agent example
npm run example:simple

# Run tool usage example
npm run example:tool

# Run memory usage example
npm run example:memory

# Run multi-provider example
npm run example:multi

# Run Anthropic tool example
npm run example:anthropic
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Show your support

Give a ⭐️ if this project helped you!
