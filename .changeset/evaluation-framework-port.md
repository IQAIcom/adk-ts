---
"@iqai/adk": minor
"@iqai/examples": patch
---

Port Python evaluation framework to TypeScript

This change introduces a comprehensive evaluation framework for testing AI agent performance. Key features include:

- **Core evaluation engine** with agent-evaluator and local evaluation service
- **Built-in evaluators** for response matching, trajectory analysis, LLM-as-judge, and safety checks
- **Metrics system** with ROUGE scoring and tool trajectory analysis
- **Vertex AI integration** for cloud-based evaluation
- **Pluggable registry system** for custom metric evaluators
- **Structured evaluation cases and test sets** for organized testing

The framework is marked as experimental and provides essential tooling for evaluating agent responses, tool usage, and overall performance across different scenarios.