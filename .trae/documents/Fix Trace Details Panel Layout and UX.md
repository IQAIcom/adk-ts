I will fix the layout and usability issues of the Trace Details Panel.

### **1. Fix Overlay Issue & Closing**

The panel currently uses `fixed bottom-0 w-screen`, which covers the input area and breaks out of the sidebar context. I will:

- Change the layout strategy in `apps/adk-web/components/traces-panel.tsx` to use flexbox properly. Instead of a fixed overlay, the panel will take up shared vertical space within the parent container.
- Ensure the `TracesPanel` container has `h-full flex flex-col` so the details panel sits _below_ the list, not on top of the entire screen.

### **2. Improve UX**

I will enhance `apps/adk-web/components/trace-details-panel.tsx` to make it more usable:

- **Resizable/Scrollable**: Ensure the panel has a defined height (e.g., 50%) but respects the parent container's boundaries.
- **Styling**: Improve the header contrast and spacing.
- **Tabs**: Ensure tabs are sticky or clearly separated from the scrollable content.

### **Implementation Steps**

1.  **Modify `TracesPanel`**: Remove the `fixed` positioning logic. Use a split-pane approach (using standard Flexbox) where the top half is the list and the bottom half is the details panel.
2.  **Modify `TraceDetailsPanel`**: Remove `fixed bottom-0 w-screen`. Make it a standard block element that fills the available space provided by the parent.

This will keep the details panel contained within the sidebar (or wherever `TracesPanel` is rendered), preventing it from obscuring the chat input or other global UI elements.
