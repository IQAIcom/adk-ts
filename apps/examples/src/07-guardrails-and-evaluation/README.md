# 07 - Guardrails and Evaluation

Learn how to implement safety guardrails and test agents systematically.

## Concepts Covered

- **beforeModelCallback** - Input validation and content filtering
- **beforeToolCallback** - Tool argument inspection
- **AgentEvaluator** - Automated testing with datasets
- **Test datasets** - JSON-based evaluation cases
- **Safety patterns** - Blocking and content filtering

## Running the Example

```bash
pnpm dev --name 07-guardrails-and-evaluation
```

## Key Takeaways

1. **Callbacks** implement safety and guardrails
2. **beforeModel** filters inputs before processing
3. **beforeTool** validates tool arguments
4. **Evaluation** enables systematic testing
5. **Test datasets** define expected behavior

## Next Steps

Continue to [08-observability-and-plugins](../08-observability-and-plugins) to learn about monitoring.
