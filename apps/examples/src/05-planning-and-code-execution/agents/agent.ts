import { AgentBuilder, BuiltInCodeExecutor, PlanReActPlanner } from "@iqai/adk";
import dedent from "dedent";

/**
 * Creates an agent with planning and code execution capabilities.
 *
 * IMPORTANT: Code execution support varies by model:
 * ✅ Supported with BuiltInCodeExecutor: gemini-2.0+
 * ⚠️  Not supported: gemini-3.x (API incompatibility - use gemini-2.5 instead)
 * ❌ Not supported: GPT-4, GPT-5, Claude, etc. (use ContainerCodeExecutor instead)
 *
 * Default model: gemini-2.5-flash (reliable code execution support)
 * Override with: LLM_MODEL environment variable
 */
export async function getRootAgent() {
	return await AgentBuilder.create("code_planner_agent")
		.withModel(process.env.LLM_MODEL || "gemini-2.5-flash")
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
