import { AgentBuilder, BuiltInCodeExecutor, PlanReActPlanner } from "@iqai/adk";
import dedent from "dedent";

export async function agent() {
	const { runner } = await AgentBuilder.create("code_planner_agent")
		.withModel("gemini-2.5-flash")
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

	return runner;
}
