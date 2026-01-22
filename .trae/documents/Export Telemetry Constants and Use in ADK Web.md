I will implement the requested change by exporting the telemetry constants from the `adk` package and consuming them in the `adk-web` application. This involves the following steps:

1.  **Expose Constants in `@iqai/adk`**:
    - Update `packages/adk/tsup.config.ts` to add a new entry point `constants: "src/telemetry/constants.ts"`. This ensures a dedicated, browser-compatible build output for constants.
    - Update `packages/adk/package.json` to define the `exports` field, exposing `./constants` and pointing it to the new build output.

2.  **Add Dependency to `apps/adk-web`**:
    - Update `apps/adk-web/package.json` to add `"@iqai/adk": "workspace:*"` to the `dependencies`.

3.  **Build and Link**:
    - Run `pnpm install` to link the workspace package.
    - Run `pnpm build` in `packages/adk` to generate the `dist/constants.js` file.

4.  **Update `trace-utils.ts`**:
    - Modify `apps/adk-web/lib/trace-utils.ts` to import `ADK_ATTRS` from `@iqai/adk/constants`.
    - Replace all hardcoded attribute strings with their corresponding constants (e.g., `ADK_ATTRS.INVOCATION_ID`, `ADK_ATTRS.LLM_REQUEST`, `ADK_ATTRS.TOOL_ARGS`).

This approach ensures type safety, consistency across the monorepo, and prevents client-side build errors by avoiding the import of Node.js-specific modules.
