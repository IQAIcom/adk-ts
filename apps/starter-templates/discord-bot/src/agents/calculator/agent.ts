import { LlmAgent } from "@iqai/adk";
import { calculatorTool } from "./tools/calculator";

export const calculatorAgent = new LlmAgent({
	name: "discord_calculator_agent",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	instruction: "Safely evaluate arithmetic expressions for Discord users.",
	tools: [calculatorTool],
});
