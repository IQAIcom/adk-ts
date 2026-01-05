# 08 - Observability and Plugins

Learn how to add monitoring and telemetry to your agents.

## Concepts Covered

- **Telemetry service** - OTLP-based tracing and metrics
- **Langfuse integration** - Two approaches (service + plugin)
- **Plugin system** - Using `withPlugins()`
- **Trace viewing** - Debugging agent behavior
- **Metrics collection** - Performance monitoring

## Running the Example

```bash
# Set environment variables first
export LANGFUSE_PUBLIC_KEY="pk-..."
export LANGFUSE_SECRET_KEY="sk-..."
export LANGFUSE_BASE_URL="https://cloud.langfuse.com"

pnpm dev --name 08-observability-and-plugins
```

## Key Takeaways

1. **telemetryService** provides low-level OTLP integration
2. **LangfusePlugin** offers a higher-level plugin approach
3. **Tracing** helps debug agent behavior and tool usage
4. **Metrics** enable performance monitoring
5. **Plugins** extend agent capabilities modularly

## Next Steps

You've completed all 8 examples! You now understand:
- Basic agent creation and structured output
- Custom tools and state management
- Multi-agent systems and coordination
- Data persistence and session management
- Planning and code execution
- External integrations and MCP
- Safety guardrails and evaluation
- Observability and monitoring

Check out the [ADK documentation](https://adk.braindao.org) for more advanced patterns!
