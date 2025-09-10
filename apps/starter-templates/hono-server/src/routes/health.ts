import type { Context } from "hono";

/**
 * Health check endpoint handler.
 *
 * Provides a simple health status endpoint for monitoring and load balancer checks.
 * Returns a JSON response indicating the server is operational with a timestamp.
 *
 * @param c - Hono context object
 * @returns JSON response with health status and current timestamp
 */
export const healthHandler = (c: Context) => {
	return c.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
	});
};
