import type { Context } from "hono";

/**
 * Root endpoint handler providing API information.
 *
 * Returns basic information about the ADK Hono server including
 * available endpoints and their descriptions for API discovery.
 *
 * @param c - Hono context object
 * @returns JSON response with welcome message and endpoint documentation
 */
export const indexHandler = (c: Context) => {
	return c.json({
		message: "🤖 ADK Hono Server is running!",
		endpoints: {
			ask: "POST /ask - Ask the AI agent a question",
			health: "GET /health - Health check",
		},
	});
};
