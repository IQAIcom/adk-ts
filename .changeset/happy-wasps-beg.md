---
"@iqai/adk": patch
---

Adds support for input and output schemas for agents, now output schema would update the instruction with the given schema to ristrict model into giving the desired output and validates it before producing output. Agent builder is wired to provide better type inference of the schema given by withOutputSchema
