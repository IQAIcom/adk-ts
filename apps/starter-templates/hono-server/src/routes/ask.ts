import type { Context } from "hono";
import { getRootAgent } from "../agents/agent";

/**
 * HTTP handler for the /ask endpoint.
 *
 * Processes POST requests containing user questions and routes them through
 * the root agent for processing. The agent will delegate to appropriate
 * sub-agents based on the question content.
 *
 * Request body should contain:
 * - question: string - The user's question to be processed
 *
 * @param c - Hono context object containing request and response utilities
 * @returns JSON response with the agent's answer, original question, and timestamp
 */
export const askHandler = async (c: Context) => {
	try {
		const body = await c.req.json();
		const { question } = body;

		if (!question) {
			return c.json({ error: "Question is required" }, 400);
		}

		console.log(`📝 Question received: ${question}`);

		// answer with our root agent
		const { runner } = await getRootAgent();
		const response = runner.ask(question);

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
