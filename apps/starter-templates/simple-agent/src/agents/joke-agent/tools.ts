import { createTool } from "@iqai/adk";

/**
 * Tool for fetching random jokes from an external API.
 *
 * Makes HTTP requests to the Official Joke API to retrieve random jokes
 * for entertainment purposes. Includes error handling for network issues
 * or API unavailability.
 */
export const jokeTool = createTool({
	name: "get_joke",
	description: "Fetches a random joke",
	fn: async () => {
		try {
			const response = await fetch(
				"https://official-joke-api.appspot.com/random_joke",
			);
			return await response.text();
		} catch {
			return "Joke unavailable right now.";
		}
	},
});
