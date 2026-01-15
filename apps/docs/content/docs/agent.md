---
title: Agents Overview
description: Comprehensive guide to building and working with AI agents in ADK-TS
---

Agents are the core building blocks of the ADK-TS framework. They represent autonomous AI programs that can understand instructions, make decisions, use tools, and coordinate with other agents to accomplish complex tasks.

## What is an Agent?

An agent in ADK-TS is an autonomous AI system that can:

- **Reason** about problems and make decisions
- **Use tools** to interact with external systems and APIs
- **Maintain context** through conversation sessions
- **Coordinate** with other agents in multi-agent systems
- **Learn and adapt** through memory and feedback loops

## Agent Architecture

All agents in ADK-TS follow a common architecture built around the `BaseAgent` class:

```typescript
abstract class BaseAgent {
  name: string;
  description: string;
  model?: LanguageModel;
  tools?: BaseTool[];
  subAgents?: BaseAgent[];
  // ... additional configuration
}
```

## Agent Types

ADK-TS provides several specialized agent types for different use cases:

### LLM Agents (`LLMAgent`)

The most common agent type that uses Large Language Models for reasoning, conversation, and tool usage.

```typescript
import { LLMAgent } from "@iqai/adk";

const agent = new LLMAgent({
  name: "assistant",
  description: "A helpful AI assistant",
  model: "gemini-2.5-flash",
  instruction:
    "You are a helpful assistant that can use tools to solve problems",
  tools: [
    /* your tools */
  ],
});
```

**Use cases:**

- Conversational AI
- Tool-augmented reasoning
- Complex decision making
- Natural language understanding

### Workflow Agents

Structured agents that follow predefined execution patterns:

- **Sequential**: Execute steps in order
- **Parallel**: Run multiple tasks simultaneously
- **Loop**: Repeat actions based on conditions

```typescript
import { SequentialAgent } from "@iqai/adk";

const workflow = new SequentialAgent({
  name: "data_processor",
  description: "Process data through multiple steps",
  agents: [extractAgent, transformAgent, loadAgent],
});
```

**Use cases:**

- ETL pipelines
- Business process automation
- Structured workflows
- Quality assurance

### Custom Agents

Extend `BaseAgent` to create specialized agents with custom logic:

```typescript
import { BaseAgent } from "@iqai/adk";

class CustomAgent extends BaseAgent {
  async execute(input: any, context: AgentContext): Promise<any> {
    // Your custom logic here
    return result;
  }
}
```

**Use cases:**

- Domain-specific logic
- Custom reasoning patterns
- Specialized integrations
- Performance optimizations

### Multi-Agent Systems

Coordinate teams of specialized agents:

```typescript
import { MultiAgentSystem } from "@iqai/adk";

const team = new MultiAgentSystem({
  name: "development_team",
  description: "A team of specialized development agents",
  agents: [architectAgent, coderAgent, testerAgent, reviewerAgent],
  coordinator: new RoundRobinCoordinator(),
});
```

**Use cases:**

- Complex problem solving
- Specialized task delegation
- Collaborative workflows
- Expert systems

## Agent Builder (Recommended)

For rapid development, use `AgentBuilder` which provides a fluent API with smart defaults:

```typescript
import { AgentBuilder } from "@iqai/adk";

const { runner } = await AgentBuilder.create("my_agent")
  .withModel("gemini-2.5-flash")
  .withInstruction("You are a helpful assistant")
  .withTools(calculatorTool, searchTool)
  .build();

// Use the agent
const response = await runner.ask("What's 15 * 23?");
```

## Key Concepts

### Sessions

Agents maintain conversation context through sessions:

```typescript
const session = await runner.createSession();
const response1 = await session.ask("Hello!");
const response2 = await session.ask("What's my name?"); // Remembers context
```

### Tools

Agents can use tools to interact with external systems:

```typescript
import { FunctionTool } from "@iqai/adk";

const calculatorTool = new FunctionTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: {
    expression: { type: "string", description: "Math expression to evaluate" },
  },
  execute: async ({ expression }) => {
    // Using 'eval()' is insecure. In a real application, use a safe expression
    // evaluation library like 'mathjs' to prevent security vulnerabilities.
    throw new Error("Insecure 'eval()' removed from example.");
  },
});
```

### Memory

Agents can maintain long-term memory:

```typescript
const agent = new LLMAgent({
  // ... config
  memoryService: new VectorMemoryService({
    collection: "agent_memory",
    embedding: new GoogleGenerativeAIEmbeddings(),
  }),
});
```

### Callbacks

Monitor and customize agent behavior with callbacks:

```typescript
const agent = new LLMAgent({
  // ... config
  beforeAgentCallback: context => {
    console.log(`Agent ${context.agent.name} starting execution`);
  },
  afterToolCallback: context => {
    console.log(`Tool ${context.tool.name} executed in ${context.duration}ms`);
  },
});
```

## Configuration Options

### Core Configuration

| Option        | Type                                 | Required | Description                    |
| ------------- | ------------------------------------ | -------- | ------------------------------ |
| `name`        | `string`                             | ✅       | Unique agent identifier        |
| `description` | `string`                             | ✅       | Agent capabilities description |
| `model`       | `string \| BaseLlm \| LanguageModel` | ❌       | LLM model to use               |

### Behavior Configuration

| Option              | Type                            | Description                        |
| ------------------- | ------------------------------- | ---------------------------------- |
| `instruction`       | `string \| InstructionProvider` | Primary behavior instructions      |
| `globalInstruction` | `string \| InstructionProvider` | Global instructions for agent tree |

### Tool Configuration

| Option         | Type               | Description               |
| -------------- | ------------------ | ------------------------- |
| `tools`        | `ToolUnion[]`      | Available tools           |
| `subAgents`    | `BaseAgent[]`      | Sub-agents for delegation |
| `codeExecutor` | `BaseCodeExecutor` | Code execution capability |

### Session Management

| Option           | Type                 | Description            |
| ---------------- | -------------------- | ---------------------- |
| `userId`         | `string`             | User identifier        |
| `appName`        | `string`             | Application identifier |
| `sessionService` | `BaseSessionService` | Session management     |
| `memoryService`  | `BaseMemoryService`  | Long-term memory       |

## Best Practices

### Agent Design

1. **Single Responsibility**: Each agent should have one clear purpose
2. **Clear Instructions**: Provide detailed, specific instructions
3. **Appropriate Tools**: Only include tools the agent actually needs
4. **Error Handling**: Implement proper error handling and fallbacks

### Performance

1. **Caching**: Use appropriate caching for expensive operations
2. **Async Operations**: Leverage parallel execution when possible
3. **Resource Management**: Properly clean up resources and connections
4. **Monitoring**: Implement logging and monitoring for production use

### Multi-Agent Coordination

1. **Clear Roles**: Define clear responsibilities for each agent
2. **Communication Protocols**: Establish clear communication patterns
3. **Conflict Resolution**: Handle conflicts and decision deadlocks
4. **Scalability**: Design for horizontal scaling when needed

## Common Patterns

### Tool-Augmented Agent

```typescript
const researchAgent = await AgentBuilder.create("researcher")
  .withModel("gemini-2.5-flash")
  .withInstruction(
    "You are a research assistant that can search and analyze information",
  )
  .withTools(webSearchTool, dataAnalyzerTool)
  .build();
```

### Multi-Step Workflow

```typescript
const analysisWorkflow = new SequentialAgent({
  name: "data_analyzer",
  agents: [
    new DataIngestionAgent(),
    new DataCleaningAgent(),
    new AnalysisAgent(),
    new ReportGeneratorAgent(),
  ],
});
```

### Hierarchical Agent System

```typescript
const managerAgent = new LLMAgent({
  name: "manager",
  subAgents: [specialistAgent1, specialistAgent2, coordinatorAgent],
  instruction:
    "Delegate tasks to appropriate specialists and coordinate results",
});
```

## Troubleshooting

### Common Issues

**Agent not responding as expected:**

- Check instruction clarity and specificity
- Verify tool configurations
- Review model selection and parameters

**Performance issues:**

- Implement caching for expensive operations
- Use appropriate batching for multiple requests
- Monitor resource usage and optimize

**Tool execution failures:**

- Validate tool parameters and schemas
- Check external service availability
- Implement retry logic and error handling

**Memory and session issues:**

- Verify session service configuration
- Check memory service setup
- Monitor session state size

## Next Steps

- [LLM Agents Guide](/docs/framework/agents/llm-agents) - Detailed LLM agent configuration
- [Agent Builder API](/docs/framework/agents/agent-builder) - Fluent API for rapid development
- [Multi-Agent Systems](/docs/framework/agents/multi-agents) - Coordinating multiple agents
- [Custom Agents](/docs/framework/agents/custom-agents) - Building specialized agents
- [Workflow Agents](/docs/framework/agents/workflow-agents) - Structured execution patterns

## Examples

See the [examples directory](https://github.com/IQAIcom/adk-ts/tree/main/apps/examples/src) for complete working examples of agents in action.
