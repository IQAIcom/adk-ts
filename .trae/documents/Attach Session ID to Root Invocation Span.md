I will update the `Runner` class to ensure that the session ID and user ID are correctly attached to the root invocation span. This will ensure that the trace is properly indexed and retrievable by session ID.

### 1. Update Runner Implementation
**File:** `packages/adk/src/runners.ts`
- Import `ADK_ATTRS` from `./telemetry`.
- In `runAsync`, immediately set the `ADK_ATTRS.SESSION_ID` and `ADK_ATTRS.USER_ID` attributes on the newly created span. This ensures the root span is correctly tagged with the session metadata, allowing the in-memory exporter to index it.

### 2. Verify Fix
- Since I cannot run the full frontend-backend flow, I will verify the build succeeds.
- The user can then verify if the traces appear in their debugging view.