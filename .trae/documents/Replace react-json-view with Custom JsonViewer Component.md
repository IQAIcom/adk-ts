I will replace the existing `react-json-view` implementation with a custom, manually built JSON viewer component that fully aligns with your design system (using Tailwind CSS and Lucide icons).

### **1. Clean Up Dependencies**

- Remove `react-json-view` and `culori` (and its types) as they are no longer needed.
- Delete the dynamic theme factory file `apps/adk-web/lib/dynamic-json-theme.ts`.

### **2. Create Custom JSON Viewer Component**

- Create `apps/adk-web/components/ui/json-viewer.tsx` based on the code you provided.
- Adapt the styles to perfectly match the Shadcn/Tailwind design system used in the project (e.g., using `text-muted-foreground`, `border-border`, etc.).
- Ensure it uses the existing `Tooltip` components from `@/components/ui/tooltip`.

### **3. Update TraceDetailsPanel**

- Modify `apps/adk-web/components/trace-details-panel.tsx` to import and use the new `<JsonViewer />` component instead of `ReactJson`.
- Remove the theme generation logic.

This approach gives you full control over the rendering and styling, eliminating the color conversion issues entirely and providing a more native look and feel.
