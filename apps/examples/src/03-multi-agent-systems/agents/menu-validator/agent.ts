import { LlmAgent } from "@iqai/adk";
import dedent from "dedent";

export function getMenuValidatorAgent() {
	return new LlmAgent({
		name: "menu_validator",
		description: "Validates items against menu",
		instruction: dedent`
			Based on customer preferences: {customer_preferences}

			Menu: Burgers (beef, chicken, veggie), Pizzas (margherita, pepperoni, veggie), Salads (caesar, greek, quinoa), Pasta (spaghetti, penne, gluten-free), Desserts (cheesecake, chocolate cake, fruit sorbet)

			Check availability and suggest alternatives if needed.
		`,
		outputKey: "menu_validation",
		model: process.env.LLM_MODEL || "gemini-3-flash-preview",
	});
}
