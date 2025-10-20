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

			if (!response.ok) {
				console.error(`Failed to fetch joke: ${response.statusText}`);
				return "Joke API is currently unavailable.";
			}

			return await response.text();
		} catch (error) {
			console.error("Error fetching joke:", error);
			return "Joke unavailable right now.";
		}
	},
});
