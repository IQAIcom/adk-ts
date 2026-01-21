import type { ThemeObject } from "react-json-view";

export const jsonViewTheme: ThemeObject = {
	base00: "var(--color-background)",
	base01: "var(--color-muted)",
	base02: "var(--color-border)",
	base03: "var(--color-muted-foreground)",
	base04: "var(--color-muted-foreground)",
	base05: "var(--color-foreground)",
	base06: "var(--color-foreground)",
	base07: "var(--color-card)",
	base08: "var(--color-destructive)", // null / errors
	base09: "var(--color-chart-5)", // numbers
	base0A: "var(--color-chart-4)", // booleans
	base0B: "var(--color-chart-2)", // strings
	base0C: "var(--color-chart-1)", // dates / functions
	base0D: "var(--color-primary)", // object keys
	base0E: "var(--color-chart-3)", // symbols
	base0F: "var(--color-chart-5)", // undefined
};
