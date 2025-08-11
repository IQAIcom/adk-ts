import { LlmAgent } from "@iqai/adk";
import { calculatorTool } from "./tools";

export function getCalculatorAgent() {
	const agent = new LlmAgent({
		name: "discord_calculator_agent",
		model: process.env.LLM_MODEL || "gemini-2.5-flash",
		description: "Performs safe arithmetic calculations for Discord users.",
		instruction: "Safely evaluate arithmetic expressions for Discord users.",
		tools: [calculatorTool],
	});

	return agent;
}
