# 01 - Getting Started

The simplest way to create and use an AI agent with ADK.

## Concepts Covered

- **Basic AgentBuilder usage** - Creating agents with minimal configuration
- **Model configuration** - Setting up different LLM models
- **System instructions** - Guiding agent behavior
- **Simple conversations** - Question-answer interactions
- **Structured output** - Using Zod schemas for type-safe responses

## Running the Example

```bash
# Run the interactive demo
pnpm dev --name 01-getting-started

# Or use the CLI
adk run apps/examples/new_src/01-getting-started/agent.ts "What is TypeScript?"
```

## Key Takeaways

1. **AgentBuilder** is the main entry point for creating agents
2. **Structured output** ensures type-safe responses
3. **System instructions** guide the agent's behavior
4. **Multiple models** can be used interchangeably

## Next Steps

Continue to [02-tools-and-state](../02-tools-and-state) to learn how to create custom tools and manage state.
