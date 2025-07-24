export type Reminder = {
	id: string;
	text: string;
	createdAt: string;
	scheduledTime?: string | null;
	recurring?: {
		type: "daily" | "weekly" | "monthly";
		interval?: number;
	};
	type?: string;
};

export type ShoppingListItem = {
	id: string;
	text: string;
	quantity: number;
	completed: boolean;
};

export type PersonalAgentState = {
	reminders: Reminder[];
	shopping_list: ShoppingListItem[];
};
