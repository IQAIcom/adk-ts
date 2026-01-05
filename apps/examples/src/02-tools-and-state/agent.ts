import { AgentBuilder, createTool, InMemorySessionService } from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";

const addItemTool = createTool({
	name: "add_item",
	description: "Add an item to the shopping cart",
	schema: z.object({
		item: z.string().describe("Item name"),
		quantity: z.number().default(1).describe("Quantity to add"),
		price: z.number().describe("Price per item"),
	}),
	fn: ({ item, quantity, price }, context) => {
		const cart = context.state.get("cart", []);
		const existingItem = cart.find((cartItem) => cartItem.item === item);

		if (existingItem) {
			existingItem.quantity += quantity;
		} else {
			cart.push({ item, quantity, price });
		}

		context.state.set("cart", cart);
		context.state.set("cartCount", cart.length);

		const total = cart.reduce(
			(sum, cartItem) => sum + cartItem.quantity * cartItem.price,
			0,
		);

		return {
			success: true,
			item,
			quantity,
			cartTotal: total,
			message: `Added ${quantity}x ${item} to cart`,
		};
	},
});

const viewCartTool = createTool({
	name: "view_cart",
	description: "View current shopping cart contents",
	schema: z.object({}),
	fn: (_, context) => {
		const cart = context.state.get("cart", []);
		const total = cart.reduce(
			(sum, item) => sum + item.quantity * item.price,
			0,
		);

		return {
			cart,
			total,
			itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
			message:
				cart.length > 0
					? `Cart has ${cart.length} different items`
					: "Cart is empty",
		};
	},
});

export async function agent() {
	const sessionService = new InMemorySessionService();
	const initialState = {
		cart: [],
		cartCount: 0,
	};

	const { runner } = await AgentBuilder.create("shopping_cart_agent")
		.withModel("gemini-2.5-flash")
		.withDescription(
			"A shopping cart assistant that manages items and calculates totals",
		)
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
		.withSessionService(sessionService, { state: initialState })
		.build();

	return runner;
}
