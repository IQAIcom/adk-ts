# 02 - Tools and State

Learn how to create custom tools and manage state in your agents.

## Concepts Covered

- **Custom tools** - Creating tools with `createTool()`
- **Tool schemas** - Zod validation for tool inputs
- **State management** - Using `context.state.get/set`
- **State injection** - Using `{stateName}` syntax in instructions
- **Session services** - Persisting state across interactions

## Running the Example

```bash
pnpm dev --name 02-tools-and-state
```

## Key Takeaways

1. **Tools** extend agent capabilities with custom functions
2. **State** persists data across tool calls
3. **State injection** makes state available in agent instructions
4. **Session services** handle persistence strategies

## Next Steps

Continue to [03-multi-agent-systems](../03-multi-agent-systems) to learn about agent composition.
