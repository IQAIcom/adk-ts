import type { Context } from "hono";

export const healthHandler = (c: Context) => {
	return c.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
	});
};
