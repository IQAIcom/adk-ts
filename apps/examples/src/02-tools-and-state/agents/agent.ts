import { AgentBuilder } from "@iqai/adk";
import dedent from "dedent";
import { addItemTool, viewCartTool } from "./tools";

export function getRootAgent() {
	const initialState = {
		cart: [],
		cartCount: 0,
	};

	return AgentBuilder.create("shopping_cart_agent")
		.withModel(process.env.LLM_MODEL || "gemini-3-flash-preview")
		.withInstruction(
			dedent`
			You are a shopping cart assistant. Help users manage their cart.

			Current cart state:
			- Items in cart: {cartCount}
			- Cart contents: {cart}

			You can add items and view the cart. Always be helpful with pricing and quantities.
		`,
		)
		.withTools(addItemTool, viewCartTool)
		.withQuickSession({ state: initialState })
		.build();
}
