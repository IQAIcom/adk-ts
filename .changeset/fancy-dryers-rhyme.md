---
"@iqai/adk": patch
---

Adds a new suite of default ADK tools and refactors common tooling, including a major upgrade to the Google Search tool.

- Introduces a comprehensive set of **default tools** for the ADK (file system, shell, and web utilities) to provide a strong out-of-the-box agent experience.
- Adds a new **Tavily-powered web search tool** as part of the default toolset.
- Refactors the **Google Search tool** to use the real Google Custom Search API with Axios and Zod-based argument validation.
- Improves **type safety** across several common tools by replacing `any` return types with explicit interfaces.
- Updates the memory loading tool to return a structured result object.

This is a **non-breaking feature and refactor** that expands functionality, improves reliability, and strengthens type safety without changing existing APIs.
