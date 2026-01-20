I will refactor `apps/adk-web/components/traces-tree.tsx` to reuse logic from `apps/adk-web/lib/trace-utils.ts` and align the UI with `apps/adk-web/components/traces-panel.tsx`.

### Steps:

1.  **Update Imports**:
    - Import helper functions (`toMs`, `buildSpanTree`, `flattenTree`, `getGlobalTimes`, `getRelativeStart`, `getRelativeWidth`, `getSpanIcon` as `getSpanIconName`) from `@/lib/trace-utils`.
    - Import necessary icons from `lucide-react` (matching the names returned by `getSpanIconName`: `PlayCircle`, `Bot`, `Wrench`, `MessageSquare`, `Circle`).

2.  **Refactor Component Logic**:
    - Remove local implementations of `toMs`, `buildSpanTree`, `flattenTree`, `getRelativeStart`, `getRelativeWidth`, and `getSpanIcon`.
    - Update `useMemo` to use the imported `buildSpanTree`, `flattenTree`, and `getGlobalTimes` for processing spans.

3.  **Update Rendering & UI**:
    - Create a local mapping from the icon name strings (returned by `getSpanIconName`) to the Lucide React components.
    - Update the row styling to match `traces-panel.tsx`:
      - Change hover states to `hover:bg-muted-foreground/5`.
      - Use semantic colors like `text-muted-foreground` where appropriate.
      - Ensure borders and spacing are consistent with the panel's design.
    - Update the selected state style to be consistent (e.g., using `bg-accent` or a subtle blue that fits the theme).

4.  **Verification**:
    - I will verify the changes by ensuring the code compiles and the logic flow remains correct using the new utilities. (Since I cannot run the UI, I will rely on code correctness).
