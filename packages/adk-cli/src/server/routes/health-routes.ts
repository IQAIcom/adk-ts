import type { Hono } from "hono";

export function setupHealthRoutes(app: Hono): void {
	// Health check
	app.get("/health", (c) => c.json({ status: "ok" }));
}
