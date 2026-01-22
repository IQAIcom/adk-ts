I have identified the issue. The telemetry constants were standardized in the `adk` package (e.g., `adk.invocation.id`, `adk.llm.request`), but the `adk-web` application is still looking for the old attribute names (e.g., `adk.invocation_id`, `adk.llm_request`).

This mismatch causes:

1.  **No invocation found**: `findInvocId` fails because it looks for `adk.invocation_id` instead of `adk.invocation.id`.
2.  **Missing Request/Response**: `getLlmRequest` and `getLlmResponse` fail because they look for `adk.llm_request`/`adk.llm_response` instead of `adk.llm.request`/`adk.llm.response`.

I will apply the following fix:

1.  **Update `apps/adk-web/lib/trace-utils.ts`**:
    - Change `adk.invocation_id` to `adk.invocation.id`.
    - Change `adk.llm_request` to `adk.llm.request`.
    - Change `adk.llm_response` to `adk.llm.response`.

This will align the web visualization with the current telemetry data structure.
