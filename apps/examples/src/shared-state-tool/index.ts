import { cancel, intro, isCancel, outro, text } from "@clack/prompts";
import { AgentBuilder, InMemorySessionService, createTool } from "@iqai/adk";
import * as z from "zod/v4";

const addFavorite = createTool({
	name: "add_favorites",
	schema: z.object({
		new_favorite: z.string().describe("provide new favorite you have"),
	}),
	description: "Adds new favorite",
	fn: ({ new_favorite }, context) => {
		const currentFavorites = context.state.get("favorites", []);
		currentFavorites.push(new_favorite);
		context.state.set("favorites", currentFavorites);
		return {
			success: true,
			favorites: currentFavorites,
		};
	},
});

const showFavorites = createTool({
	name: "show_favorites",
	schema: z.object({}),
	description: "Shows current list of favorites",
	fn: (_, context) => {
		const currentFavorites = context.state.get("favorites", []);
		const userName = context.state.get("userName", "User");
		return {
			userName,
			favorites: currentFavorites,
			count: currentFavorites.length,
			message:
				currentFavorites.length > 0
					? `Here are ${userName}'s ${currentFavorites.length} favorite(s):`
					: `${userName} doesn't have any favorites yet.`,
		};
	},
});

const main = async () => {
	const sessionService = new InMemorySessionService();
	const initialState = { favorites: ["reading books"] };
	const sessionConfig = { state: initialState };

	const { runner, session } = await AgentBuilder.create("favorite_manager")
		.withTools(addFavorite, showFavorites)
		.withModel("gemini-2.5-flash")
		.withSessionService(sessionService, sessionConfig)
		.build();

	// Start interactive loop
	intro("🎯 Favorite Manager Agent");
	console.log("Initial state:", session.state);
	console.log(
		"You can ask me to add favorites or ask about your current favorites!",
	);

	while (true) {
		const userInput = await text({
			message: "What would you like to say?",
			placeholder:
				"e.g., 'Add hiking to my favorites' or 'What are my current favorites?'",
		});

		if (isCancel(userInput)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		if (userInput === "exit" || userInput === "quit") {
			outro("👋 Goodbye!");
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
