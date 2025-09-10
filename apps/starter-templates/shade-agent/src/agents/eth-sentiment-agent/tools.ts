import { createTool } from "@iqai/adk";
import Parser from "rss-parser";

/**
 * Tool for fetching latest Ethereum-related news headlines.
 *
 * Uses the Reddit r/ethereum RSS feed to retrieve recent headlines about Ethereum.
 * Returns a formatted list of headlines or an error message if unavailable.
 */
export const ethHeadlinesTool = createTool({
	name: "get_eth_headlines",
	description:
		"Get latest Ethereum-related news headlines from Reddit r/ethereum using rss-parser",
	fn: async (_, context) => {
		try {
			const parser = new Parser();
			const feed = await parser.parseURL(
				"https://www.reddit.com/r/ethereum/.rss",
			);
			const headlines = (feed.items || [])
				.map((item, idx) => `${idx + 1}. ${item.title}`)
				.slice(0, 10);
			if (headlines.length === 0) {
				return "No headlines found.";
			}
			const formatted = headlines.join("\n");
			context.state.set("headlines", formatted);
			return formatted;
		} catch {
			return "Ethereum headlines unavailable at the moment.";
		}
	},
});
