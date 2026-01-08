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
		const cart: { item: string; quantity: number; price: number }[] =
			context.state.get("cart", []);
		const existingItemIndex = cart.findIndex(
			(cartItem) => cartItem.item === item,
		);

		let updatedCart: { item: string; quantity: number; price: number }[];
		if (existingItemIndex > -1) {
			updatedCart = cart.map((cartItem, index) => {
				if (index === existingItemIndex) {
					return { ...cartItem, quantity: cartItem.quantity + quantity };
				}
				return cartItem;
			});
		} else {
			updatedCart = [...cart, { item, quantity, price }];
		}

		context.state.set("cart", updatedCart);
		context.state.set("cartCount", updatedCart.length);

		const total = updatedCart.reduce(
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
