---
"@iqai/adk-cli": patch
"@iqai/adk": patch
---

- **Dependency Updates:**

  - Upgraded dependencies and devDependencies across multiple packages ensuring compatibility with the latest library versions.

- **Schema Handling:**

  - Transitioned schema conversion to use `z.toJSONSchema`, reducing dependencies.
  - Enhanced type safety in the workflow tool's schema handling.

- **Error Reporting and Validation:**

  - Improved error messages in `AgentBuilder` for better debugging.
  - Enhanced output validation for LLM.

- **AI SDK and Model Integration:**

  - Refined model ID handling in `AiSdkLlm`.
  - Updated field references to align with AI SDK changes.

- **Code Quality Enhancements:**
  - Improved import order and code formatting for consistency.

This changeset ensures improved stability, security, and developer experience across the updated packages.
