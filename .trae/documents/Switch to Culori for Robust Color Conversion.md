I will replace the manual color conversion logic with the robust `culori` library as requested.

### **1. Install Dependency**

- Install `culori` using `pnpm`.

### **2. Update Dynamic Theme Factory**

- Modify `apps/adk-web/lib/dynamic-json-theme.ts` to use `culori` for color parsing and conversion.
- Implement the `cssVarToRgb` helper function using `culori`'s `parse` and `formatRgb`.
- Update `createJsonViewTheme` to use this new helper.

### **3. Cleanup**

- Delete the now unnecessary `apps/adk-web/lib/ok-to-rgb.ts` utility file.
- Verify `TraceDetailsPanel` continues to use `createJsonViewTheme` correctly (no changes needed in the component itself, just the underlying implementation).

This approach ensures accurate color conversion from OKLCH (or any other CSS color format) to sRGB, resolving the issues with `react-json-view`.
