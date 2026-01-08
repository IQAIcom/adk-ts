import { LlmAgent } from "@iqai/adk";
import dedent from "dedent";

export function getCustomerAnalyzerAgent() {
	return new LlmAgent({
		name: "customer_analyzer",
		description: "Analyzes customer restaurant orders",
		instruction: dedent`
			Extract order items, dietary restrictions, special preferences, and budget constraints.
			Return the extracted information in a clear, structured format.
		`,
		outputKey: "customer_preferences",
		model: process.env.LLM_MODEL || "gemini-3-flash-preview",
	});
}
