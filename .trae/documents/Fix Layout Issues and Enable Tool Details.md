I will address the three issues as follows:

1. **Fix Overflow in Traces Panel**:
   - In `apps/adk-web/components/traces-panel.tsx`, I will modify the trace item container. I'll add `min-w-0` and `flex-1` to the text wrapper div to ensure the `truncate` class works correctly and prevents the long text from overflowing the card width.

2. **Improve Nesting & Layout**:
   - In `apps/adk-web/components/traces-tree.tsx`, I will improve the handling of deep nesting and narrow sidebars:
     - Enable horizontal scrolling by changing `overflow-hidden` to `overflow-x-auto` on the tree container. This ensures that even with the 320px sidebar, the wider tree content (names + timeline) can be viewed.

     - Reduce the indentation multiplier from `16px` to `10px` to make the tree more compact and reduce "excessive" indentation for deep agent runs.

3. **Show Tool Inputs/Outputs**:
   - In `apps/adk-web/lib/trace-utils.ts`, I will update the `getLlmRequest` and `getLlmResponse` functions.

   - `getLlmRequest` will now check for `adk.tool.args` (and legacy keys) if `adk.llm.request` is missing.

   - `getLlmResponse` will now check for `adk.tool.response` (and legacy keys) if `adk.llm.response` is missing.

   - This will automatically populate the "Request" and "Response" tabs in the `TraceDetailsPanel` with tool execution data.
