import type { Context } from "hono";

export const indexHandler = (c: Context) => {
	return c.json({
		message: "🤖 ADK Hono Server is running!",
		endpoints: {
			ask: "POST /ask - Ask the AI agent a question",
			health: "GET /health - Health check",
		},
	});
};
