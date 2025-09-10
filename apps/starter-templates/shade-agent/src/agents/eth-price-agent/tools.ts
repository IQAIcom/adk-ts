import { createTool } from "@iqai/adk";

/**
 * Tool for fetching the current Ethereum price from an open API.
 *
 * Makes HTTP requests to the CoinGecko API to retrieve the latest ETH price in USD.
 * Includes error handling for network issues or API unavailability.
 */
export const ethPriceTool = createTool({
	name: "get_eth_price",
	description: "Fetches the current Ethereum (ETH) price in USD",
	fn: async (_, context) => {
		try {
			const response = await fetch(
				"https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
			);
			const data = await response.json();
			const price = data?.ethereum?.usd?.toFixed(2);
			if (price) {
				context.state.set("price", String(price));
				return `Current Ethereum price: $${data.ethereum.usd} USD`;
			}
			return "Unable to fetch Ethereum price right now.";
		} catch {
			return "Unable to fetch Ethereum price right now.";
		}
	},
});
