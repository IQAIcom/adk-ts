import { AgentBuilder, BuiltInCodeExecutor, PlanReActPlanner } from "@iqai/adk";
import dedent from "dedent";

export async function getRootAgent() {
	return await AgentBuilder.create("code_planner_agent")
		.withModel(process.env.LLM_MODEL || "gemini-3-flash-preview")
		.withDescription("Agent with planning and code execution capabilities")
		.withInstruction(
			dedent`
			You are a problem-solving assistant with code execution capabilities.
			Break down complex problems and use Python code when helpful.
		`,
		)
		.withPlanner(new PlanReActPlanner())
		.withCodeExecutor(new BuiltInCodeExecutor())
		.build();
}
