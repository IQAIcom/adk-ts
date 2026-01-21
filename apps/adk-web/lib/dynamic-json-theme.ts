import type { ThemeObject } from "react-json-view";
import { cssVarOklchToRgb } from "./ok-to-rgb";

export function createJsonViewTheme(): ThemeObject {
	return {
		base00: cssVarOklchToRgb("--color-background"),
		base01: cssVarOklchToRgb("--color-muted"),
		base02: cssVarOklchToRgb("--color-border"),
		base03: cssVarOklchToRgb("--color-muted-foreground"),
		base04: cssVarOklchToRgb("--color-muted-foreground"),
		base05: cssVarOklchToRgb("--color-foreground"),
		base06: cssVarOklchToRgb("--color-foreground"),
		base07: cssVarOklchToRgb("--color-card"),
		base08: cssVarOklchToRgb("--color-destructive"),
		base09: cssVarOklchToRgb("--color-chart-5"),
		base0A: cssVarOklchToRgb("--color-chart-4"),
		base0B: cssVarOklchToRgb("--color-chart-2"),
		base0C: cssVarOklchToRgb("--color-chart-1"),
		base0D: cssVarOklchToRgb("--color-primary"),
		base0E: cssVarOklchToRgb("--color-chart-3"),
		base0F: cssVarOklchToRgb("--color-chart-5"),
	};
}
