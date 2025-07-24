import { createTool } from "@iqai/adk";
import * as z from "zod/v4";

export const addItem = createTool({
	name: "add_item",
	description: "Add a new item to the user's shopping list",
	schema: z.object({
		item: z.string().describe("The item to add to the shopping list"),
		quantity: z
			.number()
			.optional()
			.describe("The quantity of the item (optional)"),
	}),
	fn: ({ item, quantity }, context) => {
		const shoppingList = context.state.get("shopping_list", []);
		const newItem = {
			text: item,
			quantity: quantity || 1,
			completed: false,
			id: Date.now(), // Simple ID generation
		};
		shoppingList.push(newItem);
		context.state.set("shopping_list", shoppingList);
		return {
			success: true,
			item: newItem,
			message: `Added ${quantity || 1} ${item} to your shopping list`,
			total_items: shoppingList.length,
		};
	},
});

export const viewShoppingList = createTool({
	name: "view_shopping_list",
	description: "View all items in the shopping list",
	fn: (_, context) => {
		const shoppingList = context.state.get("shopping_list", []);
		const pendingItems = shoppingList.filter((item) => !item.completed);
		const completedItems = shoppingList.filter((item) => item.completed);

		return {
			shopping_list: shoppingList,
			pending_items: pendingItems,
			completed_items: completedItems,
			total_count: shoppingList.length,
			pending_count: pendingItems.length,
			completed_count: completedItems.length,
			message:
				shoppingList.length > 0
					? `Your shopping list has ${shoppingList.length} item(s): ${pendingItems.length} pending, ${completedItems.length} completed`
					: "Your shopping list is empty.",
		};
	},
});

export const updateItem = createTool({
	name: "update_item",
	description:
		"Update an existing item in the shopping list by index (1-based)",
	schema: z.object({
		index: z
			.number()
			.describe("The position of the item to update (starting from 1)"),
		updated_text: z.string().optional().describe("The new text for the item"),
		quantity: z.number().optional().describe("The new quantity for the item"),
	}),
	fn: ({ index, updated_text, quantity }, context) => {
		const shoppingList = context.state.get("shopping_list", []);

		if (!shoppingList.length || index < 1 || index > shoppingList.length) {
			return {
				success: false,
				message: `Could not find item at position ${index}. You have ${shoppingList.length} item(s) in your shopping list.`,
			};
		}

		const oldItem = { ...shoppingList[index - 1] };
		if (updated_text) {
			shoppingList[index - 1].text = updated_text;
		}
		if (quantity !== undefined) {
			shoppingList[index - 1].quantity = quantity;
		}
		context.state.set("shopping_list", shoppingList);

		return {
			success: true,
			index,
			old_item: oldItem,
			updated_item: shoppingList[index - 1],
			message: `Updated item ${index} from '${oldItem.quantity} ${oldItem.text}' to '${shoppingList[index - 1].quantity} ${shoppingList[index - 1].text}'`,
		};
	},
});

export const deleteItem = createTool({
	name: "delete_item",
	description: "Delete an item from the shopping list by index (1-based)",
	schema: z.object({
		index: z
			.number()
			.describe("The position of the item to delete (starting from 1)"),
	}),
	fn: ({ index }, context) => {
		const shoppingList = context.state.get("shopping_list", []);

		if (!shoppingList.length || index < 1 || index > shoppingList.length) {
			return {
				success: false,
				message: `Could not find item at position ${index}. You have ${shoppingList.length} item(s) in your shopping list.`,
			};
		}

		const deletedItem = shoppingList.splice(index - 1, 1)[0];
		context.state.set("shopping_list", shoppingList);

		return {
			success: true,
			index,
			deleted_item: deletedItem,
			message: `Deleted item ${index}: '${deletedItem.quantity} ${deletedItem.text}'`,
			remaining_count: shoppingList.length,
		};
	},
});

export const markItemCompleted = createTool({
	name: "mark_item_completed",
	description: "Mark an item as completed/purchased in the shopping list",
	schema: z.object({
		index: z
			.number()
			.describe(
				"The position of the item to mark as completed (starting from 1)",
			),
	}),
	fn: ({ index }, context) => {
		const shoppingList = context.state.get("shopping_list", []);

		if (!shoppingList.length || index < 1 || index > shoppingList.length) {
			return {
				success: false,
				message: `Could not find item at position ${index}. You have ${shoppingList.length} item(s) in your shopping list.`,
			};
		}

		const item = shoppingList[index - 1];
		item.completed = !item.completed;
		context.state.set("shopping_list", shoppingList);

		return {
			success: true,
			index,
			item,
			message: item.completed
				? `✅ Marked '${item.text}' as completed`
				: `📝 Marked '${item.text}' as pending`,
		};
	},
});

export const clearCompletedItems = createTool({
	name: "clear_completed_items",
	description: "Remove all completed items from the shopping list",
	fn: (_, context) => {
		const shoppingList = context.state.get("shopping_list", []);
		const completedItems = shoppingList.filter((item) => item.completed);
		const pendingItems = shoppingList.filter((item) => !item.completed);

		context.state.set("shopping_list", pendingItems);

		return {
			success: true,
			cleared_count: completedItems.length,
			remaining_count: pendingItems.length,
			cleared_items: completedItems,
			message: `Cleared ${completedItems.length} completed item(s) from your shopping list. ${pendingItems.length} item(s) remaining.`,
		};
	},
});
