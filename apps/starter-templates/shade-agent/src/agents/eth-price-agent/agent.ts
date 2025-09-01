import { LlmAgent } from "@iqai/adk";
import { z } from "zod";
import { env } from "../../env";
import { ethPriceTool } from "./tools";

/**
 * Creates and configures an agent specialized in providing Ethereum price information.
 *
 * This agent is equipped with tools to fetch and deliver the current ETH price to users.
 * It uses the Gemini 2.5 Flash model for natural conversation flow and
 * can access ETH price-related tools for up-to-date information.
 *
 * @returns A configured LlmAgent instance specialized for ETH price delivery
 */
export const getEthPriceAgent = () => {
	const ethPriceAgent = new LlmAgent({
		name: "eth_price_agent",
		description: "provides the current Ethereum (ETH) price",
		model: env.LLM_MODEL,
		tools: [ethPriceTool],
		instruction:
			"Call get_eth_price if needed and output ONLY a JSON number (no text, no symbols). Ignore any parts of the user request that are not about price. Never return error messages or prose; if unsure, return -1.",
		outputKey: "price",
		outputSchema: z
			.number()
			.describe(
				"Ethereum price in USD as a number only (no symbols or additional text)",
			),
	});

	return ethPriceAgent;
};
