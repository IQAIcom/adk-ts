import { AgentBuilder, InMemorySessionService, LlmAgent } from "@iqai/adk";
import type { Context } from "hono";
import { agent } from "../agents/agent";

let runnerPromise: Promise<ReturnType<typeof buildRunner>> | null = null;

async function buildRunner() {
	const builder: any = (AgentBuilder as any).fromAgent
		? (AgentBuilder as any).fromAgent(agent)
		: agent instanceof LlmAgent
			? AgentBuilder.create(agent.name)
					.withModel((agent as any).model)
					.withInstruction((agent as any).instruction || "")
					.withDescription((agent as any).description || "")
			: AgentBuilder.create(agent.name);
	const { runner } = await builder
		.withSessionService(new InMemorySessionService())
		.build();
	return runner;
}

async function getRunner() {
	if (!runnerPromise) runnerPromise = buildRunner();
	return runnerPromise;
}

export const askHandler = async (c: Context) => {
	try {
		const body = await c.req.json();
		const { question } = body;

		if (!question) {
			return c.json({ error: "Question is required" }, 400);
		}

		console.log(`📝 Question received: ${question}`);

		const runner = await getRunner();
		const response = await runner.ask(question);

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
