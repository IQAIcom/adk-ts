import { env } from "node:process";
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
		model: env.LLM_MODEL || "gemini-2.5-flash",
	});
}
