I will implement the fixed bottom details panel for traces, integrating it with the existing `TraceTree` and `TracesPanel`.

### **1. Setup & Dependencies**

- Install `react-json-view` for displaying JSON data.
- Create `apps/adk-web/lib/json-view-theme.ts` with the requested Tailwind-compatible theme.

### **2. Logic Updates (`trace-utils.ts`)**

- Add helper functions to `apps/adk-web/lib/trace-utils.ts` to extract LLM request and response data from span attributes, consistent with the existing `adk.llm_request` pattern.

### **3. Components**

- **Create `TraceDetailsPanel`**: A new component (`apps/adk-web/components/trace-details-panel.tsx`) that features:
  - A fixed bottom layout.
  - Tabs for "Event" (raw span JSON), "Request" (LLM request), "Response" (LLM response), and "Graph" (placeholder).
  - Use of `react-json-view` with the custom theme.
- **Update `TraceTree`**: Modify to support row selection, accepting `onSelectSpan` and `selectedSpanId` props.
- **Update `TracesPanel`**:
  - Manage `selectedSpan` state.
  - Adjust layout to be a flex container: scrollable trace list on top, fixed details panel on the bottom.

### **4. Verification**

- Verify that clicking a trace row opens the panel.
- Verify that JSON data is correctly formatted and themed.
- Verify that the layout handles resizing/scrolling correctly.
