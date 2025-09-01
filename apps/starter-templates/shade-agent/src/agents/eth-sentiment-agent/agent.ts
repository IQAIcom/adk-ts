import { LlmAgent } from "@iqai/adk";
import { z } from "zod";
import { env } from "../../env";
import { ethHeadlinesTool } from "./tools";

/**
 * Creates and configures an Ethereum sentiment agent specialized in providing Ethereum sentiment information.
 *
 * This agent is equipped with tools to fetch Ethereum-related headlines and sentiment data.
 * It uses the specified LLM model for natural language interaction with Ethereum sentiment queries.
 *
 * @returns A configured LlmAgent instance specialized for Ethereum sentiment information
 */
export const getEthSentimentAgent = () => {
	const ethSentimentAgent = new LlmAgent({
		name: "eth_sentiment_agent",
		description: "provides Ethereum sentiment based on latest headlines",
		instruction: `You have access to the get_eth_headlines tool.
Call this tool to fetch the latest Ethereum-related headlines and determine overall sentiment.
Use {price?} from context as the current ETH price if available.`,
		model: env.LLM_MODEL,
		tools: [ethHeadlinesTool],
		outputSchema: z.object({
			price: z
				.number()
				.describe(
					"Ethereum price in USD, sourced from earlier agent step via {price}",
				),
			sentiment: z
				.enum(["positive", "negative", "neutral"])
				.describe(
					"Overall sentiment derived from latest ETH-related headlines",
				),
		}),
	});

	return ethSentimentAgent;
};
