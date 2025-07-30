import { env } from "node:process";
import { AgentBuilder, InMemorySessionService, createTool } from "@iqai/adk";
import dedent from "dedent";
import * as z from "zod";

/**
 * 02 - Tools and State Management
 *
 * Learn how to create custom tools and manage state in your agents.
 *
 * Concepts covered:
 * - Creating custom tools with createTool
 * - Tool schemas and validation
 * - State management with context.state
 * - Session services for persistence
 * - State injection in instructions
 */

// Simple shopping cart tools
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
		context.state.set("cartCount", cart.length); // Store count separately for state injection

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

async function demonstrateToolsAndState() {
	console.log("🛠️ Tools and state:");
	const sessionService = new InMemorySessionService();
	const initialState = {
		cart: [],
		cartCount: 0,
	};

	const { runner } = await AgentBuilder.create("shopping_cart_agent")
		.withModel(env.LLM_MODEL || "gemini-2.5-flash")
		.withDescription(
			"A shopping cart assistant that manages items and calculates totals",
		)
		.withInstruction(dedent`
			You are a shopping cart assistant. Help users manage their cart.

			Current cart state:
			- Items in cart: {cartCount}
			- Cart contents: {cart}

			You can add items and view the cart. Always be helpful with pricing and quantities.
			When asked about current cart without tools, reference the cart state above.
		`)
		.withTools(addItemTool, viewCartTool)
		.withSessionService(sessionService, { state: initialState })
		.build();

	// Test adding items
	const item1 = await runner.ask("Add 2 apples to my cart at $1.50 each");
	console.log(item1);

	const item2 = await runner.ask("Add 1 banana for $0.75");
	console.log(item2);

	// Test state injection - ask about cart without using tools
	const stateCheck = await runner.ask(
		"How many items are in my cart and what are they? Use the state information from your instructions, don't call any tools.",
	);
	console.log(stateCheck);

	// Test viewing cart with tools
	const cartView = await runner.ask("Show me my complete cart with total");
	console.log(cartView);
}

async function main() {
	await demonstrateToolsAndState();
}

main().catch(console.error);
