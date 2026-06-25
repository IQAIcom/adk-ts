import { AgentBuilder } from "@iqai/adk";
import { DEFAULT_MODEL_STABLE } from "../../config";

export function getReporterAgent() {
	return AgentBuilder.create("scheduled_reporter")
		.withModel(process.env.LLM_MODEL || DEFAULT_MODEL_STABLE)
		.withInstruction(
			"You are a concise status reporter. When asked, generate a short status update with a random fun fact. Keep it to 2-3 sentences.",
		)
		.build();
}
