import { LlmAgent } from "@iqai/adk";
import { calculatorTool } from "./tools/calculator";

export const calculatorAgent = new LlmAgent({
	name: "telegram_calculator_agent",
	model: process.env.LLM_MODEL || "gemini-2.5-flash",
	description: "Performs safe arithmetic for Telegram users.",
	instruction: "Safely evaluate arithmetic expressions for Telegram users.",
	tools: [calculatorTool],
});
