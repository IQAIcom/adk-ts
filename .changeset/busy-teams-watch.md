---
"@iqai/adk": patch
---

Refactored MCP sampling parameters to align with the official protocol specification by moving from direct model assertions to the `modelPreferences` hint system.

- **Protocol Alignment**  
  Removed the invalid `mcpParams.model` type assertion, as the MCP spec does not define a top-level string for the model in sampling requests.

- **Preference Logic**  
  Implemented support for `modelPreferences.hints`, allowing the server to interpret model suggestions via the `name` property within the hints array.

- **Resilience**  
  Added optional chaining across the parameter parsing logic to prevent runtime errors when `modelPreferences` or `hints` are undefined.

- **Fallback Strategy**  
  Established `gemini-2.0-flash` as the default model if the client provides no specific hints or valid preferences.
