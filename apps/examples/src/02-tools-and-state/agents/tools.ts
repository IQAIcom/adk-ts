import { createTool } from "@iqai/adk";
import * as z from "zod";

export const addItemTool = createTool({
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

export const viewCartTool = createTool({
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
