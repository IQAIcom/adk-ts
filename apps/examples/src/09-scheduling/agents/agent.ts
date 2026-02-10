import { AgentBuilder } from "@iqai/adk";

export function getReporterAgent() {
	return AgentBuilder.create("scheduled_reporter")
		.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
		.withInstruction(
			"You are a concise status reporter. When asked, generate a short status update with a random fun fact. Keep it to 2-3 sentences.",
		)
		.build();
}
