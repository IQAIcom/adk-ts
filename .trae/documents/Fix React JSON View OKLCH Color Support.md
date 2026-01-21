I will fix the `react-json-view` OKLCH color issue by implementing the requested utility and dynamic theme factory.

### **1. Create Utility (`apps/adk-web/lib/ok-to-rgb.ts`)**

I will create a new utility file that converts OKLCH CSS variables to RGB values.

- **Function `oklchToRgb`**: Implements the math to convert L, C, H values to R, G, B.
- **Function `cssVarOklchToRgb`**: Reads the computed style of a CSS variable, parses the `oklch(...)` string, and returns an `rgb(...)` string.

### **2. Update Theme Factory (`apps/adk-web/lib/dynamic-json-theme.ts`)**

I will replace the static `json-view-theme.ts` with a dynamic theme factory.

- **Function `createJsonViewTheme`**: Returns the `ThemeObject` where each color is generated using `cssVarOklchToRgb`.
- It will map the existing Tailwind semantic tokens (e.g., `--color-background`, `--color-primary`) to the JSON view theme keys.

### **3. Integrate into TraceDetailsPanel**

I will update `apps/adk-web/components/trace-details-panel.tsx` to use the new dynamic theme.

- Replace `import { jsonViewTheme }` with `import { createJsonViewTheme }`.
- Call `createJsonViewTheme()` in the `theme` prop of `<ReactJson />`.

This ensures that the JSON viewer correctly picks up the current theme colors (light/dark) even if they are defined in OKLCH, without needing additional dependencies.
