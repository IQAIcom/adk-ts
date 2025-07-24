import { cancel, intro, isCancel, outro, text } from "@clack/prompts";
import { AgentBuilder, InMemorySessionService, createTool } from "@iqai/adk";
import * as z from "zod/v4";

const addReminder = createTool({
	name: "add_reminder",
	description: "Add a new reminder to the user's reminder list",
	schema: z.object({
		reminder: z.string().describe("The reminder text to add"),
	}),
	fn: ({ reminder }, context) => {
		const reminders = context.state.get("reminders", []);
		reminders.push(reminder);
		context.state.set("reminders", reminders);
		return {
			success: true,
			reminder,
			message: `Added reminder: ${reminder}`,
			total_reminders: reminders.length,
		};
	},
});

const viewReminders = createTool({
	name: "view_reminders",
	description: "View all current reminders",
	schema: z.object({}),
	fn: (_, context) => {
		const reminders = context.state.get("reminders", []);
		return {
			reminders,
			count: reminders.length,
			message:
				reminders.length > 0
					? `Here are your ${reminders.length} reminder(s):`
					: "You don't have any reminders yet.",
		};
	},
});

const updateReminder = createTool({
	name: "update_reminder",
	description: "Update an existing reminder by index (1-based)",
	schema: z.object({
		index: z
			.number()
			.describe("The position of the reminder to update (starting from 1)"),
		updated_text: z.string().describe("The new text for the reminder"),
	}),
	fn: ({ index, updated_text }, context) => {
		const reminders = context.state.get("reminders", []);

		if (!reminders.length || index < 1 || index > reminders.length) {
			return {
				success: false,
				message: `Could not find reminder at position ${index}. You have ${reminders.length} reminder(s).`,
			};
		}

		const oldReminder = reminders[index - 1];
		reminders[index - 1] = updated_text;
		context.state.set("reminders", reminders);

		return {
			success: true,
			index,
			old_text: oldReminder,
			updated_text,
			message: `Updated reminder ${index} from '${oldReminder}' to '${updated_text}'`,
		};
	},
});

const deleteReminder = createTool({
	name: "delete_reminder",
	description: "Delete a reminder by index (1-based)",
	schema: z.object({
		index: z
			.number()
			.describe("The position of the reminder to delete (starting from 1)"),
	}),
	fn: ({ index }, context) => {
		const reminders = context.state.get("reminders", []);

		if (!reminders.length || index < 1 || index > reminders.length) {
			return {
				success: false,
				message: `Could not find reminder at position ${index}. You have ${reminders.length} reminder(s).`,
			};
		}

		const deletedReminder = reminders.splice(index - 1, 1)[0];
		context.state.set("reminders", reminders);

		return {
			success: true,
			index,
			deleted_reminder: deletedReminder,
			message: `Deleted reminder ${index}: '${deletedReminder}'`,
			remaining_count: reminders.length,
		};
	},
});

const main = async () => {
	const sessionService = new InMemorySessionService();
	const initialState = { reminders: ["Learn more about ADK"] };
	const sessionConfig = { state: initialState };

	const { runner, session } = await AgentBuilder.create("reminder_manager")
		.withTools(addReminder, viewReminders, updateReminder, deleteReminder)
		.withModel("gemini-2.5-flash")
		.withSessionService(sessionService, sessionConfig)
		.withDescription("A smart reminder assistant with persistent memory")
		.withInstruction(
			`You are a friendly reminder assistant that helps users manage their reminders.

			The user's reminders are stored in state as a "reminders" array.

			You can help users:
			1. Add new reminders
			2. View existing reminders
			3. Update reminders by position
			4. Delete reminders by position

			When showing reminders, format them as a numbered list for clarity.

			IMPORTANT GUIDELINES:
			- When user asks to update/delete without specifying index, try to match the content they mention
			- Use 1-based indexing when talking to users (first reminder = index 1)
			- Always show the current state after operations
			- Be helpful and suggest actions when the user seems unsure`,
		)
		.build();

	// Start interactive loop
	intro("📝 Reminder Agent");
	console.log("Initial state:", session.state);
	console.log("You can ask me to add, view, update, or delete reminders!");

	while (true) {
		const userInput = await text({
			message: "What would you like to do?",
			placeholder:
				"e.g., 'Add buy groceries' or 'Show my reminders' or 'Delete reminder 1'",
		});

		if (isCancel(userInput)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		if (userInput === "exit" || userInput === "quit") {
			outro("👋 Goodbye! Your reminders have been saved.");
			break;
		}

		try {
			console.log("\n🤖 Agent response:");
			const response = await runner.ask(userInput);
			console.log(response);

			// Get the updated session after the agent has run
			const updatedSession = await sessionService.getSession(
				session.appName,
				session.userId,
				session.id,
			);

			console.log("\n📊 Current session state:");
			console.log(updatedSession?.state || "Session not found");
			console.log("---");
		} catch (error) {
			console.error("❌ Error:", error);
		}
	}
};

main().catch(console.error);
