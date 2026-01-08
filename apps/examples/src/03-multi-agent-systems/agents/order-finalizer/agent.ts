import { LlmAgent } from "@iqai/adk";
import dedent from "dedent";

export function getOrderFinalizerAgent() {
	return new LlmAgent({
		name: "order_finalizer",
		description: "Finalizes order with pricing",
		instruction: dedent`
			Based on:
			- Customer preferences: {customer_preferences}
			- Menu validation: {menu_validation}

			Create final order summary with items, prices ($8-25 per item), total, and prep time (15-45 min).
		`,
		model: process.env.LLM_MODEL || "gemini-3-flash-preview",
	});
}
