function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
	const hr = (h * Math.PI) / 180;
	const a = c * Math.cos(hr);
	const b = c * Math.sin(hr);

	// Simple OKLab → linear RGB approximation
	const l_ = l;
	const m_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const s_ = l - 0.1055613458 * a - 0.0638541728 * b;

	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	return [clamp(l_ * 255), clamp(m_ * 255), clamp(s_ * 255)];
}

export function cssVarOklchToRgb(varName: string): string {
	if (typeof window === "undefined") return "rgb(0 0 0)";

	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(varName)
		.trim();
	const match = value.match(/oklch\(([^ ]+) ([^ ]+) ([^ )]+)\)/);
	if (!match) return "rgb(0 0 0)";

	const [l, c, h] = match.slice(1).map(Number);
	const [r, g, b] = oklchToRgb(l, c, h);
	return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
}
