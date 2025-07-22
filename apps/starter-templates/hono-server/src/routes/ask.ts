import { env } from "node:process";
import { AgentBuilder } from "@iqai/adk";
import type { Context } from "hono";

export const askHandler = async (c: Context) => {
	try {
		const body = await c.req.json();
		const { question } = body;

		if (!question) {
			return c.json({ error: "Question is required" }, 400);
		}

		console.log(`📝 Question received: ${question}`);

		// Create agent and get response
		const response = await AgentBuilder.withModel(
			env.LLM_MODEL || "gemini-2.5-flash",
		).ask(question);

		console.log(`🤖 Response generated: ${response}`);

		return c.json({
			question,
			response,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error processing request:", error);
		return c.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		);
	}
};
