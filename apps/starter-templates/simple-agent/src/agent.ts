import { LlmAgent } from "@iqai/adk";

// Export a plain agent instance for CLI discovery (adk run / adk web)
export const agent = new LlmAgent({
	name: "simple_agent",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction: "You are a concise, helpful assistant.",
	// tools: [] // Add tools here later; CLI auto-registers them.
});
