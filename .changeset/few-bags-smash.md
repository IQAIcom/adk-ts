---
"@iqai/adk": patch
---

Previously, chaining builder methods after `withOutputSchema()` caused TypeScript to lose the inferred output type, resulting in `EnhancedRunner<any, any>` instead of the schema-derived type.

This update:

- Makes all chainable builder methods return `this` to preserve polymorphic typing.
- Refactors `AgentBuilderWithSchema` using a mapped type that preserves all methods from `AgentBuilder` while correctly typing `build`, `buildWithSchema`, and `ask`.

Now, the inferred output type `T` flows correctly through the builder chain, ensuring `BuiltAgent<T, M>` and `EnhancedRunner<T, M>` are fully typed.
