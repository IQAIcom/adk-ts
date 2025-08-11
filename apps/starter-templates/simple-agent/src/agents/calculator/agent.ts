import { LlmAgent } from "@iqai/adk";
import { calculatorTool } from "./tools/calculator";

export const calculatorAgent = new LlmAgent({
	name: "calculator_agent",
	description:
		"An agent that performs safe arithmetic calculations and provides brief explanations.",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction: "You perform safe arithmetic evaluations and explain briefly.",
	tools: [calculatorTool],
});
